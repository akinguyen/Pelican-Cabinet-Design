import { createWallOnlyDesignSceneDocument } from "@/engine/scene/document/createDesignSceneDocument";
import type { DesignScene } from "@/engine/scene/designSceneTypes";
import { standardAiInstructionFiles } from "../standard-instructions/standardAiInstructionFiles";
import type { DownloadableAiInputFile } from "./aiInputPackageTypes";
import { createCatalogReferencePackage } from "./createCatalogReferencePackage";
import { createDerivedPlacementHelpersPackage } from "./createDerivedPlacementHelpersPackage";
import { userRequestTemplateMarkdown } from "./userRequestTemplate";

const STANDARD_INSTRUCTIONS_FOLDER_PATH = "01-standard-instructions";

export function createAiInputFiles(designScene: DesignScene): readonly DownloadableAiInputFile[] {
  return [
    ...createStandardInstructionFiles(),
    createJsonAiInputFile({
      filePath: "02-current-scene-for-ai.json",
      data: createWallOnlyDesignSceneDocument(designScene),
    }),
    createJsonAiInputFile({
      filePath: "03-catalog-reference.json",
      data: createCatalogReferencePackage(),
    }),
    createJsonAiInputFile({
      filePath: "04-derived-placement-helpers.json",
      data: createDerivedPlacementHelpersPackage(designScene.placedWallGraphs),
    }),
    {
      filePath: "05-user-request-template.md",
      mimeType: "text/markdown",
      content: userRequestTemplateMarkdown,
    },
  ];
}

function createStandardInstructionFiles(): readonly DownloadableAiInputFile[] {
  return standardAiInstructionFiles.map((instructionFile) => ({
    filePath: `${STANDARD_INSTRUCTIONS_FOLDER_PATH}/${instructionFile.fileName}`,
    mimeType: "text/markdown",
    content: `${instructionFile.content.trim()}\n`,
  }));
}

function createJsonAiInputFile(args: {
  filePath: string;
  data: unknown;
}): DownloadableAiInputFile {
  return {
    filePath: args.filePath,
    mimeType: "application/json",
    content: `${JSON.stringify(args.data, null, 2)}\n`,
  };
}
