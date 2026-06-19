"use client";

import { memo, useMemo } from "react";
import { Line } from "@react-three/drei";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/connectedWallGeometryTypes";
import { PlanMeasurementLine } from "../shared/PlanMeasurementLine";
import { formatFeetInchesLabel } from "../../formatting/kitchenEditorLabelFormatting";
import { getPlanDistanceInches } from "@/core/geometry/planPointGeometry";
import {
  DEFAULT_PLAN_DIRECTION,
  getNormalizedPlanDirection,
  getPlanAngleDegrees,
  getPlanMidpoint,
  getReadablePlanLabelRotationDegrees,
  offsetPlanPoint,
  type PlanDirection,
} from "./guides/wallPlanGuideGeometry";
import { wallSegmentRenderColors } from "./wallSegmentRenderColors";

const WALL_PLAN_MEASUREMENT_Z_INCHES = 1.2;
const WALL_PLAN_MEASUREMENT_OFFSET_INCHES = 4;
const MIN_WALL_PLAN_MEASUREMENT_LENGTH_INCHES = 6;
const WALL_PLAN_MEASUREMENT_DASH_SIZE_INCHES = 3;
const WALL_PLAN_MEASUREMENT_GAP_SIZE_INCHES = 3;
const WALL_PLAN_MEASUREMENT_RENDER_ORDER = 95;

type WallPlanMeasurementGuide = Readonly<{
  id: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  labelPointInches: Point3DInches;
  lengthInches: number;
  labelRotationDegrees: number;
}>;

type WallPlanMeasurementConnector = Readonly<{
  id: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
}>;

export const WallPlanMeasurementGuides = memo(function WallPlanMeasurementGuides({
  segmentBodies,
}: Readonly<{
  segmentBodies: readonly BuiltWallSegmentBody[];
}>) {
  const measurementGuides = useMemo(
    () => segmentBodies.flatMap(createWallPlanMeasurementGuides),
    [segmentBodies],
  );
  const measurementConnectors = useMemo(
    () => segmentBodies.flatMap(createWallPlanMeasurementConnectors),
    [segmentBodies],
  );

  return (
    <group>
      {measurementConnectors.map((measurementConnector) => (
        <Line
          key={measurementConnector.id}
          points={[
            [measurementConnector.startPointInches.xInches, measurementConnector.startPointInches.yInches, WALL_PLAN_MEASUREMENT_Z_INCHES],
            [measurementConnector.endPointInches.xInches, measurementConnector.endPointInches.yInches, WALL_PLAN_MEASUREMENT_Z_INCHES],
          ]}
          color={wallSegmentRenderColors.planMeasurementStroke}
          lineWidth={1}
          dashed
          dashScale={1}
          dashSize={WALL_PLAN_MEASUREMENT_DASH_SIZE_INCHES}
          gapSize={WALL_PLAN_MEASUREMENT_GAP_SIZE_INCHES}
          depthTest={false}
          renderOrder={WALL_PLAN_MEASUREMENT_RENDER_ORDER}
        />
      ))}
      {measurementGuides.map((measurementGuide) => (
        <PlanMeasurementLine
          key={measurementGuide.id}
          startPointInches={measurementGuide.startPointInches}
          endPointInches={measurementGuide.endPointInches}
          labelPointInches={measurementGuide.labelPointInches}
          label={formatFeetInchesLabel(measurementGuide.lengthInches)}
          labelRotationDegrees={measurementGuide.labelRotationDegrees}
          zInches={WALL_PLAN_MEASUREMENT_Z_INCHES}
          color={wallSegmentRenderColors.planMeasurementStroke}
          renderOrder={WALL_PLAN_MEASUREMENT_RENDER_ORDER}
          dashSizeInches={WALL_PLAN_MEASUREMENT_DASH_SIZE_INCHES}
          gapSizeInches={WALL_PLAN_MEASUREMENT_GAP_SIZE_INCHES}
        />
      ))}
    </group>
  );
});

