"use client";

import { memo, useMemo } from "react";
import { Line } from "@react-three/drei";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { DerivedWallOpening } from "@/engine/walls/placedWallSegmentTypes";
import type { BuiltWallSegmentBody } from "@/engine/walls/wallSegmentTopologyTypes";
import { buildDerivedWallOpeningPlanMeasurementGuides } from "@/engine/walls/openings/wallOpeningPlanMeasurements";
import { PlanMeasurementLine } from "../shared/PlanMeasurementLine";
import { formatFeetInchesLabel } from "../../shared/formatFeetInchesLabel";
import { wallSegmentRenderColors } from "./wallSegmentRenderColors";

const WALL_OPENING_MEASUREMENT_Z_INCHES = 7.5;
const WALL_OPENING_MEASUREMENT_RENDER_ORDER = 119;
const WALL_OPENING_MEASUREMENT_DASH_SIZE_INCHES = 100000;
const WALL_OPENING_MEASUREMENT_GAP_SIZE_INCHES = 0.001;
const WALL_OPENING_MEASUREMENT_TICK_LENGTH_INCHES = 7;

export const WallOpeningPlanMeasurementGuides = memo(function WallOpeningPlanMeasurementGuides({
  activeSourceAssemblyId,
  derivedWallOpenings,
  segmentBodies,
}: Readonly<{
  activeSourceAssemblyId: string;
  derivedWallOpenings: readonly DerivedWallOpening[];
  segmentBodies: readonly BuiltWallSegmentBody[];
}>) {
  const measurementGuides = useMemo(() => buildDerivedWallOpeningPlanMeasurementGuides({
    activeSourceAssemblyId,
    segmentBodies,
    derivedWallOpenings,
  }), [activeSourceAssemblyId, segmentBodies, derivedWallOpenings]);

  if (measurementGuides.length === 0) {
    return null;
  }

  const boundaryTickPoints = createBoundaryTickPoints(measurementGuides);

  return (
    <group>
      {boundaryTickPoints.map((tickPoints, tickIndex) => (
        <Line
          key={`opening-measurement-tick-${tickIndex}`}
          points={tickPoints}
          color={wallSegmentRenderColors.openingMeasurementStroke}
          lineWidth={1.5}
          depthTest={false}
          renderOrder={WALL_OPENING_MEASUREMENT_RENDER_ORDER + 1}
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
          zInches={WALL_OPENING_MEASUREMENT_Z_INCHES}
          color={wallSegmentRenderColors.openingMeasurementStroke}
          renderOrder={WALL_OPENING_MEASUREMENT_RENDER_ORDER}
          lineWidth={1.5}
          dashSizeInches={WALL_OPENING_MEASUREMENT_DASH_SIZE_INCHES}
          gapSizeInches={WALL_OPENING_MEASUREMENT_GAP_SIZE_INCHES}
        />
      ))}
    </group>
  );
});


type BoundaryPointKey = string;

function createBoundaryTickPoints(
  measurementGuides: ReturnType<typeof buildDerivedWallOpeningPlanMeasurementGuides>,
): readonly [number, number, number][][] {
  const firstGuide = measurementGuides[0];

  if (firstGuide === undefined) {
    return [];
  }

  const lineDirection = getLineDirection(firstGuide.startPointInches, firstGuide.endPointInches);

  if (lineDirection === null) {
    return [];
  }

  const tickNormal = {
    xInches: -lineDirection.yInches,
    yInches: lineDirection.xInches,
  };
  const boundaryPointsByKey = new Map<BoundaryPointKey, Point3DInches>();

  for (const measurementGuide of measurementGuides) {
    boundaryPointsByKey.set(createBoundaryPointKey(measurementGuide.startPointInches), measurementGuide.startPointInches);
    boundaryPointsByKey.set(createBoundaryPointKey(measurementGuide.endPointInches), measurementGuide.endPointInches);
  }

  return Array.from(boundaryPointsByKey.values()).map((boundaryPointInches) => {
    const halfTickLengthInches = WALL_OPENING_MEASUREMENT_TICK_LENGTH_INCHES / 2;

    return [
      [
        boundaryPointInches.xInches - tickNormal.xInches * halfTickLengthInches,
        boundaryPointInches.yInches - tickNormal.yInches * halfTickLengthInches,
        WALL_OPENING_MEASUREMENT_Z_INCHES,
      ],
      [
        boundaryPointInches.xInches + tickNormal.xInches * halfTickLengthInches,
        boundaryPointInches.yInches + tickNormal.yInches * halfTickLengthInches,
        WALL_OPENING_MEASUREMENT_Z_INCHES,
      ],
    ];
  });
}

function getLineDirection(
  startPointInches: Point3DInches,
  endPointInches: Point3DInches,
): Readonly<{ xInches: number; yInches: number }> | null {
  const deltaXInches = endPointInches.xInches - startPointInches.xInches;
  const deltaYInches = endPointInches.yInches - startPointInches.yInches;
  const lengthInches = Math.hypot(deltaXInches, deltaYInches);

  if (lengthInches <= 0.000001) {
    return null;
  }

  return {
    xInches: deltaXInches / lengthInches,
    yInches: deltaYInches / lengthInches,
  };
}

function createBoundaryPointKey(pointInches: Point3DInches): BoundaryPointKey {
  return `${Math.round(pointInches.xInches * 1000) / 1000}:${Math.round(pointInches.yInches * 1000) / 1000}`;
}
