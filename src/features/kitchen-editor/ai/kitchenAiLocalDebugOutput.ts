import type { KitchenAiGeneratedReservationZone, KitchenAiInput, KitchenAiOutput } from "./kitchenAiTypes";

export function createKitchenAiCornerDebugOutput(aiInput: KitchenAiInput): KitchenAiOutput {
  const addSceneEntities: KitchenAiGeneratedReservationZone[] = [];

  aiInput.wallCorners.forEach((corner, cornerIndex) => {
    if (corner.baseResolution !== null) {
      if (corner.baseResolution.cornerZone !== null) {
        addSceneEntities.push({
          id: `ai-debug-base-corner-${cornerIndex + 1}`,
          entityKind: "design-reservation-zone",
          reservedFor: "corner",
          sizeInches: corner.baseResolution.cornerZone.sizeInches,
          cornerAttachment: corner.baseResolution.cornerZone.cornerAttachment,
          aiMeta: {
            debugKind: "base-corner",
            sourceCornerId: corner.id,
          },
          reason: "Local debug output copied the exported base corner reservation target.",
        });
      }

      corner.baseResolution.fillerZones.forEach((target, fillerIndex) => {
        addSceneEntities.push({
          id: `ai-debug-base-corner-filler-${cornerIndex + 1}-${fillerIndex + 1}`,
          entityKind: "design-reservation-zone",
          reservedFor: "filler",
          sizeInches: target.sizeInches,
          wallElevationAttachment: target.wallElevationAttachment,
          aiMeta: {
            debugKind: "base-corner-filler",
            sourceCornerId: corner.id,
          },
          reason: "Local debug output copied the exported base corner filler reservation target.",
        });
      });
    }

    if (corner.wallResolution !== null) {
      if (corner.wallResolution.cornerZone !== null) {
        addSceneEntities.push({
          id: `ai-debug-wall-corner-${cornerIndex + 1}`,
          entityKind: "design-reservation-zone",
          reservedFor: "corner",
          sizeInches: corner.wallResolution.cornerZone.sizeInches,
          cornerAttachment: corner.wallResolution.cornerZone.cornerAttachment,
          aiMeta: {
            debugKind: "wall-corner",
            sourceCornerId: corner.id,
          },
          reason: "Local debug output copied the exported wall corner reservation target.",
        });
      }

      corner.wallResolution.fillerZones.forEach((target, fillerIndex) => {
        addSceneEntities.push({
          id: `ai-debug-wall-corner-filler-${cornerIndex + 1}-${fillerIndex + 1}`,
          entityKind: "design-reservation-zone",
          reservedFor: "filler",
          sizeInches: target.sizeInches,
          wallElevationAttachment: target.wallElevationAttachment,
          aiMeta: {
            debugKind: "wall-corner-filler",
            sourceCornerId: corner.id,
          },
          reason: "Local debug output copied the exported wall corner filler reservation target.",
        });
      });
    }
  });

  return {
    schemaVersion: "kitchen-ai-output/v1",
    sourceRequestId: aiInput.requestId,
    status: "success",
    designSummary: "Local debug output generated only the exported corner and corner-filler reservation zones. No cabinets, appliances, fixtures, panels, or countertops were generated.",
    scenePatch: {
      addSceneEntities,
      updateSceneEntities: [],
      deleteSceneEntityIds: [],
    },
    validationNotes: [
      "This is a local debug output for testing corner reservation zone import only.",
    ],
  };
}
