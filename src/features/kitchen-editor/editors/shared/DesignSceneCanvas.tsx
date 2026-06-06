"use client";

import { OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { ElevationCameraControls } from "../elevation/ElevationCameraControls";
import { FloorPlanCameraControls } from "../floor-plan/FloorPlanCameraControls";
import { PerspectiveCameraControls } from "../perspective/PerspectiveCameraControls";
import { SceneAxisGizmo } from "./SceneAxisGizmo";
import { DesignSceneRenderer } from "./DesignSceneRenderer";
import { EditorLighting } from "./EditorLighting";
import type { KitchenEditorView } from "./editorViewTypes";
import { GroundGrid } from "./GroundGrid";
import { PlacementSurface } from "./PlacementSurface";

export function DesignSceneCanvas() {
  const activeEditorView = useDesignSceneStore((state) => state.activeEditorView);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const hasActivePlacementOrDraftTool =
    activeToolbarTool === "draw-wall-footprint" ||
    activeToolbarTool === "split-wall-footprint";
  const cursorClassName = getCanvasCursorClassName(
    activeEditorView,
    activeSceneOperation !== null || hasActivePlacementOrDraftTool,
    activeDrag !== null,
  );

  return (
    <div className={`h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-950 ${cursorClassName}`}>
      <Canvas>
        <color attach="background" args={["#f8fafc"]} />
        <PerspectiveCamera makeDefault={activeEditorView === "perspective"} position={[96, -144, 96]} fov={45} />
        <OrthographicCamera makeDefault={activeEditorView === "floor-plan"} position={[0, 0, 600]} zoom={2} />
        <OrthographicCamera makeDefault={activeEditorView === "elevation"} position={[0, 360, 36]} zoom={2} />
        <EditorLighting />
        <GroundGrid />
        {activeEditorView === "perspective" ? <SceneAxisGizmo /> : null}
        <DesignSceneRenderer />
        <PlacementSurface editorView={activeEditorView} />
        {activeEditorView === "perspective" ? <PerspectiveCameraControls /> : null}
        {activeEditorView === "floor-plan" ? <FloorPlanCameraControls /> : null}
        {activeEditorView === "elevation" ? <ElevationCameraControls /> : null}
      </Canvas>
    </div>
  );
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
    return "cursor-default";
  }

  return "cursor-grab active:cursor-grabbing";
}
