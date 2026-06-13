"use client";

import { Line } from "@react-three/drei";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/wallSegmentTopologyTypes";
import { PlanMeasurementLine } from "../shared/PlanMeasurementLine";
import { formatFeetInchesLabel } from "../../shared/formatFeetInchesLabel";
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

export function WallPlanMeasurementGuides({
  segmentBodies,
}: Readonly<{
  segmentBodies: readonly BuiltWallSegmentBody[];
}>) {
  const measurementGuides = segmentBodies.flatMap(createWallPlanMeasurementGuides);
  const measurementConnectors = segmentBodies.flatMap(createWallPlanMeasurementConnectors);

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
}

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
      startPointInches: offsetPlanPoint(segmentBody.start.sideAPointInches, sideANormal),
      endPointInches: offsetPlanPoint(segmentBody.start.sideBPointInches, sideBNormal),
    },
    {
      id: `${segmentBody.id}-end-plan-measurement-connector`,
      startPointInches: offsetPlanPoint(segmentBody.end.sideAPointInches, sideANormal),
      endPointInches: offsetPlanPoint(segmentBody.end.sideBPointInches, sideBNormal),
    },
  ];
}

function createWallPlanMeasurementGuide(args: {
  id: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  offsetDirection: Readonly<{ xInches: number; yInches: number }>;
}): WallPlanMeasurementGuide | null {
  const lengthInches = Math.hypot(
    args.endPointInches.xInches - args.startPointInches.xInches,
    args.endPointInches.yInches - args.startPointInches.yInches,
  );

  if (lengthInches < MIN_WALL_PLAN_MEASUREMENT_LENGTH_INCHES) {
    return null;
  }

  const startPointInches = offsetPlanPoint(args.startPointInches, args.offsetDirection);
  const endPointInches = offsetPlanPoint(args.endPointInches, args.offsetDirection);
  const labelPointInches = getMidpoint(startPointInches, endPointInches);

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
): Readonly<{ xInches: number; yInches: number }> {
  const direction = getNormalizedPlanDirection(
    segmentBody.start.centerPointInches,
    segmentBody.end.centerPointInches,
  );
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

function getNormalizedPlanDirection(
  startPointInches: Point3DInches,
  endPointInches: Point3DInches,
): Readonly<{ xInches: number; yInches: number }> {
  const deltaXInches = endPointInches.xInches - startPointInches.xInches;
  const deltaYInches = endPointInches.yInches - startPointInches.yInches;
  const lengthInches = Math.hypot(deltaXInches, deltaYInches);

  if (lengthInches <= 0.000001) {
    return { xInches: 1, yInches: 0 };
  }

  return {
    xInches: deltaXInches / lengthInches,
    yInches: deltaYInches / lengthInches,
  };
}

function offsetPlanPoint(
  pointInches: Point3DInches,
  direction: Readonly<{ xInches: number; yInches: number }>,
): Point3DInches {
  return {
    xInches: pointInches.xInches + direction.xInches * WALL_PLAN_MEASUREMENT_OFFSET_INCHES,
    yInches: pointInches.yInches + direction.yInches * WALL_PLAN_MEASUREMENT_OFFSET_INCHES,
    zInches: pointInches.zInches,
  };
}

function getMidpoint(firstPointInches: Point3DInches, secondPointInches: Point3DInches): Point3DInches {
  return {
    xInches: (firstPointInches.xInches + secondPointInches.xInches) / 2,
    yInches: (firstPointInches.yInches + secondPointInches.yInches) / 2,
    zInches: (firstPointInches.zInches + secondPointInches.zInches) / 2,
  };
}

function getPlanAngleDegrees(startPointInches: Point3DInches, endPointInches: Point3DInches): number {
  return (Math.atan2(
    endPointInches.yInches - startPointInches.yInches,
    endPointInches.xInches - startPointInches.xInches,
  ) * 180) / Math.PI;
}

function getReadablePlanLabelRotationDegrees(rotationDegrees: number): number {
  let normalizedDegrees = ((rotationDegrees % 360) + 360) % 360;

  if (normalizedDegrees > 90 && normalizedDegrees <= 270) {
    normalizedDegrees += 180;
  }

  normalizedDegrees = ((normalizedDegrees % 360) + 360) % 360;

  return normalizedDegrees > 180 ? normalizedDegrees - 360 : normalizedDegrees;
}

function isWallPlanMeasurementGuide(
  measurementGuide: WallPlanMeasurementGuide | null,
): measurementGuide is WallPlanMeasurementGuide {
  return measurementGuide !== null;
}
