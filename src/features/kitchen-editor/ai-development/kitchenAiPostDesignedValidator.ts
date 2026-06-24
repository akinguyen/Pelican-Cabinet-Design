import type { KitchenAiDevelopmentCatalogItem, KitchenAiPreDesigned } from "./kitchenAiPreDesignedTypes";
import type {
  KitchenAiDevelopmentGeneratedSceneEntity,
  KitchenAiPostDesigned,
  KitchenAiPostDesignedImagePlan,
} from "./kitchenAiPostDesignedTypes";

export type KitchenAiPostDesignedValidationResult = Readonly<{
  postDesigned: KitchenAiPostDesigned | null;
  errors: readonly string[];
  warnings: readonly string[];
}>;

const validPostDesignedStatuses = new Set(["success", "partial", "failed"]);
const validImageViewTypes = new Set(["wall-face", "corner"]);
const validReservationPurposes = new Set([
  "corner",
  "filler",
  "panel",
  "clearance",
  "leftover",
  "island",
  "peninsula",
  "tall-pantry",
]);

export function parseKitchenAiPostDesignedJson(jsonText: string): KitchenAiPostDesignedValidationResult {
  try {
    return validateKitchenAiPostDesignedShape(JSON.parse(jsonText) as unknown);
  } catch (error) {
    return {
      postDesigned: null,
      errors: [error instanceof Error ? error.message : "postDesigned.json is not valid JSON."],
      warnings: [],
    };
  }
}

export function validateKitchenAiPostDesignedForPreDesigned(args: {
  preDesigned: KitchenAiPreDesigned;
  postDesigned: KitchenAiPostDesigned;
  existingSceneEntityIds?: ReadonlySet<string>;
}): KitchenAiPostDesignedValidationResult {
  const shapeResult = validateKitchenAiPostDesignedShape(args.postDesigned);

  if (shapeResult.postDesigned === null) {
    return shapeResult;
  }

  const errors = [...shapeResult.errors];
  const warnings = [...shapeResult.warnings];
  const catalogItemsByDefinitionId = new Map(args.preDesigned.catalog.map((item) => [item.definitionId, item]));
  const wallFaceIds = new Set(args.preDesigned.wallFaces.map((wallFace) => wallFace.id));
  const wallFaceKeys = new Set(
    args.preDesigned.wallFaces.map((wallFace) => getWallFaceKey(wallFace.wallGraphId, wallFace.wallSegmentId, wallFace.faceSide)),
  );
  const cornerIds = new Set(args.preDesigned.wallCorners.map((corner) => corner.id));
  const reservationZoneIds = new Set(args.preDesigned.userReservationZones.map((zone) => zone.id));
  const existingEntityIds = args.existingSceneEntityIds ?? new Set(args.preDesigned.scene.sceneEntities.map((entity) => entity.id));
  const generatedIds = new Set<string>();

  if (args.postDesigned.sourceRequestId !== args.preDesigned.requestId) {
    warnings.push("postDesigned.json sourceRequestId does not match the current preDesigned.json requestId.");
  }

  if (!args.preDesigned.rules.allowExistingObjectUpdates && args.postDesigned.scenePatch.updateSceneEntities.length > 0) {
    errors.push("postDesigned.json contains updateSceneEntities, but Development rules do not allow existing object updates.");
  }

  if (!args.preDesigned.rules.allowExistingObjectDeletion && args.postDesigned.scenePatch.deleteSceneEntityIds.length > 0) {
    errors.push("postDesigned.json contains deleteSceneEntityIds, but Development rules do not allow existing object deletion.");
  }

  args.postDesigned.scenePatch.addSceneEntities.forEach((entity, index) => {
    validateGeneratedSceneEntity({
      entity,
      index,
      collectionName: "addSceneEntities",
      generatedIds,
      existingEntityIds,
      catalogItemsByDefinitionId,
      wallFaceKeys,
      cornerIds,
      reservationZoneIds,
      allowCustomWidths: args.preDesigned.rules.allowCustomWidths,
      errors,
      warnings,
    });
  });

  args.postDesigned.scenePatch.updateSceneEntities.forEach((entity, index) => {
    validateGeneratedSceneEntity({
      entity,
      index,
      collectionName: "updateSceneEntities",
      generatedIds,
      existingEntityIds: new Set(),
      catalogItemsByDefinitionId,
      wallFaceKeys,
      cornerIds,
      reservationZoneIds,
      allowCustomWidths: args.preDesigned.rules.allowCustomWidths,
      errors,
      warnings,
    });
  });

  const imagePlanIds = new Set<string>();
  args.postDesigned.imageGenerationPlan.forEach((imagePlan, index) => {
    validateImageGenerationPlan({ imagePlan, index, imagePlanIds, wallFaceIds, cornerIds, errors });
  });

  return {
    postDesigned: errors.length === 0 ? args.postDesigned : null,
    errors,
    warnings,
  };
}

