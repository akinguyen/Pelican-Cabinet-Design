import { createId } from "@/core/ids/createId";
import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import type { DesignScene } from "@/engine/scene/designSceneTypes";
import { detectKitchenAiWallCorners } from "../ai/kitchenAiCornerDetector";
import { exportKitchenAiExistingSceneEntities, isKitchenAiUserReservationZone } from "../ai/kitchenAiSceneEntityExporter";
import { buildKitchenAiWallFaces } from "../ai/kitchenAiWallFaceExporter";
import type { AiKitchenDesignRequest } from "./aiKitchenDevelopmentTypes";
import { buildKitchenAiDevelopmentCatalogItems } from "./kitchenAiDevelopmentCatalogExporter";
import { kitchenAiDevelopmentCornerDetectionRules, kitchenAiDevelopmentRules } from "./kitchenAiDevelopmentRules";
import type { KitchenAiPreDesigned } from "./kitchenAiPreDesignedTypes";
import { normalizeKitchenAiDevelopmentRequest } from "./normalizeKitchenAiDevelopmentRequest";

export function buildKitchenAiPreDesigned(args: {
  designScene: DesignScene;
  assemblyDefinitions: readonly AssemblyDefinition[];
  request: AiKitchenDesignRequest;
  requestId?: string;
  createdAtMs?: number;
}): KitchenAiPreDesigned {
  const wallFaces = buildKitchenAiWallFaces(args.designScene.placedWallGraphs);
  const wallCorners = detectKitchenAiWallCorners({
    wallFaces,
    rules: kitchenAiDevelopmentCornerDetectionRules,
  });
  const existingSceneEntities = exportKitchenAiExistingSceneEntities({
    sceneEntities: args.designScene.sceneEntities,
    assemblyDefinitions: args.assemblyDefinitions,
    wallFaces,
  });

  return {
    schemaVersion: "kitchen-ai-predesigned/v1",
    requestId: args.requestId ?? createId(),
    units: "inches",
    designMode: "ai-chat-development",
    createdAtMs: args.createdAtMs ?? Date.now(),
    scene: {
      placedWallGraphs: args.designScene.placedWallGraphs,
      sceneEntities: args.designScene.sceneEntities,
    },
    wallFaces,
    wallCorners,
    existingSceneEntities,
    userReservationZones: existingSceneEntities.filter(isKitchenAiUserReservationZone),
    userRequirements: normalizeKitchenAiDevelopmentRequest(args.request),
    catalog: buildKitchenAiDevelopmentCatalogItems(),
    rules: kitchenAiDevelopmentRules,
  };
}
