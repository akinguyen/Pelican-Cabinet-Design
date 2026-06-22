"use client";

import { Html, Line } from "@react-three/drei";
import { memo } from "react";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneEntityWallMeasurementGuide } from "@/engine/scene-entities/spatial-guides/sceneEntitySpatialGuideEngine";
import { formatFeetInchesLabel } from "../../formatting/kitchenEditorLabelFormatting";

const SCENE_ENTITY_WALL_MEASUREMENT_RENDER_Z_OFFSET_INCHES = 0.35;
const SCENE_ENTITY_WALL_MEASUREMENT_RENDER_ORDER = 190;
const SCENE_ENTITY_WALL_MEASUREMENT_STROKE = "#38bdf8";
const SCENE_ENTITY_WALL_MEASUREMENT_DASH_SIZE_INCHES = 3;
const SCENE_ENTITY_WALL_MEASUREMENT_GAP_SIZE_INCHES = 3;

export const SceneEntityWallMeasurementGuides = memo(function SceneEntityWallMeasurementGuides({
  measurementGuides,
  renderLabels = true,
}: Readonly<{
  measurementGuides: readonly SceneEntityWallMeasurementGuide[];
  renderLabels?: boolean;
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
              createRenderPoint(measurementGuide, measurementGuide.startPointInches),
              createRenderPoint(measurementGuide, measurementGuide.endPointInches),
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
          {renderLabels ? (
            <Html
              center
              position={createLabelRenderPoint(measurementGuide, measurementGuide.labelPointInches)}
              zIndexRange={[100000, 0]}
              style={{ pointerEvents: "none", whiteSpace: "nowrap", zIndex: 100000 }}
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
          ) : null}
        </group>
      ))}
    </group>
  );
});

function createRenderPoint(guide: SceneEntityWallMeasurementGuide, pointInches: Point3DInches): [number, number, number] {
  if (guide.renderOffsetMode === "pre-offset") {
    return [pointInches.xInches, pointInches.yInches, pointInches.zInches];
  }

  return [pointInches.xInches, pointInches.yInches, getMeasurementZInches(pointInches)];
}

function createLabelRenderPoint(guide: SceneEntityWallMeasurementGuide, pointInches: Point3DInches): [number, number, number] {
  if (guide.renderOffsetMode === "pre-offset") {
    return [pointInches.xInches, pointInches.yInches, pointInches.zInches];
  }

  return [pointInches.xInches, pointInches.yInches, getMeasurementZInches(pointInches) + 0.4];
}

function getMeasurementZInches(pointInches: Point3DInches): number {
  return pointInches.zInches + SCENE_ENTITY_WALL_MEASUREMENT_RENDER_Z_OFFSET_INCHES;
}
