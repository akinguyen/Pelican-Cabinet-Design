"use client";

import { memo, useMemo } from "react";
import { Line } from "@react-three/drei";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import { buildAssemblyWallMeasurementGuides } from "@/engine/assemblies/placement/assemblyWallMeasurementGuides";
import type { AssemblyPlacementFootprint } from "@/engine/assemblies/placement/assemblyPlacementTypes";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import { AssemblyWallMeasurementGuides } from "./AssemblyWallMeasurementGuides";

const GROUP_BOX_Z_INCHES = 8.2;
const GROUP_BOX_RENDER_ORDER = 123;
const GROUP_BOX_STROKE = "#38bdf8";
const GROUP_BOX_DASH_SIZE_INCHES = 4;
const GROUP_BOX_GAP_SIZE_INCHES = 3;

export const SelectedAssembliesGroupMeasurementGuides = memo(function SelectedAssembliesGroupMeasurementGuides({
  bounds,
  placedWallGraphs,
}: Readonly<{
  bounds: readonly SceneEntityBounds[];
  placedWallGraphs: readonly PlacedWallGraph[];
}>) {
  const groupFootprint = useMemo(() => createAxisAlignedGroupFootprint(bounds), [bounds]);
  const measurementGuides = useMemo(() => {
    if (groupFootprint === null) {
      return [];
    }

    return buildAssemblyWallMeasurementGuides({
      footprint: groupFootprint,
      placedWallGraphs,
    });
  }, [groupFootprint, placedWallGraphs]);

  if (groupFootprint === null) {
    return null;
  }

  return (
    <group>
      <Line
        points={[
          createRenderPoint(groupFootprint.cornerPointsInches[0]),
          createRenderPoint(groupFootprint.cornerPointsInches[1]),
          createRenderPoint(groupFootprint.cornerPointsInches[2]),
          createRenderPoint(groupFootprint.cornerPointsInches[3]),
          createRenderPoint(groupFootprint.cornerPointsInches[0]),
        ]}
        color={GROUP_BOX_STROKE}
        lineWidth={1.75}
        dashed
        dashSize={GROUP_BOX_DASH_SIZE_INCHES}
        gapSize={GROUP_BOX_GAP_SIZE_INCHES}
        depthTest={false}
        renderOrder={GROUP_BOX_RENDER_ORDER}
      />
      <AssemblyWallMeasurementGuides measurementGuides={measurementGuides} />
    </group>
  );
});

function createAxisAlignedGroupFootprint(
  bounds: readonly SceneEntityBounds[],
): AssemblyPlacementFootprint | null {
  if (bounds.length <= 1) {
    return null;
  }

  const points = bounds.flatMap((item) => item.footprintCornersInches);

  if (points.length === 0) {
    return null;
  }

  const planBounds = points.reduce((currentBounds, pointInches) => ({
    minXInches: Math.min(currentBounds.minXInches, pointInches.xInches),
    maxXInches: Math.max(currentBounds.maxXInches, pointInches.xInches),
    minYInches: Math.min(currentBounds.minYInches, pointInches.yInches),
    maxYInches: Math.max(currentBounds.maxYInches, pointInches.yInches),
  }), {
    minXInches: Number.POSITIVE_INFINITY,
    maxXInches: Number.NEGATIVE_INFINITY,
    minYInches: Number.POSITIVE_INFINITY,
    maxYInches: Number.NEGATIVE_INFINITY,
  });
  const centerPointInches = createPoint(
    (planBounds.minXInches + planBounds.maxXInches) / 2,
    (planBounds.minYInches + planBounds.maxYInches) / 2,
  );
  const cornerPointsInches = [
    createPoint(planBounds.minXInches, planBounds.minYInches),
    createPoint(planBounds.maxXInches, planBounds.minYInches),
    createPoint(planBounds.maxXInches, planBounds.maxYInches),
    createPoint(planBounds.minXInches, planBounds.maxYInches),
  ];

  return {
    centerPointInches,
    cornerPointsInches,
    edges: cornerPointsInches.map((cornerPointInches, cornerIndex) => {
      const nextCornerPointInches = cornerPointsInches[(cornerIndex + 1) % cornerPointsInches.length];

      return {
        index: cornerIndex,
        startPointInches: cornerPointInches,
        endPointInches: nextCornerPointInches,
        midpointInches: createPoint(
          (cornerPointInches.xInches + nextCornerPointInches.xInches) / 2,
          (cornerPointInches.yInches + nextCornerPointInches.yInches) / 2,
        ),
        lengthInches: Math.hypot(
          nextCornerPointInches.xInches - cornerPointInches.xInches,
          nextCornerPointInches.yInches - cornerPointInches.yInches,
        ),
      };
    }),
  };
}

function createPoint(xInches: number, yInches: number): Point3DInches {
  return { xInches, yInches, zInches: 0 };
}

function createRenderPoint(pointInches: Point3DInches): [number, number, number] {
  return [pointInches.xInches, pointInches.yInches, GROUP_BOX_Z_INCHES];
}
