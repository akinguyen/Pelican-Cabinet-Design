"use client";

import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MOUSE, TOUCH } from "three";
import type { OrthographicCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { OrthographicCameraState } from "../shared/sceneCameraStateTypes";
import { useSceneFitFrame } from "../shared/useSceneFitFrame";

const MIN_FLOOR_PLAN_ZOOM = 1.15;
const MAX_FLOOR_PLAN_ZOOM = 12;
const TOOLBAR_ZOOM_SCALE = 1.16;
const FLOOR_PLAN_CAMERA_Z_INCHES = 600;

export function FloorPlanCameraControls() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const cameraCommand = useDesignSceneStore((state) => state.cameraCommand);
  const cameraState = useDesignSceneStore((state) => state.sceneCameraStates.floorPlan);
  const updateFloorPlanCameraState = useDesignSceneStore((state) => state.updateFloorPlanCameraState);
  const clearCameraCommand = useDesignSceneStore((state) => state.clearCameraCommand);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const sceneFitFrame = useSceneFitFrame();

  useEffect(() => {
    applyFloorPlanCameraState(camera as OrthographicCamera, controlsRef.current, cameraState);
  }, [camera]);

  useEffect(() => {
    if (cameraCommand === null || cameraCommand.sceneViewMode !== "floor-plan") {
      return;
    }

    const controls = controlsRef.current;

    if (controls === null) {
      return;
    }

    if (cameraCommand.tool === "zoom-in") {
      updateFloorPlanZoom(camera as OrthographicCamera, camera.zoom * TOOLBAR_ZOOM_SCALE);
    } else if (cameraCommand.tool === "zoom-out") {
      updateFloorPlanZoom(camera as OrthographicCamera, camera.zoom / TOOLBAR_ZOOM_SCALE);
    } else {
      fitFloorPlanCameraToScene(camera as OrthographicCamera, controls, sceneFitFrame);
    }

    updateFloorPlanCameraState(readFloorPlanCameraState(camera as OrthographicCamera, controls));
    clearCameraCommand(cameraCommand.id);
  }, [camera, cameraCommand, clearCameraCommand, sceneFitFrame, updateFloorPlanCameraState]);

  function handleControlsChange() {
    const controls = controlsRef.current;

    if (controls === null) {
      return;
    }

    updateFloorPlanCameraState(readFloorPlanCameraState(camera as OrthographicCamera, controls));
  }

  const isEditorOperationActive = activeSceneOperation !== null || activeToolbarTool !== null;

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={activeDrag === null}
      makeDefault
      enableRotate={false}
      enablePan={!isEditorOperationActive}
      enableZoom
      enableDamping
      dampingFactor={0.08}
      minZoom={MIN_FLOOR_PLAN_ZOOM}
      maxZoom={MAX_FLOOR_PLAN_ZOOM}
      zoomSpeed={0.45}
      panSpeed={1}
      screenSpacePanning
      mouseButtons={{
        LEFT: MOUSE.PAN,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: MOUSE.PAN,
      }}
      touches={{
        ONE: TOUCH.PAN,
        TWO: TOUCH.DOLLY_PAN,
      }}
      onChange={handleControlsChange}
    />
  );
}

function applyFloorPlanCameraState(
  camera: OrthographicCamera,
  controls: OrbitControlsImpl | null,
  cameraState: OrthographicCameraState,
): void {
  camera.up.set(0, 1, 0);
  camera.position.set(
    cameraState.cameraPositionInches.xInches,
    cameraState.cameraPositionInches.yInches,
    cameraState.cameraPositionInches.zInches,
  );
  updateFloorPlanZoom(camera, cameraState.zoom);
  controls?.target.set(
    cameraState.cameraTargetInches.xInches,
    cameraState.cameraTargetInches.yInches,
    cameraState.cameraTargetInches.zInches,
  );
  controls?.update();
}

function readFloorPlanCameraState(
  camera: OrthographicCamera,
  controls: OrbitControlsImpl,
): OrthographicCameraState {
  return {
    cameraPositionInches: {
      xInches: camera.position.x,
      yInches: camera.position.y,
      zInches: camera.position.z,
    },
    cameraTargetInches: {
      xInches: controls.target.x,
      yInches: controls.target.y,
      zInches: controls.target.z,
    },
    zoom: camera.zoom,
  };
}

function fitFloorPlanCameraToScene(
  camera: OrthographicCamera,
  controls: OrbitControlsImpl,
  sceneFitFrame: ReturnType<typeof useSceneFitFrame>,
): void {
  const { centerInches, sizeInches } = sceneFitFrame;

  camera.position.set(centerInches.xInches, centerInches.yInches, centerInches.zInches + FLOOR_PLAN_CAMERA_Z_INCHES);
  updateFloorPlanZoom(camera, Math.max(1.4, 220 / sizeInches));
  controls.target.set(centerInches.xInches, centerInches.yInches, centerInches.zInches);
  controls.update();
}

function updateFloorPlanZoom(camera: OrthographicCamera, zoom: number) {
  camera.zoom = Math.min(Math.max(zoom, MIN_FLOOR_PLAN_ZOOM), MAX_FLOOR_PLAN_ZOOM);
  camera.updateProjectionMatrix();
}
