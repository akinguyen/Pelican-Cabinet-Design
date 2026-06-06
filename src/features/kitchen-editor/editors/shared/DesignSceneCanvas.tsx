"use client";

import { OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { getPlacedWallElevationWallViews } from "@/engine/walls/elevation/wallElevationGeometry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { ElevationCameraControls } from "../elevation/ElevationCameraControls";
import { FloorPlanCameraControls } from "../floor-plan/FloorPlanCameraControls";
import { PerspectiveCameraControls } from "../perspective/PerspectiveCameraControls";
import { PerspectiveViewGizmo } from "../perspective/PerspectiveViewGizmo";
import { SceneAxisGizmo } from "./SceneAxisGizmo";
import { DesignSceneRenderer } from "./DesignSceneRenderer";
import { EditorLighting } from "./EditorLighting";
import type { KitchenEditorView } from "./editorViewTypes";
import { GroundGrid } from "./GroundGrid";
import { PlacementSurface } from "./PlacementSurface";

export function DesignSceneCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeEditorView = useDesignSceneStore((state) => state.activeEditorView);
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
    activeEditorView,
    activeSceneOperation !== null || hasActivePlacementOrDraftTool,
    activeDrag !== null,
  );

  useEditorWorldGestureGuard(containerRef);

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
        {activeEditorView === "perspective" ? <PerspectiveCamera makeDefault position={[96, -144, 96]} fov={45} /> : null}
        {activeEditorView === "floor-plan" ? <OrthographicCamera makeDefault position={[0, 0, 600]} zoom={2} /> : null}
        {activeEditorView === "elevation" ? <OrthographicCamera makeDefault position={[0, 360, 36]} zoom={2} /> : null}
        <EditorLighting />
        <GroundGrid />
        {activeEditorView === "perspective" ? <SceneAxisGizmo /> : null}
        {activeEditorView !== "elevation" || hasElevationViews ? <DesignSceneRenderer /> : null}
        <PlacementSurface editorView={activeEditorView} />
        {activeEditorView === "perspective" ? <PerspectiveCameraControls /> : null}
        {activeEditorView === "floor-plan" ? <FloorPlanCameraControls /> : null}
        {activeEditorView === "elevation" ? <ElevationCameraControls /> : null}
        {activeEditorView === "perspective" ? <PerspectiveViewGizmo /> : null}
      </Canvas>
    </div>
  );
}

function useEditorWorldGestureGuard(containerRef: RefObject<HTMLDivElement | null>): void {
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
  editorView: KitchenEditorView,
  hasActiveOperation: boolean,
  hasActiveDrag: boolean,
) {
  if (hasActiveDrag) {
    return "cursor-move";
  }

  if (hasActiveOperation) {
    return "cursor-crosshair";
  }

  if (editorView === "elevation") {
    return "cursor-grab active:cursor-grabbing";
  }

  return "cursor-grab active:cursor-grabbing";
}
