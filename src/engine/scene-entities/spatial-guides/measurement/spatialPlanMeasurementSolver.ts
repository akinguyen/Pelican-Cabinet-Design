import type { SceneEntityPlanFootprint } from "@/engine/scene-entities/sceneEntityPlanGeometryTypes";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import type { Wall3DEdge } from "@/engine/walls/wall3DGeometry";
import { FLOOR_PLANE_MEASUREMENT_Z_INCHES } from "../spatialGuideFrame";
import type { SceneEntityWallMeasurementGuide } from "../spatialGuideTypes";
import {
  addPoint,
  createPlanFaceAnchorsFromBounds,
  createPlanFaceAnchorsFromSceneEntityFootprint,
  findNearestWallHitFromPlanFaceAnchor,
  getMidpoint,
  isNonNullable,
  multiplyPoint,
  normalizePlanVector,
  type SpatialPlanFaceAnchor,
  type SpatialPlanWallRayHit,
  WALL_BODY_MEASUREMENT_OVERLAY_OFFSET_INCHES,
} from "./spatialMeasurementGeometry";

export function createPlanWallFaceCenterMeasurementGuides(args: {
  bounds: SceneEntityBounds;
  wallEdges: readonly Wall3DEdge[];
  sourceId: string;
}): readonly SceneEntityWallMeasurementGuide[] {
  return createPlanWallMeasurementGuidesFromAnchors({
    faceAnchors: createPlanFaceAnchorsFromBounds(args.bounds),
    wallEdges: args.wallEdges,
    sourceId: args.sourceId,
  });
}

export function createPlanFootprintWallMeasurementGuides(args: {
  footprint: SceneEntityPlanFootprint;
  wallEdges: readonly Wall3DEdge[];
  sourceId: string;
}): readonly SceneEntityWallMeasurementGuide[] {
  return createPlanWallMeasurementGuidesFromAnchors({
    faceAnchors: createPlanFaceAnchorsFromSceneEntityFootprint({
      footprint: args.footprint,
      measurementZInches: FLOOR_PLANE_MEASUREMENT_Z_INCHES,
    }),
    wallEdges: args.wallEdges,
    sourceId: args.sourceId,
  });
}

function createPlanWallMeasurementGuidesFromAnchors(args: {
  faceAnchors: readonly SpatialPlanFaceAnchor[];
  wallEdges: readonly Wall3DEdge[];
  sourceId: string;
}): readonly SceneEntityWallMeasurementGuide[] {
  return args.faceAnchors
    .map((faceAnchor) => {
      const hit = findNearestWallHitFromPlanFaceAnchor({
        faceAnchor,
        wallEdges: args.wallEdges,
      });

      return hit === null ? null : createPlanWallMeasurementGuide({
        sourceId: args.sourceId,
        faceAnchor,
        hit,
      });
    })
    .filter(isNonNullable);
}

function createPlanWallMeasurementGuide(args: {
  sourceId: string;
  faceAnchor: SpatialPlanFaceAnchor;
  hit: SpatialPlanWallRayHit;
}): SceneEntityWallMeasurementGuide | null {
  const overlayDirection = normalizePlanVector(args.faceAnchor.directionInches);

  if (overlayDirection === null) {
    return null;
  }

  const overlayOffset = multiplyPoint(overlayDirection, WALL_BODY_MEASUREMENT_OVERLAY_OFFSET_INCHES);
  const startPointInches = addPoint(args.faceAnchor.startPointInches, overlayOffset);
  const endPointInches = addPoint(args.hit.endPointInches, overlayOffset);

  return {
    id: `scene-entity-wall-measurement:${args.sourceId}:${args.faceAnchor.id}:${args.hit.wallEdge.id}`,
    startPointInches,
    endPointInches,
    lengthInches: args.hit.lengthInches,
    labelPointInches: getMidpoint(startPointInches, endPointInches),
    labelRotationDegrees: 0,
  };
}
