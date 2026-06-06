"use client";

import { GizmoHelper, GizmoViewport } from "@react-three/drei";

export function PerspectiveViewGizmo() {
  return (
    <GizmoHelper alignment="top-right" margin={[80, 80]}>
      <GizmoViewport
        axisColors={["#ef4444", "#22c55e", "#3b82f6"]}
        labelColor="#111827"
      />
    </GizmoHelper>
  );
}
