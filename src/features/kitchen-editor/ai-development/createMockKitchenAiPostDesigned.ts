import type { KitchenAiPreDesigned } from "./kitchenAiPreDesignedTypes";
import type { KitchenAiPostDesigned, KitchenAiPostDesignedImagePlan } from "./kitchenAiPostDesignedTypes";

export function createMockKitchenAiPostDesigned(args: {
  preDesigned: KitchenAiPreDesigned;
}): KitchenAiPostDesigned {
  const imageGenerationPlan = buildMockImageGenerationPlan(args.preDesigned);

  return {
    schemaVersion: "kitchen-ai-postdesigned/v1",
    sourceRequestId: args.preDesigned.requestId,
    status: "success",
    designSummary: "Mock Development mode design result prepared from preDesigned.json.",
    requirementSummary: {
      satisfied: buildSatisfiedRequirementSummary(args.preDesigned),
      partial: [],
      failed: [],
    },
    scenePatch: {
      addSceneEntities: [],
      updateSceneEntities: [],
      deleteSceneEntityIds: [],
    },
    imageGenerationPlan,
    validationNotes: ["Mock postDesigned.json for Development Phase D. Scene patch is validated before any editor import."],
  };
}

function buildMockImageGenerationPlan(preDesigned: KitchenAiPreDesigned): readonly KitchenAiPostDesignedImagePlan[] {
  const wallFacePlans = preDesigned.wallFaces.slice(0, 2).map((wallFace, index) => ({
    id: `mock-wall-face-view-${index + 1}`,
    viewType: "wall-face" as const,
    label: `Wall Face ${index + 1}`,
    wallFaceId: wallFace.id,
    includedSceneEntityIds: collectEntityIdsForWallFace(preDesigned, wallFace.id),
    cameraInstruction: `Eye-level straight-ahead view looking directly at wall face ${wallFace.id}.`,
  }));

  const cornerPlans = preDesigned.wallCorners.slice(0, 1).map((corner, index) => ({
    id: `mock-corner-view-${index + 1}`,
    viewType: "corner" as const,
    label: `Corner View ${index + 1}`,
    cornerId: corner.id,
    includedSceneEntityIds: [],
    cameraInstruction: `Eye-level corner view looking into corner ${corner.id} and showing both adjacent wall faces.`,
  }));

  const generatedPlans = [...wallFacePlans, ...cornerPlans];

  return generatedPlans;
}

function collectEntityIdsForWallFace(preDesigned: KitchenAiPreDesigned, wallFaceId: string): readonly string[] {
  const wallFace = preDesigned.wallFaces.find((candidate) => candidate.id === wallFaceId);

  if (!wallFace) {
    return [];
  }

  return preDesigned.existingSceneEntities.flatMap((entity) => {
    const attachment = entity.wallElevationAttachment;

    if (!attachment) {
      return [];
    }

    if (
      attachment.wallGraphId === wallFace.wallGraphId &&
      attachment.wallSegmentId === wallFace.wallSegmentId &&
      attachment.faceSide === wallFace.faceSide
    ) {
      return [entity.id];
    }

    return [];
  });
}

function buildSatisfiedRequirementSummary(preDesigned: KitchenAiPreDesigned): readonly string[] {
  const requirements = preDesigned.userRequirements;

  return [
    ...requirements.cabinets.map((requirement) =>
      requirement.typeLabel
        ? `${requirement.typeLabel} - ${requirement.categoryLabel} x ${requirement.quantity}`
        : `${requirement.categoryLabel} x ${requirement.quantity}`,
    ),
    ...requirements.surfaces.map((requirement) => `${requirement.categoryLabel} x ${requirement.quantity}`),
    ...requirements.appliances.map((requirement) => `${requirement.categoryLabel} x ${requirement.quantity}`),
    ...requirements.fixtures.map((requirement) => `${requirement.categoryLabel} x ${requirement.quantity}`),
    ...(requirements.prompt.length > 0 ? [`Prompt: ${requirements.prompt}`] : []),
  ];
}
