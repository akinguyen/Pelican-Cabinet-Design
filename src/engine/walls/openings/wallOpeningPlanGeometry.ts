import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { DerivedWallOpening } from "../placedWallSegmentTypes";
import type { BuiltWallSegmentBody } from "../wallSegmentTopologyTypes";
import { createOrthogonalDerivedWallOpeningCutFootprint } from "./wallOpeningCutGeometry";
import { createDerivedWallOpeningFaceAxes } from "./wallOpeningFaceAxes";

const WALL_OPENING_PLAN_OUTLINE_PADDING_INCHES = 1;
const WALL_OPENING_PLAN_INTERACTION_DEPTH_PADDING_INCHES = 4;
const MIN_WALL_OPENING_PLAN_INTERACTION_DEPTH_INCHES = 6;

export type DerivedWallOpeningPlanOutlineInches = Readonly<{
  id: string;
  sourceAssemblyId: string;
  outlinePointsInches: readonly Point3DInches[];
  interactionCenterInches: Point3DInches;
  interactionWidthInches: number;
  interactionDepthInches: number;
  interactionRotationZRadians: number;
}>;

export function createDerivedWallOpeningPlanOutline(args: {
  segmentBody: BuiltWallSegmentBody;
  opening: DerivedWallOpening;
}): DerivedWallOpeningPlanOutlineInches | null {
  const cutFootprint = createOrthogonalDerivedWallOpeningCutFootprint({
    segmentBody: args.segmentBody,
    opening: args.opening,
    paddingInches: WALL_OPENING_PLAN_OUTLINE_PADDING_INCHES,
    depthPaddingInches: WALL_OPENING_PLAN_INTERACTION_DEPTH_PADDING_INCHES,
  });
  const faceAxes = createDerivedWallOpeningFaceAxes({
    segmentBody: args.segmentBody,
    faceSide: args.opening.faceSide,
  });

  if (cutFootprint === null || faceAxes === null) {
    return null;
  }

  const outlinePointsInches = [
    cutFootprint.frontLeftInches,
    cutFootprint.frontRightInches,
    cutFootprint.backRightInches,
    cutFootprint.backLeftInches,
    cutFootprint.frontLeftInches,
  ];
  const outlineCenterInches = getPolygonCenter(outlinePointsInches.slice(0, 4));
  const interactionDepthInches = Math.max(
    args.segmentBody.thicknessInches + WALL_OPENING_PLAN_INTERACTION_DEPTH_PADDING_INCHES * 2,
    MIN_WALL_OPENING_PLAN_INTERACTION_DEPTH_INCHES,
  );

  return {
    id: args.opening.id,
    sourceAssemblyId: args.opening.sourceAssemblyId,
    outlinePointsInches,
    interactionCenterInches: outlineCenterInches,
    interactionWidthInches: Math.max(args.opening.widthInches + WALL_OPENING_PLAN_OUTLINE_PADDING_INCHES * 2, 1),
    interactionDepthInches,
    interactionRotationZRadians: Math.atan2(
      faceAxes.faceDirectionInches.yInches,
      faceAxes.faceDirectionInches.xInches,
    ),
  };
}

function getPolygonCenter(pointsInches: readonly Point3DInches[]): Point3DInches {
  const pointCount = Math.max(pointsInches.length, 1);
  const sum = pointsInches.reduce((total, pointInches) => ({
    xInches: total.xInches + pointInches.xInches,
    yInches: total.yInches + pointInches.yInches,
    zInches: total.zInches + pointInches.zInches,
  }), { xInches: 0, yInches: 0, zInches: 0 });

  return {
    xInches: sum.xInches / pointCount,
    yInches: sum.yInches / pointCount,
    zInches: sum.zInches / pointCount,
  };
}

export function isDerivedWallOpeningPlanOutline(
  outline: DerivedWallOpeningPlanOutlineInches | null,
): outline is DerivedWallOpeningPlanOutlineInches {
  return outline !== null;
}