function validateKitchenAiPostDesignedShape(value: unknown): KitchenAiPostDesignedValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { postDesigned: null, errors: ["postDesigned.json must be an object."], warnings: [] };
  }

  if (value.schemaVersion !== "kitchen-ai-postdesigned/v1") {
    errors.push('postDesigned.json schemaVersion must be "kitchen-ai-postdesigned/v1".');
  }

  if (!isNonEmptyString(value.sourceRequestId)) errors.push("postDesigned.json sourceRequestId must be a non-empty string.");
  if (!isNonEmptyString(value.designSummary)) errors.push("postDesigned.json designSummary must be a non-empty string.");
  if (typeof value.status !== "string" || !validPostDesignedStatuses.has(value.status)) {
    errors.push('postDesigned.json status must be "success", "partial", or "failed".');
  }

  if (!isRecord(value.requirementSummary)) {
    errors.push("postDesigned.json requirementSummary must be an object.");
  } else {
    validateStringArray(value.requirementSummary.satisfied, "requirementSummary.satisfied", errors);
    validateStringArray(value.requirementSummary.partial, "requirementSummary.partial", errors);
    validateStringArray(value.requirementSummary.failed, "requirementSummary.failed", errors);
  }

  if (!isRecord(value.scenePatch)) {
    errors.push("postDesigned.json scenePatch must be an object.");
  } else {
    if (!Array.isArray(value.scenePatch.addSceneEntities)) errors.push("scenePatch.addSceneEntities must be an array.");
    if (!Array.isArray(value.scenePatch.updateSceneEntities)) errors.push("scenePatch.updateSceneEntities must be an array.");
    validateStringArray(value.scenePatch.deleteSceneEntityIds, "scenePatch.deleteSceneEntityIds", errors);
  }

  if (!Array.isArray(value.imageGenerationPlan)) errors.push("postDesigned.json imageGenerationPlan must be an array.");
  validateStringArray(value.validationNotes, "validationNotes", errors);

  return {
    postDesigned: errors.length === 0 ? value as KitchenAiPostDesigned : null,
    errors,
    warnings: [],
  };
}

function validateGeneratedSceneEntity(args: {
  entity: KitchenAiDevelopmentGeneratedSceneEntity;
  index: number;
  collectionName: string;
  generatedIds: Set<string>;
  existingEntityIds: ReadonlySet<string>;
  catalogItemsByDefinitionId: ReadonlyMap<string, KitchenAiDevelopmentCatalogItem>;
  wallFaceKeys: ReadonlySet<string>;
  cornerIds: ReadonlySet<string>;
  reservationZoneIds: ReadonlySet<string>;
  allowCustomWidths: boolean;
  errors: string[];
  warnings: string[];
}): void {
  const entity = args.entity;
  const label = `${args.collectionName}[${args.index}]`;

  if (!isRecord(entity)) {
    args.errors.push(`${label} must be an object.`);
    return;
  }

  if (!isNonEmptyString(entity.id)) {
    args.errors.push(`${label}.id must be a non-empty string.`);
  } else {
    if (args.generatedIds.has(entity.id)) {
      args.errors.push(`Duplicate generated entity id "${entity.id}".`);
    }

    if (args.existingEntityIds.has(entity.id)) {
      args.errors.push(`Generated entity id "${entity.id}" already exists in the current scene.`);
    }

    args.generatedIds.add(entity.id);
  }

  if (entity.entityKind === "placed-assembly") {
    validateGeneratedPlacedAssembly({
      entity,
      label: entity.id || label,
      catalogItemsByDefinitionId: args.catalogItemsByDefinitionId,
      wallFaceKeys: args.wallFaceKeys,
      reservationZoneIds: args.reservationZoneIds,
      allowCustomWidths: args.allowCustomWidths,
      errors: args.errors,
      warnings: args.warnings,
    });
    return;
  }

  if (entity.entityKind === "design-reservation-zone") {
    validateGeneratedReservationZone({
      entity,
      label: entity.id || label,
      wallFaceKeys: args.wallFaceKeys,
      cornerIds: args.cornerIds,
      reservationZoneIds: args.reservationZoneIds,
      errors: args.errors,
    });
    return;
  }

  args.errors.push(`${label}.entityKind must be "placed-assembly" or "design-reservation-zone".`);
}

