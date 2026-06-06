"use client";

import type { Bounds3DInches } from "@/core/geometry/boxBounds";

type SelectedAssemblyOutlineMeshProps = Readonly<{
  boundsInches: Bounds3DInches;
}>;

export function SelectedAssemblyOutlineMesh({ boundsInches }: SelectedAssemblyOutlineMeshProps) {
  const centerXInches = (boundsInches.minInches.xInches + boundsInches.maxInches.xInches) / 2;
  const centerYInches = (boundsInches.minInches.yInches + boundsInches.maxInches.yInches) / 2;
  const centerZInches = (boundsInches.minInches.zInches + boundsInches.maxInches.zInches) / 2;
  const widthInches = boundsInches.maxInches.xInches - boundsInches.minInches.xInches;
  const depthInches = boundsInches.maxInches.yInches - boundsInches.minInches.yInches;
  const heightInches = boundsInches.maxInches.zInches - boundsInches.minInches.zInches;

  return (
    <mesh position={[centerXInches, centerYInches, centerZInches]} renderOrder={20}>
      <boxGeometry args={[widthInches + 1, depthInches + 1, heightInches + 1]} />
      <meshBasicMaterial color="#2563eb" wireframe transparent opacity={0.95} depthTest={false} />
    </mesh>
  );
}
