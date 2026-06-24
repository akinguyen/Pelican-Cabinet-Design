import type { KitchenAiWallFace } from "../ai/kitchenAiTypes";
import type { KitchenAiPostDesigned, KitchenAiPostDesignedImagePlan } from "./kitchenAiPostDesignedTypes";
import type { KitchenAiPreDesigned } from "./kitchenAiPreDesignedTypes";

export type KitchenAiImageGenerationPlanRepairResult = Readonly<{
  originalImageGenerationPlan: readonly KitchenAiPostDesignedImagePlan[];
  finalImageGenerationPlan: readonly KitchenAiPostDesignedImagePlan[];
  originalCount: number;
  requiredCount: number;
  addedCount: number;
}>;

export function buildKitchenAiRequiredImageGenerationPlan(args: {
  preDesigned: KitchenAiPreDesigned;
  postDesigned: KitchenAiPostDesigned;
}): KitchenAiImageGenerationPlanRepairResult {
  const existingPlansByWallFaceId = new Map<string, KitchenAiPostDesignedImagePlan>();
  const existingPlansByCornerId = new Map<string, KitchenAiPostDesignedImagePlan>();
  const extraPlans: KitchenAiPostDesignedImagePlan[] = [];

  for (const imagePlan of args.postDesigned.imageGenerationPlan) {
    if (imagePlan.viewType === "wall-face" && imagePlan.wallFaceId) {
      existingPlansByWallFaceId.set(imagePlan.wallFaceId, imagePlan);
      continue;
    }

    if (imagePlan.viewType === "corner" && imagePlan.cornerId) {
      existingPlansByCornerId.set(imagePlan.cornerId, imagePlan);
      continue;
    }

    extraPlans.push(imagePlan);
  }

  const entityIdsByWallFaceId = collectEntityIdsByWallFaceId(args.preDesigned, args.postDesigned);
  const requiredWallFaces = collectRequiredWallFaces(args.preDesigned, entityIdsByWallFaceId, existingPlansByWallFaceId);
  const requiredWallFaceIds = new Set(requiredWallFaces.map((wallFace) => wallFace.id));
  const repairedPlans: KitchenAiPostDesignedImagePlan[] = [];

  requiredWallFaces.forEach((wallFace, index) => {
    const existingPlan = existingPlansByWallFaceId.get(wallFace.id);
    const includedSceneEntityIds = mergeStringLists(
      entityIdsByWallFaceId.get(wallFace.id) ?? [],
      existingPlan?.includedSceneEntityIds ?? [],
    );

    repairedPlans.push({
      id: existingPlan?.id ?? `image-plan-wall-face-${index + 1}`,
      viewType: "wall-face",
      label: existingPlan?.label ?? `Wall Face ${index + 1}`,
      wallFaceId: wallFace.id,
      includedSceneEntityIds,
      cameraInstruction: existingPlan?.cameraInstruction ?? buildWallFaceCameraInstruction(wallFace, index + 1),
    });
  });

  const requiredCorners = args.preDesigned.wallCorners.filter((corner) => (
    requiredWallFaceIds.has(corner.wallFaceA.wallFaceId) || requiredWallFaceIds.has(corner.wallFaceB.wallFaceId)
  ));

  requiredCorners.forEach((corner, index) => {
    const existingPlan = existingPlansByCornerId.get(corner.id);
    const includedSceneEntityIds = mergeStringLists(
      entityIdsByWallFaceId.get(corner.wallFaceA.wallFaceId) ?? [],
      entityIdsByWallFaceId.get(corner.wallFaceB.wallFaceId) ?? [],
      existingPlan?.includedSceneEntityIds ?? [],
    );

    repairedPlans.push({
      id: existingPlan?.id ?? `image-plan-corner-${index + 1}`,
      viewType: "corner",
      label: existingPlan?.label ?? `Corner ${index + 1}`,
      cornerId: corner.id,
      includedSceneEntityIds,
      cameraInstruction: existingPlan?.cameraInstruction ?? buildCornerCameraInstruction(corner.id, index + 1),
    });
  });

  for (const imagePlan of args.postDesigned.imageGenerationPlan) {
    if (imagePlan.viewType === "wall-face" && imagePlan.wallFaceId && requiredWallFaceIds.has(imagePlan.wallFaceId)) {
      continue;
    }

    if (imagePlan.viewType === "corner" && imagePlan.cornerId && requiredCorners.some((corner) => corner.id === imagePlan.cornerId)) {
      continue;
    }

    if (extraPlans.includes(imagePlan)) {
      repairedPlans.push(imagePlan);
      continue;
    }

    if (imagePlan.viewType === "wall-face" && imagePlan.wallFaceId !== undefined) {
      repairedPlans.push(imagePlan);
      continue;
    }

    if (imagePlan.viewType === "corner" && imagePlan.cornerId !== undefined) {
      repairedPlans.push(imagePlan);
    }
  }

  const finalImageGenerationPlan = dedupeImagePlans(repairedPlans);

  return {
    originalImageGenerationPlan: args.postDesigned.imageGenerationPlan,
    finalImageGenerationPlan,
    originalCount: args.postDesigned.imageGenerationPlan.length,
    requiredCount: requiredWallFaces.length + requiredCorners.length,
    addedCount: Math.max(0, finalImageGenerationPlan.length - args.postDesigned.imageGenerationPlan.length),
  };
}