function validateGeneratedPlacedAssembly(args: {
  entity: Extract<KitchenAiDevelopmentGeneratedSceneEntity, { entityKind: "placed-assembly" }>;
  label: string;
  catalogItemsByDefinitionId: ReadonlyMap<string, KitchenAiDevelopmentCatalogItem>;
  wallFaceKeys: ReadonlySet<string>;
  reservationZoneIds: ReadonlySet<string>;
  allowCustomWidths: boolean;
  errors: string[];
  warnings: string[];
}): void {
  const catalogItem = args.catalogItemsByDefinitionId.get(args.entity.definitionId);

  if (!isNonEmptyString(args.entity.definitionId)) {
    args.errors.push(`Generated placed assembly ${args.label} must include definitionId.`);
  } else if (catalogItem === undefined) {
    args.errors.push(`Generated placed assembly ${args.label} uses definitionId "${args.entity.definitionId}" that is not in preDesigned.catalog.`);
  }

  const sizeInches = args.entity.configuration?.sizeInches;
  validateSize(sizeInches, `placed assembly ${args.label}`, args.errors);

  if (catalogItem?.itemKind === "cabinet" && sizeInches !== undefined) {
    validateGeneratedCatalogWidth({ entityId: args.label, widthInches: sizeInches.widthInches, catalogItem, allowCustomWidths: args.allowCustomWidths, errors: args.errors });
  }

  validatePlacement({
    label: `placed assembly ${args.label}`,
    wallElevationAttachment: args.entity.wallElevationAttachment,
    zoneAttachment: args.entity.zoneAttachment,
    worldPositionInches: args.entity.worldPositionInches,
    rotationDegrees: args.entity.rotationDegrees,
    wallFaceKeys: args.wallFaceKeys,
    reservationZoneIds: args.reservationZoneIds,
    errors: args.errors,
  });
}

function validateGeneratedReservationZone(args: {
  entity: Extract<KitchenAiDevelopmentGeneratedSceneEntity, { entityKind: "design-reservation-zone" }>;
  label: string;
  wallFaceKeys: ReadonlySet<string>;
  cornerIds: ReadonlySet<string>;
  reservationZoneIds: ReadonlySet<string>;
  errors: string[];
}): void {
  if (!validReservationPurposes.has(args.entity.reservedFor)) {
    args.errors.push(`Generated reservation zone ${args.label} uses unsupported reservedFor "${String(args.entity.reservedFor)}".`);
  }

  validateSize(args.entity.sizeInches, `reservation zone ${args.label}`, args.errors);

  if (args.entity.cornerAttachment !== undefined && !args.cornerIds.has(args.entity.cornerAttachment.cornerId)) {
    args.errors.push(`Generated reservation zone ${args.label} references unknown cornerId "${args.entity.cornerAttachment.cornerId}".`);
  }

  validatePlacement({
    label: `reservation zone ${args.label}`,
    wallElevationAttachment: args.entity.wallElevationAttachment,
    cornerAttachmentPresent: args.entity.cornerAttachment !== undefined,
    zoneAttachment: args.entity.zoneAttachment,
    worldPositionInches: args.entity.worldPositionInches,
    rotationDegrees: args.entity.rotationDegrees,
    wallFaceKeys: args.wallFaceKeys,
    reservationZoneIds: args.reservationZoneIds,
    errors: args.errors,
  });
}

function validateImageGenerationPlan(args: {
  imagePlan: KitchenAiPostDesignedImagePlan;
  index: number;
  imagePlanIds: Set<string>;
  wallFaceIds: ReadonlySet<string>;
  cornerIds: ReadonlySet<string>;
  errors: string[];
}): void {
  const imagePlan = args.imagePlan;
  const label = `imageGenerationPlan[${args.index}]`;

  if (!isRecord(imagePlan)) {
    args.errors.push(`${label} must be an object.`);
    return;
  }

  if (!isNonEmptyString(imagePlan.id)) {
    args.errors.push(`${label}.id must be a non-empty string.`);
  } else if (args.imagePlanIds.has(imagePlan.id)) {
    args.errors.push(`Duplicate imageGenerationPlan id "${imagePlan.id}".`);
  } else {
    args.imagePlanIds.add(imagePlan.id);
  }

  if (typeof imagePlan.viewType !== "string" || !validImageViewTypes.has(imagePlan.viewType)) {
    args.errors.push(`${label}.viewType must be "wall-face" or "corner".`);
  }

  if (!isNonEmptyString(imagePlan.label)) args.errors.push(`${label}.label must be a non-empty string.`);
  if (!Array.isArray(imagePlan.includedSceneEntityIds)) args.errors.push(`${label}.includedSceneEntityIds must be an array.`);
  if (!isNonEmptyString(imagePlan.cameraInstruction)) args.errors.push(`${label}.cameraInstruction must be a non-empty string.`);

  if (imagePlan.viewType === "wall-face") {
    if (!isNonEmptyString(imagePlan.wallFaceId)) {
      args.errors.push(`${label}.wallFaceId is required for wall-face views.`);
    } else if (!args.wallFaceIds.has(imagePlan.wallFaceId)) {
      args.errors.push(`${label}.wallFaceId "${imagePlan.wallFaceId}" does not exist in preDesigned.wallFaces.`);
    }
  }

  if (imagePlan.viewType === "corner") {
    if (!isNonEmptyString(imagePlan.cornerId)) {
      args.errors.push(`${label}.cornerId is required for corner views.`);
    } else if (!args.cornerIds.has(imagePlan.cornerId)) {
      args.errors.push(`${label}.cornerId "${imagePlan.cornerId}" does not exist in preDesigned.wallCorners.`);
    }
  }
}

