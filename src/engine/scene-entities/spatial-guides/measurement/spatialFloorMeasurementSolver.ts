import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import type { SceneEntityWallMeasurementGuide } from "../spatialGuideTypes";
import { getMidpoint, MIN_MEASUREMENT_LENGTH_INCHES } from "./spatialMeasurementGeometry";

const FLOOR_MEASUREMENT_LABEL_ROTATION_DEGREES = 90;
const ZERO_Z_INCHES = 0;

export function createFloorMeasurementGuide(args: {
  bounds: SceneEntityBounds;
  sourceId: string;
}): SceneEntityWallMeasurementGuide | null {
  const floorDistanceInches = args.bounds.heightRangeInches.minZInches;

  if (floorDistanceInches < MIN_MEASUREMENT_LENGTH_INCHES) {
    return null;
  }

  const bottomCenterPointInches = {
    xInches: args.bounds.centerPointInches.xInches,
    yInches: args.bounds.centerPointInches.yInches,
    zInches: args.bounds.heightRangeInches.minZInches,
  };
  const floorPointInches = {
    ...bottomCenterPointInches,
    zInches: ZERO_Z_INCHES,
  };

  return {
    id: `scene-entity-wall-measurement:${args.sourceId}:floor`,
    startPointInches: bottomCenterPointInches,
    endPointInches: floorPointInches,
    lengthInches: floorDistanceInches,
    labelPointInches: getMidpoint(bottomCenterPointInches, floorPointInches),
    labelRotationDegrees: FLOOR_MEASUREMENT_LABEL_ROTATION_DEGREES,
  };
}
