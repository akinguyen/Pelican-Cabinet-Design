"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import { DoubleSide, Shape, ShapeGeometry } from "three";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { WallElevationViewZone } from "@/engine/walls/wallElevationViewZone";

const VIEW_ZONE_Z_OFFSET_INCHES = 2.4;
const VIEW_ZONE_RENDER_ORDER = 70;
const VIEW_ZONE_FILL_COLOR = "#ef4444";
const VIEW_ZONE_FILL_OPACITY = 0.08;
const VIEW_ZONE_STROKE_COLOR = "#ef4444";
const VIEW_ZONE_STROKE_WIDTH_PIXELS = 2;

export function WallElevationViewZoneOverlay({
  viewZone,
}: Readonly<{
  viewZone: WallElevationViewZone;
}>) {
  const geometry = useMemo(
    () => createViewZoneGeometry(viewZone.floorPlanPolygonInches),
    [viewZone.floorPlanPolygonInches],
  );
  const outlinePoints = createClosedLinePoints(viewZone.floorPlanPolygonInches);
  return (
    <group renderOrder={VIEW_ZONE_RENDER_ORDER}>
      <mesh
        geometry={geometry}
        renderOrder={VIEW_ZONE_RENDER_ORDER}
      >
        <meshBasicMaterial
          color={VIEW_ZONE_FILL_COLOR}
          transparent
          opacity={VIEW_ZONE_FILL_OPACITY}
          side={DoubleSide}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <Line
        points={outlinePoints}
        color={VIEW_ZONE_STROKE_COLOR}
        lineWidth={VIEW_ZONE_STROKE_WIDTH_PIXELS}
        depthTest={false}
        renderOrder={VIEW_ZONE_RENDER_ORDER + 1}
      />
    </group>
  );
}

function createViewZoneGeometry(polygonInches: readonly Point3DInches[]): ShapeGeometry {
  const shape = new Shape();

  polygonInches.forEach((pointInches, pointIndex) => {
    if (pointIndex === 0) {
      shape.moveTo(pointInches.xInches, pointInches.yInches);
      return;
    }

    shape.lineTo(pointInches.xInches, pointInches.yInches);
  });
  shape.closePath();

  const geometry = new ShapeGeometry(shape);
  geometry.translate(0, 0, VIEW_ZONE_Z_OFFSET_INCHES);
  return geometry;
}

function createClosedLinePoints(
  polygonInches: readonly Point3DInches[],
): readonly [number, number, number][] {
  const linePoints = polygonInches.map(toLinePoint);

  if (linePoints.length === 0) {
    return [];
  }

  return [...linePoints, linePoints[0]];
}

function toLinePoint(pointInches: Point3DInches): [number, number, number] {
  return [
    pointInches.xInches,
    pointInches.yInches,
    pointInches.zInches + VIEW_ZONE_Z_OFFSET_INCHES,
  ];
}