function validateGeneratedCatalogWidth(args: {
  entityId: string;
  widthInches: number;
  catalogItem: KitchenAiDevelopmentCatalogItem;
  allowCustomWidths: boolean;
  errors: string[];
}): void {
  if (args.catalogItem.canUseCustomWidth && args.allowCustomWidths) {
    return;
  }

  const matchesWidth = args.catalogItem.allowedWidthsInches.some((allowedWidth) => Math.abs(allowedWidth - args.widthInches) <= 0.01);

  if (!matchesWidth) {
    args.errors.push(
      `Generated cabinet ${args.entityId} uses width ${args.widthInches}, but allowed widths for ${args.catalogItem.definitionId} are ${args.catalogItem.allowedWidthsInches.join(", ")}.`,
    );
  }
}

function validatePlacement(args: {
  label: string;
  wallElevationAttachment?: { wallGraphId: string; wallSegmentId: string; faceSide: string };
  cornerAttachmentPresent?: boolean;
  zoneAttachment?: { reservationZoneId: string };
  worldPositionInches?: unknown;
  rotationDegrees?: unknown;
  wallFaceKeys: ReadonlySet<string>;
  reservationZoneIds: ReadonlySet<string>;
  errors: string[];
}): void {
  const placementCount = [
    args.wallElevationAttachment !== undefined,
    args.cornerAttachmentPresent === true,
    args.zoneAttachment !== undefined,
    args.worldPositionInches !== undefined || args.rotationDegrees !== undefined,
  ].filter(Boolean).length;

  if (placementCount === 0) {
    args.errors.push(`Generated ${args.label} is missing a placement attachment or world transform.`);
  }

  if (placementCount > 1) {
    args.errors.push(`Generated ${args.label} should use only one placement method.`);
  }

  if (args.wallElevationAttachment !== undefined) {
    const key = getWallFaceKey(
      args.wallElevationAttachment.wallGraphId,
      args.wallElevationAttachment.wallSegmentId,
      args.wallElevationAttachment.faceSide,
    );

    if (!args.wallFaceKeys.has(key)) {
      args.errors.push(`Generated ${args.label} references unknown wall face ${key}.`);
    }
  }

  if (args.zoneAttachment !== undefined && !args.reservationZoneIds.has(args.zoneAttachment.reservationZoneId)) {
    args.errors.push(`Generated ${args.label} references unknown reservation zone "${args.zoneAttachment.reservationZoneId}".`);
  }

  if ((args.worldPositionInches !== undefined || args.rotationDegrees !== undefined) &&
    (args.worldPositionInches === undefined || args.rotationDegrees === undefined)) {
    args.errors.push(`Generated ${args.label} must include both worldPositionInches and rotationDegrees when using direct world placement.`);
  }
}

function validateSize(value: unknown, label: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`Generated ${label} sizeInches must be an object.`);
    return;
  }

  ["widthInches", "depthInches", "heightInches"].forEach((dimensionId) => {
    const dimensionValue = value[dimensionId];

    if (typeof dimensionValue !== "number" || !Number.isFinite(dimensionValue) || dimensionValue <= 0) {
      errors.push(`Generated ${label} sizeInches.${dimensionId} must be a positive number.`);
    }
  });
}

function validateStringArray(value: unknown, label: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array.`);
    return;
  }

  value.forEach((item, index) => {
    if (typeof item !== "string") {
      errors.push(`${label}[${index}] must be a string.`);
    }
  });
}

function getWallFaceKey(wallGraphId: string, wallSegmentId: string, faceSide: string): string {
  return `${wallGraphId}/${wallSegmentId}/${faceSide}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
