"use client";

export function DesignSceneLighting() {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[60, -80, 120]} intensity={0.8} />
      <directionalLight position={[-60, 80, 120]} intensity={0.35} />
    </>
  );
}