function createWallPlanMeasurementGuides(segmentBody: BuiltWallSegmentBody): readonly WallPlanMeasurementGuide[] {
  return [
    createWallPlanMeasurementGuide({
      id: `${segmentBody.id}-side-a-plan-measurement`,
      startPointInches: segmentBody.start.sideAPointInches,
      endPointInches: segmentBody.end.sideAPointInches,
      offsetDirection: getSegmentSideNormal(segmentBody, "side-a"),
    }),
    createWallPlanMeasurementGuide({
      id: `${segmentBody.id}-side-b-plan-measurement`,
      startPointInches: segmentBody.start.sideBPointInches,
      endPointInches: segmentBody.end.sideBPointInches,
      offsetDirection: getSegmentSideNormal(segmentBody, "side-b"),
    }),
  ].filter(isWallPlanMeasurementGuide);
}

function createWallPlanMeasurementConnectors(segmentBody: BuiltWallSegmentBody): readonly WallPlanMeasurementConnector[] {
  const sideANormal = getSegmentSideNormal(segmentBody, "side-a");
  const sideBNormal = getSegmentSideNormal(segmentBody, "side-b");

  return [
    {
      id: `${segmentBody.id}-start-plan-measurement-connector`,
      startPointInches: offsetWallPlanMeasurementPoint(segmentBody.start.sideAPointInches, sideANormal),
      endPointInches: offsetWallPlanMeasurementPoint(segmentBody.start.sideBPointInches, sideBNormal),
    },
    {
      id: `${segmentBody.id}-end-plan-measurement-connector`,
      startPointInches: offsetWallPlanMeasurementPoint(segmentBody.end.sideAPointInches, sideANormal),
      endPointInches: offsetWallPlanMeasurementPoint(segmentBody.end.sideBPointInches, sideBNormal),
    },
  ];
}

function createWallPlanMeasurementGuide(args: {
  id: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  offsetDirection: PlanDirection;
}): WallPlanMeasurementGuide | null {
  const lengthInches = getPlanDistanceInches(args.startPointInches, args.endPointInches);

  if (lengthInches < MIN_WALL_PLAN_MEASUREMENT_LENGTH_INCHES) {
    return null;
  }

  const startPointInches = offsetWallPlanMeasurementPoint(args.startPointInches, args.offsetDirection);
  const endPointInches = offsetWallPlanMeasurementPoint(args.endPointInches, args.offsetDirection);
  const labelPointInches = getPlanMidpoint(startPointInches, endPointInches);

  return {
    id: args.id,
    startPointInches,
    endPointInches,
    labelPointInches,
    lengthInches,
    labelRotationDegrees: getReadablePlanLabelRotationDegrees(getPlanAngleDegrees(startPointInches, endPointInches)),
  };
}

function getSegmentSideNormal(
  segmentBody: BuiltWallSegmentBody,
  side: "side-a" | "side-b",
): PlanDirection {
  const direction = getNormalizedPlanDirection(
    segmentBody.start.centerPointInches,
    segmentBody.end.centerPointInches,
  ) ?? DEFAULT_PLAN_DIRECTION;
  const sideANormal = {
    xInches: -direction.yInches,
    yInches: direction.xInches,
  };

  if (side === "side-a") {
    return sideANormal;
  }

  return {
    xInches: -sideANormal.xInches,
    yInches: -sideANormal.yInches,
  };
}

function offsetWallPlanMeasurementPoint(pointInches: Point3DInches, direction: PlanDirection): Point3DInches {
  return offsetPlanPoint(pointInches, direction, WALL_PLAN_MEASUREMENT_OFFSET_INCHES);
}

function isWallPlanMeasurementGuide(
  measurementGuide: WallPlanMeasurementGuide | null,
): measurementGuide is WallPlanMeasurementGuide {
  return measurementGuide !== null;
}
