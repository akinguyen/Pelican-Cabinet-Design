"use client";

import { WallElevationEdgeNavigator } from "./elevation/WallElevationEdgeNavigator";
import { DesignSceneCanvas } from "./shared/DesignSceneCanvas";

export function EditorViewSwitcher() {
  return (
    <div className="relative h-full min-h-0">
      <DesignSceneCanvas />
      <WallElevationEdgeNavigator />
    </div>
  );
}
