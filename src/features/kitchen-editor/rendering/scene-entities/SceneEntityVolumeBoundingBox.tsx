"use client";

import { memo } from "react";
import { Line } from "@react-three/drei";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";

export type SceneEntityVolumeBoundingBoxState = "default" | "moving" | "invalid";

type SceneEntityVolumeBoundingBoxProps = Readonly<{
  bounds: SceneEntityBounds;
  state: SceneEntityVolumeBoundingBoxState;
}>;

export const SceneEntityVolumeBoundingBox = memo(function SceneEntityVolumeBoundingBox({
  bounds,
  state,
}: SceneEntityVolumeBoundingBoxProps) {
  const colorHex = state === "invalid" ? "#ef4444" : "#0ea5e9";
  const bottomCorners = bounds.footprintCornersInches.map((cornerPointInches) => ({
    ...cornerPointInches,
    zInches: bounds.heightRangeInches.minZInches,
  }));
  const topCorners = bounds.topCornersInches;
  const edgeLines = [
    ...createClosedCornerLoop(bottomCorners),
    ...createClosedCornerLoop(topCorners),
    ...bottomCorners.map((cornerPointInches, cornerIndex) => [cornerPointInches, topCorners[cornerIndex]] as const),
  ];

  return (
    <group renderOrder={122}>
      {edgeLines.map((edgeLine, edgeIndex) => (
        <Line
          key={`volume-edge-${edgeIndex}`}
          points={edgeLine.map((pointInches) => [pointInches.xInches, pointInches.yInches, pointInches.zInches])}
          color={colorHex}
          lineWidth={2}
          depthTest={false}
          renderOrder={122}
        />
      ))}
      {topCorners.map((cornerPointInches, cornerIndex) => (
        <mesh
          key={`top-corner-${cornerIndex}`}
          position={[cornerPointInches.xInches, cornerPointInches.yInches, cornerPointInches.zInches + 0.15]}
          renderOrder={123}
        >
          <sphereGeometry args={[1.5, 16, 12]} />
          <meshBasicMaterial color={colorHex} depthTest={false} />
        </mesh>
      ))}
    </group>
  );
});

function createClosedCornerLoop<T>(cornerPoints: readonly T[]): readonly (readonly [T, T])[] {
  return cornerPoints.map((cornerPoint, cornerIndex) => [
    cornerPoint,
    cornerPoints[(cornerIndex + 1) % cornerPoints.length],
  ] as const);
}