function collectRequiredWallFaces(
  preDesigned: KitchenAiPreDesigned,
  entityIdsByWallFaceId: ReadonlyMap<string, readonly string[]>,
  existingPlansByWallFaceId: ReadonlyMap<string, KitchenAiPostDesignedImagePlan>,
): KitchenAiWallFace[] {
  const hasAnyAttachedEntity = Array.from(entityIdsByWallFaceId.values()).some((entityIds) => entityIds.length > 0);

  return preDesigned.wallFaces.filter((wallFace) => {
    if (existingPlansByWallFaceId.has(wallFace.id)) {
      return true;
    }

    const directEntityIds = entityIdsByWallFaceId.get(wallFace.id) ?? [];

    if (directEntityIds.length > 0) {
      return true;
    }

    return hasAnyAttachedEntity && wallFace.cabinetPlacementRequirement === "required";
  });
}

function collectEntityIdsByWallFaceId(
  preDesigned: KitchenAiPreDesigned,
  postDesigned: KitchenAiPostDesigned,
): Map<string, string[]> {
  const wallFaceIdByKey = new Map(
    preDesigned.wallFaces.map((wallFace) => [
      getWallFaceKey(wallFace.wallGraphId, wallFace.wallSegmentId, wallFace.faceSide),
      wallFace.id,
    ]),
  );
  const entityIdsByWallFaceId = new Map<string, string[]>();
  const entities = [
    ...preDesigned.existingSceneEntities,
    ...postDesigned.scenePatch.addSceneEntities,
    ...postDesigned.scenePatch.updateSceneEntities,
  ];

  for (const entity of entities) {
    const attachment = entity.wallElevationAttachment;

    if (!attachment) {
      continue;
    }

    const wallFaceId = wallFaceIdByKey.get(getWallFaceKey(attachment.wallGraphId, attachment.wallSegmentId, attachment.faceSide));

    if (wallFaceId === undefined) {
      continue;
    }

    const nextEntityIds = entityIdsByWallFaceId.get(wallFaceId) ?? [];
    nextEntityIds.push(entity.id);
    entityIdsByWallFaceId.set(wallFaceId, nextEntityIds);
  }

  return entityIdsByWallFaceId;
}

function buildWallFaceCameraInstruction(wallFace: KitchenAiWallFace, viewNumber: number): string {
  return [
    `Generate one realistic eye-level straight-ahead kitchen interior image for Wall Face ${viewNumber}.`,
    `Look directly toward wallFaceId ${wallFace.id}.`,
    "Show only this one wall-face view, not a collage or split-screen.",
    "Keep the completed kitchen design consistent with postDesigned.json.",
  ].join(" ");
}

function buildCornerCameraInstruction(cornerId: string, viewNumber: number): string {
  return [
    `Generate one realistic eye-level kitchen interior image for Corner ${viewNumber}.`,
    `Look into cornerId ${cornerId} and show both adjacent wall faces in the same kitchen.`,
    "Show only this one corner view, not a collage or split-screen.",
    "Keep the completed kitchen design consistent with postDesigned.json.",
  ].join(" ");
}

function dedupeImagePlans(imagePlans: readonly KitchenAiPostDesignedImagePlan[]): KitchenAiPostDesignedImagePlan[] {
  const seenKeys = new Set<string>();
  const dedupedPlans: KitchenAiPostDesignedImagePlan[] = [];

  for (const imagePlan of imagePlans) {
    const key = imagePlan.viewType === "corner"
      ? `corner:${imagePlan.cornerId ?? imagePlan.id}`
      : `wall-face:${imagePlan.wallFaceId ?? imagePlan.id}`;

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    dedupedPlans.push(imagePlan);
  }

  return dedupedPlans;
}

function getWallFaceKey(wallGraphId: string, wallSegmentId: string, faceSide: string): string {
  return `${wallGraphId}::${wallSegmentId}::${faceSide}`;
}

function mergeStringLists(...lists: readonly (readonly string[])[]): string[] {
  return Array.from(new Set(lists.flat().filter((value) => value.trim().length > 0)));
}
