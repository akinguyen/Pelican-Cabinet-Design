"use client";

import { memo } from "react";

export const EditorLighting = memo(function EditorLighting() {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[60, -80, 120]} intensity={0.8} />
      <directionalLight position={[-60, 80, 120]} intensity={0.35} />
    </>
  );
});
