import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import type { SpatialGuideFrame } from "../spatialGuideFrame";
import { createPointInSpatialGuideFrame } from "../spatialGuideFrame";
import { createSpatialGuideBoundsFromSceneEntityBounds } from "../spatialGuideProjection";
import type { SceneEntityWallMeasurementGuide, SpatialGuideBounds } from "../spatialGuideTypes";
import { getSpatialGuideOverlayNInches } from "../spatialGuideOverlay";
import { getMidpoint, isNonNullable, MIN_MEASUREMENT_LENGTH_INCHES } from "./spatialMeasurementGeometry";

export function createElevationWallFaceMeasurementGuides(args: {
  bounds: SceneEntityBounds;
  frame: SpatialGuideFrame;
  wallFaceBounds: SpatialGuideBounds;
  sourceId: string;
}): readonly SceneEntityWallMeasurementGuide[] {
  const objectBounds = createSpatialGuideBoundsFromSceneEntityBounds({ bounds: args.bounds, frame: args.frame });
  return [
    createWallFaceFrameGuide({
      id: `scene-entity-wall-measurement:${args.sourceId}:wall-face:left`,
      frame: args.frame,
      objectBounds,
      targetBounds: args.wallFaceBounds,
      startUInches: objectBounds.minUInches,
      startVInches: objectBounds.centerVInches,
      endUInches: args.wallFaceBounds.minUInches,
      endVInches: objectBounds.centerVInches,
      labelRotationDegrees: 0,
    }),
    createWallFaceFrameGuide({
      id: `scene-entity-wall-measurement:${args.sourceId}:wall-face:right`,
      frame: args.frame,
      objectBounds,
      targetBounds: args.wallFaceBounds,
      startUInches: objectBounds.maxUInches,
      startVInches: objectBounds.centerVInches,
      endUInches: args.wallFaceBounds.maxUInches,
      endVInches: objectBounds.centerVInches,
      labelRotationDegrees: 0,
    }),
    createWallFaceFrameGuide({
      id: `scene-entity-wall-measurement:${args.sourceId}:wall-face:top`,
      frame: args.frame,
      objectBounds,
      targetBounds: args.wallFaceBounds,
      startUInches: objectBounds.centerUInches,
      startVInches: objectBounds.maxVInches,
      endUInches: objectBounds.centerUInches,
      endVInches: args.wallFaceBounds.maxVInches,
      labelRotationDegrees: 90,
    }),
    createWallFaceFrameGuide({
      id: `scene-entity-wall-measurement:${args.sourceId}:wall-face:bottom`,
      frame: args.frame,
      objectBounds,
      targetBounds: args.wallFaceBounds,
      startUInches: objectBounds.centerUInches,
      startVInches: objectBounds.minVInches,
      endUInches: objectBounds.centerUInches,
      endVInches: args.wallFaceBounds.minVInches,
      labelRotationDegrees: 90,
    }),
  ].filter(isNonNullable);
}

function createWallFaceFrameGuide(args: {
  id: string;
  frame: SpatialGuideFrame;
  objectBounds: SpatialGuideBounds;
  targetBounds: SpatialGuideBounds;
  startUInches: number;
  startVInches: number;
  endUInches: number;
  endVInches: number;
  labelRotationDegrees: number;
}): SceneEntityWallMeasurementGuide | null {
  const lengthInches = Math.hypot(
    args.endUInches - args.startUInches,
    args.endVInches - args.startVInches,
  );

  if (lengthInches < MIN_MEASUREMENT_LENGTH_INCHES) {
    return null;
  }

  const overlayNInches = getSpatialGuideOverlayNInches({
    frame: args.frame,
    movingBounds: args.objectBounds,
    targetBounds: args.targetBounds,
  });
  const startPointInches = createPointInSpatialGuideFrame({
    frame: args.frame,
    uInches: args.startUInches,
    vInches: args.startVInches,
    nInches: overlayNInches,
  });
  const endPointInches = createPointInSpatialGuideFrame({
    frame: args.frame,
    uInches: args.endUInches,
    vInches: args.endVInches,
    nInches: overlayNInches,
  });

  return {
    id: args.id,
    startPointInches,
    endPointInches,
    lengthInches,
    labelPointInches: getMidpoint(startPointInches, endPointInches),
    labelRotationDegrees: args.labelRotationDegrees,
    renderOffsetMode: "pre-offset",
  };
}
