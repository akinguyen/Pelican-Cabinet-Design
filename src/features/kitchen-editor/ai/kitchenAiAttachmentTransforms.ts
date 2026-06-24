import { rotatePointAroundZInches, type Point3DInches } from "@/core/geometry/pointTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import { getZRotationDegreesForFaceDirection } from "@/engine/design-zones/designReservationZoneGeometry";
import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import type {
  KitchenAiCornerAttachment,
  KitchenAiInput,
  KitchenAiWallElevationAttachment,
  KitchenAiWallFace,
  KitchenAiZoneAttachment,
} from "./kitchenAiTypes";

export type KitchenAiResolvedTransform = Readonly<{
  worldPositionInches: Point3DInches;
  rotationDegrees: { zDegrees: number };
}>;

export function resolveKitchenAiTransform(args: {
  aiInput: KitchenAiInput;
  attachmentKind: "placed-assembly" | "design-reservation-zone";
  sizeInches: Size3DInches;
  wallElevationAttachment?: KitchenAiWallElevationAttachment;
  cornerAttachment?: KitchenAiCornerAttachment;
  zoneAttachment?: KitchenAiZoneAttachment;
  worldPositionInches?: Point3DInches;
  rotationDegrees?: { zDegrees: number };
  existingSceneEntities: readonly SceneEntity[];
}): KitchenAiResolvedTransform {
  if (args.wallElevationAttachment !== undefined) {
    return resolveWallElevationAttachmentToWorldTransform({
      aiInput: args.aiInput,
      attachmentKind: args.attachmentKind,
      sizeInches: args.sizeInches,
      attachment: args.wallElevationAttachment,
    });
  }

  if (args.cornerAttachment !== undefined) {
    return resolveCornerAttachmentToWorldTransform({
      aiInput: args.aiInput,
      attachment: args.cornerAttachment,
    });
  }

  if (args.zoneAttachment !== undefined) {
    return resolveZoneAttachmentToWorldTransform({
      existingSceneEntities: args.existingSceneEntities,
      attachment: args.zoneAttachment,
    });
  }

  if (args.worldPositionInches !== undefined && args.rotationDegrees !== undefined) {
    return {
      worldPositionInches: args.worldPositionInches,
      rotationDegrees: args.rotationDegrees,
    };
  }

  throw new Error("Generated AI entity is missing a placement attachment or world transform.");
}

export function resolveWallElevationAttachmentToWorldTransform(args: {
  aiInput: KitchenAiInput;
  attachmentKind: "placed-assembly" | "design-reservation-zone";
  sizeInches: Size3DInches;
  attachment: KitchenAiWallElevationAttachment;
}): KitchenAiResolvedTransform {
  const wallFace = findWallFaceForAttachment(args.aiInput, args.attachment);
  const worldPositionInches = {
    xInches:
      wallFace.elevationFrame.planeOriginInches.xInches +
      wallFace.elevationFrame.faceDirectionInches.xInches * args.attachment.centerHorizontalInches +
      wallFace.elevationFrame.outwardDirectionInches.xInches * (args.sizeInches.depthInches / 2 + args.attachment.distanceFromWallFaceInches),
    yInches:
      wallFace.elevationFrame.planeOriginInches.yInches +
      wallFace.elevationFrame.faceDirectionInches.yInches * args.attachment.centerHorizontalInches +
      wallFace.elevationFrame.outwardDirectionInches.yInches * (args.sizeInches.depthInches / 2 + args.attachment.distanceFromWallFaceInches),
    zInches: args.attachment.centerVerticalInches,
  };

  return {
    worldPositionInches,
    rotationDegrees: {
      zDegrees: args.attachmentKind === "placed-assembly"
        ? getPlacedAssemblyRotationForOutwardDirection(wallFace.elevationFrame.outwardDirectionInches)
        : getZRotationDegreesForFaceDirection(wallFace.elevationFrame.faceDirectionInches),
    },
  };
}

export function resolveCornerAttachmentToWorldTransform(args: {
  aiInput: KitchenAiInput;
  attachment: KitchenAiCornerAttachment;
}): KitchenAiResolvedTransform {
  const corner = args.aiInput.wallCorners.find((matchingCorner) => matchingCorner.id === args.attachment.cornerId);

  if (corner === undefined) {
    throw new Error(`AI output references unknown corner "${args.attachment.cornerId}".`);
  }

  const resolution = args.attachment.layer === "base" ? corner.baseResolution : corner.wallResolution;

  if (resolution === null || resolution.cornerZone === null) {
    throw new Error(`AI output references unavailable ${args.attachment.layer} corner zone for corner "${args.attachment.cornerId}".`);
  }

  return {
    worldPositionInches: resolution.cornerZone.worldPositionInches,
    rotationDegrees: resolution.cornerZone.rotationDegrees,
  };
}

export function resolveZoneAttachmentToWorldTransform(args: {
  existingSceneEntities: readonly SceneEntity[];
  attachment: KitchenAiZoneAttachment;
}): KitchenAiResolvedTransform {
  const zone = args.existingSceneEntities.find(
    (sceneEntity) => sceneEntity.entityKind === "design-reservation-zone" && sceneEntity.id === args.attachment.reservationZoneId,
  );

  if (zone === undefined || zone.entityKind !== "design-reservation-zone") {
    throw new Error(`AI output references unknown reservation zone "${args.attachment.reservationZoneId}".`);
  }

  const rotatedLocalPoint = rotatePointAroundZInches(
    {
      xInches: args.attachment.centerXInches,
      yInches: args.attachment.centerYInches,
      zInches: 0,
    },
    zone.rotationDegrees.zDegrees,
  );

  return {
    worldPositionInches: {
      xInches: zone.worldPositionInches.xInches + rotatedLocalPoint.xInches,
      yInches: zone.worldPositionInches.yInches + rotatedLocalPoint.yInches,
      zInches: args.attachment.centerZInches,
    },
    rotationDegrees: {
      zDegrees: zone.rotationDegrees.zDegrees,
    },
  };
}

export function findWallFaceForAttachment(
  aiInput: KitchenAiInput,
  attachment: KitchenAiWallElevationAttachment,
): KitchenAiWallFace {
  const wallFace = aiInput.wallFaces.find(
    (candidate) =>
      candidate.wallGraphId === attachment.wallGraphId &&
      candidate.wallSegmentId === attachment.wallSegmentId &&
      candidate.faceSide === attachment.faceSide,
  );

  if (wallFace === undefined) {
    throw new Error(
      `AI output references unknown wall face ${attachment.wallGraphId}/${attachment.wallSegmentId}/${attachment.faceSide}.`,
    );
  }

  return wallFace;
}

function getPlacedAssemblyRotationForOutwardDirection(outwardDirectionInches: Point3DInches): number {
  return (Math.atan2(outwardDirectionInches.xInches, outwardDirectionInches.yInches) * 180) / Math.PI;
}
