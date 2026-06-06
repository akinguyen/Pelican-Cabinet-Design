"use client";

import { Grid } from "@react-three/drei";

const GRID_SIZE_INCHES = 800;
const MINOR_GRID_SPACING_INCHES = 1;
const MAJOR_GRID_SPACING_INCHES = 10;

export function GroundGrid() {
  return (
    <Grid
      args={[GRID_SIZE_INCHES, GRID_SIZE_INCHES]}
      cellSize={MINOR_GRID_SPACING_INCHES}
      sectionSize={MAJOR_GRID_SPACING_INCHES}
      cellThickness={0.18}
      sectionThickness={0.75}
      cellColor="#e8edf3"
      sectionColor="#cbd5e1"
      fadeDistance={GRID_SIZE_INCHES / 2}
      fadeStrength={0.35}
      infiniteGrid={false}
      position={[0, 0, -0.01]}
      rotation={[Math.PI / 2, 0, 0]}
    />
  );
}
