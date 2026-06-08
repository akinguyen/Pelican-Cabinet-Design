"use client";

import { OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getPlacedWallElevationWallViews } from "@/engine/walls/elevation/wallElevationGeometry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { ElevationCameraControls } from "../elevation/ElevationCameraControls";
import { FloorPlanCameraControls } from "../floor-plan/FloorPlanCameraControls";
import { PerspectiveCameraControls } from "../perspective/PerspectiveCameraControls";
import { PerspectiveViewGizmo } from "../perspective/PerspectiveViewGizmo";
import { SceneAxisGizmo } from "./SceneAxisGizmo";
import { DesignSceneRenderer } from "./DesignSceneRenderer";
import { DesignSceneLighting } from "./DesignSceneLighting";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { GroundGrid } from "./GroundGrid";
import { PlacementSurface } from "./PlacementSurface";
import {
  DEFAULT_FLOOR_PLAN_CAMERA_POSITION_INCHES,
  DEFAULT_FLOOR_PLAN_ZOOM,
  DEFAULT_PERSPECTIVE_CAMERA_POSITION_INCHES,
} from "@/engine/scene/sceneCameraStateTypes";

export function DesignSceneCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const placedWalls = useDesignSceneStore((state) => state.designScene.placedWalls);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const clearSelection = useDesignSceneStore((state) => state.clearSelection);
  const hasElevationViews = getPlacedWallElevationWallViews(placedWalls).length > 0;
  const hasActivePlacementOrDraftTool =
    activeToolbarTool === "draw-wall-footprint" ||
    activeToolbarTool === "split-wall-footprint";
  const cursorClassName = getCanvasCursorClassName(
    activeSceneViewMode,
    activeSceneOperation !== null || hasActivePlacementOrDraftTool,
    activeDrag !== null,
  );

  useSceneViewportGestureGuard(containerRef);

  function handlePointerMissed(event: MouseEvent) {
    if (event.button !== 0) {
      return;
    }

    if (activeSceneOperation !== null || activeToolbarTool !== null || activeDrag !== null) {
      return;
    }

    clearSelection();
  }

  return (
    <div
      ref={containerRef}
      className={`h-full w-full overflow-hidden bg-slate-50 ${cursorClassName}`}
      style={{ touchAction: "none", overscrollBehavior: "contain" }}
    >
      <Canvas onPointerMissed={handlePointerMissed}>
        <color attach="background" args={["#f8fafc"]} />
        {activeSceneViewMode === "perspective" ? <PerspectiveCamera makeDefault position={toCanvasPosition(DEFAULT_PERSPECTIVE_CAMERA_POSITION_INCHES)} fov={45} /> : null}
        {activeSceneViewMode === "floor-plan" ? <OrthographicCamera makeDefault position={toCanvasPosition(DEFAULT_FLOOR_PLAN_CAMERA_POSITION_INCHES)} up={[0, -1, 0]} zoom={DEFAULT_FLOOR_PLAN_ZOOM} /> : null}
        {activeSceneViewMode === "elevation" ? <OrthographicCamera makeDefault position={[0, 360, 36]} zoom={2} /> : null}
        <DesignSceneLighting />
        <GroundGrid />
        {activeSceneViewMode === "perspective" ? <SceneAxisGizmo /> : null}
        {activeSceneViewMode !== "elevation" || hasElevationViews ? <DesignSceneRenderer /> : null}
        <PlacementSurface sceneViewMode={activeSceneViewMode} />
        {activeSceneViewMode === "perspective" ? <PerspectiveCameraControls /> : null}
        {activeSceneViewMode === "floor-plan" ? <FloorPlanCameraControls /> : null}
        {activeSceneViewMode === "elevation" ? <ElevationCameraControls /> : null}
        {activeSceneViewMode === "perspective" ? <PerspectiveViewGizmo /> : null}
      </Canvas>
    </div>
  );
}

function useSceneViewportGestureGuard(containerRef: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const container = containerRef.current;

    if (container === null) {
      return;
    }

    function preventBrowserGesture(event: Event) {
      event.preventDefault();
    }

    container.addEventListener("wheel", preventBrowserGesture, { passive: false });
    container.addEventListener("touchmove", preventBrowserGesture, { passive: false });
    container.addEventListener("gesturestart", preventBrowserGesture, { passive: false });
    container.addEventListener("gesturechange", preventBrowserGesture, { passive: false });

    return () => {
      container.removeEventListener("wheel", preventBrowserGesture);
      container.removeEventListener("touchmove", preventBrowserGesture);
      container.removeEventListener("gesturestart", preventBrowserGesture);
      container.removeEventListener("gesturechange", preventBrowserGesture);
    };
  }, [containerRef]);
}

function getCanvasCursorClassName(
  sceneViewMode: SceneViewMode,
  hasActiveOperation: boolean,
  hasActiveDrag: boolean,
) {
  if (hasActiveDrag) {
    return "cursor-move";
  }

  if (hasActiveOperation) {
    return "cursor-crosshair";
  }

  if (sceneViewMode === "elevation") {
    return "cursor-grab active:cursor-grabbing";
  }

  return "cursor-grab active:cursor-grabbing";
}

function toCanvasPosition(pointInches: Point3DInches): [number, number, number] {
  return [pointInches.xInches, pointInches.yInches, pointInches.zInches];
}
