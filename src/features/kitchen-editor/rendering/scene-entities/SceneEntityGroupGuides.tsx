"use client";

import { memo, useMemo } from "react";
import { Line } from "@react-three/drei";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import { buildSceneEntityWallMeasurementGuidesFromFootprint } from "@/engine/scene-entities/measurement/sceneEntityWallMeasurementGuides";
import { createSceneEntityGroupFootprint } from "@/engine/scene-entities/sceneEntityGroupGeometry";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import { SceneEntityWallMeasurementGuides } from "./SceneEntityWallMeasurementGuides";

const GROUP_BOX_Z_INCHES = 8.2;
const GROUP_BOX_RENDER_ORDER = 123;
const GROUP_BOX_STROKE = "#38bdf8";
const GROUP_BOX_DASH_SIZE_INCHES = 4;
const GROUP_BOX_GAP_SIZE_INCHES = 3;

export const SceneEntityGroupGuides = memo(function SceneEntityGroupGuides({
  bounds,
  placedWallGraphs,
}: Readonly<{
  bounds: readonly SceneEntityBounds[];
  placedWallGraphs: readonly PlacedWallGraph[];
}>) {
  const groupFootprint = useMemo(() => createSceneEntityGroupFootprint(bounds), [bounds]);
  const measurementGuides = useMemo(() => {
    if (groupFootprint === null) {
      return [];
    }

    return buildSceneEntityWallMeasurementGuidesFromFootprint({
      footprint: groupFootprint,
      placedWallGraphs,
      sourceId: createGroupMeasurementSourceId(bounds),
    });
  }, [bounds, groupFootprint, placedWallGraphs]);

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
      <SceneEntityWallMeasurementGuides measurementGuides={measurementGuides} />
    </group>
  );
});

function createRenderPoint(pointInches: Point3DInches): [number, number, number] {
  return [pointInches.xInches, pointInches.yInches, GROUP_BOX_Z_INCHES];
}


function createGroupMeasurementSourceId(bounds: readonly SceneEntityBounds[]): string {
  return [
    "scene-entity-group",
    ...bounds.map((entityBounds) => `${entityBounds.entityKind}:${entityBounds.entityId}`).sort(),
  ].join(":");
}
