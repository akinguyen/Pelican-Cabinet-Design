"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { createId } from "@/core/ids/createId";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { kitchenEditorDefinitions } from "../catalogs/registry/loadKitchenEditorRawDefinitions";
import { buildKitchenAiInput } from "../ai/kitchenAiInputExporter";
import { parseKitchenAiOutputJson, validateKitchenAiOutputForInput } from "../ai/kitchenAiOutputValidator";
import { buildKitchenAiPrompt } from "../ai/kitchenAiPrompt";
import { importKitchenAiScenePatch } from "../ai/kitchenAiScenePatchImporter";
import type { KitchenAiInput, KitchenAiOutput } from "../ai/kitchenAiTypes";

export function KitchenAiPanel() {
  const designScene = useDesignSceneStore((state) => state.designScene);
  const outputFileInputRef = useRef<HTMLInputElement | null>(null);
  const [latestInput, setLatestInput] = useState<KitchenAiInput | null>(null);
  const [userDesignRequest, setUserDesignRequest] = useState("");
  const [statusMessage, setStatusMessage] = useState("Build the hidden AI input, add an optional design request, then copy the prompt for ChatGPT.");
  const [validationMessages, setValidationMessages] = useState<readonly string[]>([]);
  const prompt = useMemo(() => buildKitchenAiPrompt(), []);

  const handleBuildInput = () => {
    const aiInput = buildKitchenAiInput({
      designScene,
      assemblyDefinitions: kitchenEditorDefinitions,
    });

    setLatestInput(aiInput);
    const wallCabinetCatalogCount = aiInput.catalog.filter((item) => item.semanticRole === "wall-cabinet").length;

    setValidationMessages([]);
    setStatusMessage(`AI input ready with ${aiInput.wallFaces.length} wall faces, ${aiInput.wallCorners.length} wall corners, ${aiInput.existingSceneEntities.length} existing entities, ${aiInput.catalog.length} catalog items, and ${wallCabinetCatalogCount} wall cabinet catalog items.`);
  };

  const handleCopyPromptAndInput = async () => {
    if (latestInput === null) {
      setStatusMessage("Build input before copying the ChatGPT prompt.");
      return;
    }

    const text = [
      prompt,
      "",
      "USER DESIGN REQUEST:",
      userDesignRequest.trim().length > 0 ? userDesignRequest.trim() : "No extra user request provided.",
      "",
      "KITCHEN AI INPUT JSON:",
      stringifyPretty(latestInput),
    ].join("\n");

    await copyTextToClipboard(text);
    setStatusMessage("Copied ChatGPT prompt, user design request, and hidden AI input JSON to clipboard.");
  };

  const handleOpenOutputFilePicker = () => {
    outputFileInputRef.current?.click();
  };

  const handleOutputFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    // Reset the input so selecting the same file again still triggers onChange.
    event.target.value = "";

    if (file === null) {
      return;
    }

    try {
      const outputJsonText = await file.text();
      const aiInput = getCurrentInputForImport({
        latestInput,
        designScene: useDesignSceneStore.getState().designScene,
      });

      setLatestInput(aiInput);

      const validation = validateOutputJsonForInput({
        aiInput,
        outputJsonText,
        designScene: useDesignSceneStore.getState().designScene,
      });

      if (validation === null) {
        return;
      }

      importValidatedKitchenAiOutput({
        aiInput: validation.aiInput,
        aiOutput: validation.aiOutput,
        warnings: validation.warnings,
      });
    } catch (error) {
      setStatusMessage("Import failed.");
      setValidationMessages([error instanceof Error ? error.message : "Unknown import error."]);
    }
  };

  const validateOutputJsonForInput = (args: {
    aiInput: KitchenAiInput;
    outputJsonText: string;
    designScene: ReturnType<typeof useDesignSceneStore.getState>["designScene"];
  }): { aiInput: KitchenAiInput; aiOutput: KitchenAiOutput; warnings: readonly string[] } | null => {
    const parseResult = parseKitchenAiOutputJson(args.outputJsonText);

    if (parseResult.output === null) {
      setStatusMessage("Output import failed: selected file is not valid kitchen-ai-output/v1 JSON.");
      setValidationMessages(parseResult.errors);
      return null;
    }

    const validationResult = validateKitchenAiOutputForInput({
      aiInput: args.aiInput,
      aiOutput: parseResult.output,
      existingSceneEntityIds: new Set(args.designScene.sceneEntities.map((sceneEntity) => sceneEntity.id)),
    });

    if (validationResult.output === null) {
      setStatusMessage("Output import failed validation.");
      setValidationMessages(validationResult.errors);
      return null;
    }

    return {
      aiInput: args.aiInput,
      aiOutput: validationResult.output,
      warnings: validationResult.warnings,
    };
  };

  const importValidatedKitchenAiOutput = (args: {
    aiInput: KitchenAiInput;
    aiOutput: KitchenAiOutput;
    warnings: readonly string[];
  }) => {
    const store = useDesignSceneStore.getState();
    const nextDesignScene = importKitchenAiScenePatch({
      designScene: store.designScene,
      aiInput: args.aiInput,
      aiOutput: args.aiOutput,
      assemblyDefinitions: kitchenEditorDefinitions,
    });

    useDesignSceneStore.setState({
      designScene: nextDesignScene,
      activeToolbarTool: null,
      activeDrag: null,
      activeSceneEntityAlignmentGuides: [],
      sceneHistory: {
        past: [
          ...store.sceneHistory.past,
          {
            id: createId(),
            label: "Import kitchen AI output",
            createdAtMs: Date.now(),
            designScene: store.designScene,
          },
        ].slice(-100),
        future: [],
      },
    });

    setStatusMessage(`Imported ${args.aiOutput.scenePatch.addSceneEntities.length} AI-generated entities from kitchen-ai-output.json.`);
    setValidationMessages(args.warnings);
  };

  const canCopyPrompt = latestInput !== null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 p-3 text-sm">
      <section className="shrink-0 rounded-xl border border-blue-100 bg-blue-50 p-3 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-950">Kitchen AI Cabinet Debug</h2>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Builds hidden wall/elevation/corner/object data, lets ChatGPT return a scene patch, and imports generated cabinet bodies plus debug reservation zones. Countertops, appliances, blind cabinets, lazy susans, real fillers, and real panels are disabled for this MVP.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-950">1. Build input</h3>
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            onClick={handleBuildInput}
          >
            Build Input
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Current scene: {designScene.placedWallGraphs.length} wall graph(s), {designScene.sceneEntities.length} scene entity/entities.
        </p>
        <label className="mt-3 block text-xs font-semibold text-slate-700" htmlFor="kitchen-ai-user-request">
          Design request for ChatGPT
        </label>
        <textarea
          id="kitchen-ai-user-request"
          className="mt-1 h-36 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs leading-5 text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          value={userDesignRequest}
          onChange={(event) => setUserDesignRequest(event.target.value)}
          placeholder="Describe what you want ChatGPT to prioritize. Example: I do not know where to make a tall pantry, but I want one if there is a good place. Please make the cabinet layout balanced and practical."
        />
        <button
          type="button"
          disabled={!canCopyPrompt}
          className="mt-2 w-full rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
          onClick={handleCopyPromptAndInput}
        >
          Copy Prompt + Input for ChatGPT
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950">2. Import output</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Select the kitchen-ai-output.json file returned by ChatGPT. The engine will validate the file and import the generated cabinet/debug objects.
        </p>
        <input
          ref={outputFileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleOutputFileChange}
        />
        <button
          type="button"
          className="mt-3 w-full rounded-lg bg-slate-900 px-2 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          onClick={handleOpenOutputFilePicker}
        >
          Import Output JSON
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
        <p className="mt-1 text-xs leading-5 text-slate-700">{statusMessage}</p>
        {validationMessages.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-amber-700">
            {validationMessages.map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function stringifyPretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function getCurrentInputForImport(args: {
  latestInput: KitchenAiInput | null;
  designScene: ReturnType<typeof useDesignSceneStore.getState>["designScene"];
}): KitchenAiInput {
  if (args.latestInput !== null) {
    return args.latestInput;
  }

  return buildKitchenAiInput({
    designScene: args.designScene,
    assemblyDefinitions: kitchenEditorDefinitions,
  });
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard !== undefined) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}
