"use client";

import { Html, Line } from "@react-three/drei";
import { memo } from "react";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneEntityWallMeasurementGuide } from "@/engine/scene-entities/measurement/sceneEntityWallMeasurementGuides";
import { formatFeetInchesLabel } from "../../formatting/kitchenEditorLabelFormatting";

const SCENE_ENTITY_WALL_MEASUREMENT_RENDER_Z_OFFSET_INCHES = 0.35;
const SCENE_ENTITY_WALL_MEASUREMENT_RENDER_ORDER = 140;
const SCENE_ENTITY_WALL_MEASUREMENT_STROKE = "#38bdf8";
const SCENE_ENTITY_WALL_MEASUREMENT_DASH_SIZE_INCHES = 3;
const SCENE_ENTITY_WALL_MEASUREMENT_GAP_SIZE_INCHES = 3;

export const SceneEntityWallMeasurementGuides = memo(function SceneEntityWallMeasurementGuides({
  measurementGuides,
}: Readonly<{
  measurementGuides: readonly SceneEntityWallMeasurementGuide[];
}>) {
  if (measurementGuides.length === 0) {
    return null;
  }

  return (
    <group renderOrder={SCENE_ENTITY_WALL_MEASUREMENT_RENDER_ORDER}>
      {measurementGuides.map((measurementGuide) => (
        <group key={measurementGuide.id}>
          <Line
            points={[
              createRenderPoint(measurementGuide.startPointInches),
              createRenderPoint(measurementGuide.endPointInches),
            ]}
            color={SCENE_ENTITY_WALL_MEASUREMENT_STROKE}
            lineWidth={1.25}
            dashed
            dashScale={1}
            dashSize={SCENE_ENTITY_WALL_MEASUREMENT_DASH_SIZE_INCHES}
            gapSize={SCENE_ENTITY_WALL_MEASUREMENT_GAP_SIZE_INCHES}
            depthTest={false}
            depthWrite={false}
            transparent
            renderOrder={SCENE_ENTITY_WALL_MEASUREMENT_RENDER_ORDER}
          />
          <Html
            center
            position={createLabelRenderPoint(measurementGuide.labelPointInches)}
            style={{ pointerEvents: "none", whiteSpace: "nowrap", zIndex: SCENE_ENTITY_WALL_MEASUREMENT_RENDER_ORDER }}
          >
            <div
              className="inline-flex whitespace-nowrap text-[12px] font-bold leading-none text-slate-800"
              style={{
                transform: `rotate(${-measurementGuide.labelRotationDegrees}deg)`,
                transformOrigin: "center",
                textShadow: "0 1px 2px rgba(255,255,255,0.98), 0 -1px 2px rgba(255,255,255,0.98), 1px 0 2px rgba(255,255,255,0.98), -1px 0 2px rgba(255,255,255,0.98)",
              }}
            >
              {formatFeetInchesLabel(measurementGuide.lengthInches)}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
});

function createRenderPoint(pointInches: Point3DInches): [number, number, number] {
  return [pointInches.xInches, pointInches.yInches, getMeasurementZInches(pointInches)];
}

function createLabelRenderPoint(pointInches: Point3DInches): [number, number, number] {
  return [pointInches.xInches, pointInches.yInches, getMeasurementZInches(pointInches) + 0.4];
}

function getMeasurementZInches(pointInches: Point3DInches): number {
  return pointInches.zInches + SCENE_ENTITY_WALL_MEASUREMENT_RENDER_Z_OFFSET_INCHES;
}
