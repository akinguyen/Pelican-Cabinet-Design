"use client";

import { memo } from "react";
import { Line } from "@react-three/drei";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";

const DEFAULT_SCENE_ENTITY_FOOTPRINT_BOX_Z_INCHES = 7;

export type SceneEntityFootprintBoundingBoxState = "default" | "moving" | "invalid";

type SceneEntityFootprintBoundingBoxProps = Readonly<{
  bounds: SceneEntityBounds;
  state: SceneEntityFootprintBoundingBoxState;
  zInches?: number;
}>;

export const SceneEntityFootprintBoundingBox = memo(function SceneEntityFootprintBoundingBox({
  bounds,
  state,
  zInches = DEFAULT_SCENE_ENTITY_FOOTPRINT_BOX_Z_INCHES,
}: SceneEntityFootprintBoundingBoxProps) {
  const colorHex = state === "invalid" ? "#ef4444" : "#0ea5e9";
  const cornerPoints = bounds.footprintCornersInches;

  return (
    <group renderOrder={120}>
      <Line
        points={[
          [cornerPoints[0].xInches, cornerPoints[0].yInches, zInches],
          [cornerPoints[1].xInches, cornerPoints[1].yInches, zInches],
          [cornerPoints[2].xInches, cornerPoints[2].yInches, zInches],
          [cornerPoints[3].xInches, cornerPoints[3].yInches, zInches],
          [cornerPoints[0].xInches, cornerPoints[0].yInches, zInches],
        ]}
        color={colorHex}
        lineWidth={2}
        depthTest={false}
        renderOrder={120}
      />
      {cornerPoints.map((cornerPointInches, cornerIndex) => (
        <mesh
          key={`corner-${cornerIndex}`}
          position={[cornerPointInches.xInches, cornerPointInches.yInches, zInches + 0.1]}
          renderOrder={121}
        >
          <circleGeometry args={[1.5, 20]} />
          <meshBasicMaterial color={colorHex} depthTest={false} />
        </mesh>
      ))}
    </group>
  );
});
