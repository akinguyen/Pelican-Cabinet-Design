"use client";

import { WallElevationFaceNavigator } from "./elevation/WallElevationFaceNavigator";
import { DesignSceneCanvas } from "./shared/scene-canvas/DesignSceneCanvas";

export function DesignSceneViewport() {
  return (
    <div className="relative h-full min-h-0">
      <DesignSceneCanvas />
      <WallElevationFaceNavigator />
    </div>
  );
}
