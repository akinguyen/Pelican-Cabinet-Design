import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import type { DesignReservationZonePurpose } from "@/engine/design-zones/designReservationZoneTypes";
import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import { getSceneEntitySizeInches } from "@/engine/scene-entities/sceneEntityTransforms";
import type { KitchenAiExistingSceneEntity, KitchenAiWallElevationAttachment, KitchenAiWallFace } from "./kitchenAiTypes";

const WALL_ATTACHMENT_NORMAL_TOLERANCE_INCHES = 8;
const WALL_ATTACHMENT_HORIZONTAL_TOLERANCE_INCHES = 4;

export function exportKitchenAiExistingSceneEntities(args: {
  sceneEntities: readonly SceneEntity[];
  assemblyDefinitions: readonly AssemblyDefinition[];
  wallFaces: readonly KitchenAiWallFace[];
}): readonly KitchenAiExistingSceneEntity[] {
  const assemblyDefinitionsById = new Map(args.assemblyDefinitions.map((definition) => [definition.id, definition]));

  return args.sceneEntities.map((sceneEntity) => {
    const sizeInches = getSceneEntitySizeInches(sceneEntity);
    const definition = sceneEntity.entityKind === "placed-assembly"
      ? assemblyDefinitionsById.get(sceneEntity.definitionId)
      : undefined;

    return {
      id: sceneEntity.id,
      entityKind: sceneEntity.entityKind,
      definitionId: sceneEntity.entityKind === "placed-assembly" ? sceneEntity.definitionId : undefined,
      reservedFor: sceneEntity.entityKind === "design-reservation-zone" ? sceneEntity.reservedFor : undefined,
      semanticRole: deriveExistingEntitySemanticRole(sceneEntity, definition?.catalogCategoryId),
      locked: true,
      sizeInches,
      worldPositionInches: sceneEntity.worldPositionInches,
      rotationDegrees: {
        zDegrees: sceneEntity.rotationDegrees.zDegrees,
      },
      wallElevationAttachment: findBestWallElevationAttachment({
        sceneEntity,
        sizeInches,
        wallFaces: args.wallFaces,
      }),
    } satisfies KitchenAiExistingSceneEntity;
  });
}

function deriveExistingEntitySemanticRole(
  sceneEntity: SceneEntity,
  catalogCategoryId?: string,
): string {
  if (sceneEntity.entityKind === "design-reservation-zone") {
    return `reservation-${sceneEntity.reservedFor}`;
  }

  const normalizedDefinitionId = sceneEntity.definitionId.toLowerCase();
  const normalizedCategoryId = catalogCategoryId?.toLowerCase() ?? "";

  if (normalizedDefinitionId.includes("refrigerator")) return "refrigerator";
  if (normalizedDefinitionId.includes("dishwasher")) return "dishwasher";
  if (normalizedDefinitionId.includes("range-hood")) return "range-hood";
  if (normalizedDefinitionId.includes("range") || normalizedDefinitionId.includes("cooktop")) return "range-or-cooktop";
  if (normalizedDefinitionId.includes("sink")) return "sink";
  if (normalizedDefinitionId.includes("faucet")) return "faucet";
  if (normalizedDefinitionId.includes("window")) return "window";
  if (normalizedDefinitionId.includes("door")) return "door";
  if (normalizedCategoryId.includes("wall")) return "existing-wall-cabinet";
  if (normalizedCategoryId.includes("base")) return "existing-base-cabinet";
  if (normalizedCategoryId.includes("pantry")) return "existing-pantry-cabinet";
  if (normalizedDefinitionId.includes("cabinet")) return "existing-cabinet";

  return "existing-object";
}

function findBestWallElevationAttachment(args: {
  sceneEntity: SceneEntity;
  sizeInches: ReturnType<typeof getSceneEntitySizeInches>;
  wallFaces: readonly KitchenAiWallFace[];
}): KitchenAiWallElevationAttachment | undefined {
  let bestAttachment: KitchenAiWallElevationAttachment | undefined;
  let bestScore = Number.POSITIVE_INFINITY;

  args.wallFaces.forEach((wallFace) => {
    const deltaXInches = args.sceneEntity.worldPositionInches.xInches - wallFace.elevationFrame.planeOriginInches.xInches;
    const deltaYInches = args.sceneEntity.worldPositionInches.yInches - wallFace.elevationFrame.planeOriginInches.yInches;
    const centerHorizontalInches =
      deltaXInches * wallFace.elevationFrame.faceDirectionInches.xInches +
      deltaYInches * wallFace.elevationFrame.faceDirectionInches.yInches;
    const normalDistanceInches =
      deltaXInches * wallFace.elevationFrame.outwardDirectionInches.xInches +
      deltaYInches * wallFace.elevationFrame.outwardDirectionInches.yInches;
    const expectedNormalDistanceInches = args.sizeInches.depthInches / 2;
    const normalErrorInches = Math.abs(normalDistanceInches - expectedNormalDistanceInches);
    const leftInches = centerHorizontalInches - args.sizeInches.widthInches / 2;
    const rightInches = centerHorizontalInches + args.sizeInches.widthInches / 2;
    const withinHorizontalBounds =
      leftInches >= wallFace.elevationFrame.horizontalBoundsInches.leftInches - WALL_ATTACHMENT_HORIZONTAL_TOLERANCE_INCHES &&
      rightInches <= wallFace.elevationFrame.horizontalBoundsInches.rightInches + WALL_ATTACHMENT_HORIZONTAL_TOLERANCE_INCHES;

    if (!withinHorizontalBounds || normalErrorInches > WALL_ATTACHMENT_NORMAL_TOLERANCE_INCHES) {
      return;
    }

    if (normalErrorInches < bestScore) {
      bestScore = normalErrorInches;
      bestAttachment = {
        wallGraphId: wallFace.wallGraphId,
        wallSegmentId: wallFace.wallSegmentId,
        faceSide: wallFace.faceSide,
        centerHorizontalInches: roundToQuarterInch(centerHorizontalInches),
        centerVerticalInches: roundToQuarterInch(args.sceneEntity.worldPositionInches.zInches),
        distanceFromWallFaceInches: roundToQuarterInch(normalDistanceInches - expectedNormalDistanceInches),
      };
    }
  });

  return bestAttachment;
}

function roundToQuarterInch(value: number): number {
  return Math.round(value * 4) / 4;
}

export function isKitchenAiUserReservationZone(entity: KitchenAiExistingSceneEntity): entity is KitchenAiExistingSceneEntity & { reservedFor: DesignReservationZonePurpose } {
  return entity.entityKind === "design-reservation-zone" && entity.reservedFor !== undefined;
}
