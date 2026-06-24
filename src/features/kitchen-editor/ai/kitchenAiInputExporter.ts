import { createId } from "@/core/ids/createId";
import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import type { DesignScene } from "@/engine/scene/designSceneTypes";
import { buildKitchenAiCatalogItems } from "./kitchenAiCatalogExporter";
import { detectKitchenAiWallCorners } from "./kitchenAiCornerDetector";
import { kitchenAiCabinetBodyDebugRules } from "./kitchenAiRules";
import { exportKitchenAiExistingSceneEntities, isKitchenAiUserReservationZone } from "./kitchenAiSceneEntityExporter";
import type { KitchenAiInput } from "./kitchenAiTypes";
import { buildKitchenAiWallFaces } from "./kitchenAiWallFaceExporter";

export function buildKitchenAiInput(args: {
  designScene: DesignScene;
  assemblyDefinitions: readonly AssemblyDefinition[];
  requestId?: string;
}): KitchenAiInput {
  const wallFaces = buildKitchenAiWallFaces(args.designScene.placedWallGraphs);
  const wallCorners = detectKitchenAiWallCorners({
    wallFaces,
    rules: kitchenAiCabinetBodyDebugRules,
  });
  const existingSceneEntities = exportKitchenAiExistingSceneEntities({
    sceneEntities: args.designScene.sceneEntities,
    assemblyDefinitions: args.assemblyDefinitions,
    wallFaces,
  });

  return {
    schemaVersion: "kitchen-ai-input/v1",
    requestId: args.requestId ?? createId(),
    units: "inches",
    designMode: "cabinet-body-debug",
    rules: kitchenAiCabinetBodyDebugRules,
    wallFaces,
    wallCorners,
    existingSceneEntities,
    userReservationZones: existingSceneEntities.filter(isKitchenAiUserReservationZone),
    catalog: buildKitchenAiCatalogItems(),
  };
}
