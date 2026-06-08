"use client";

import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { OrthographicCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { OrthographicCameraState } from "@/engine/scene/sceneCameraStateTypes";
import {
  applyOrthographicCameraState,
  readOrthographicCameraState,
  updateOrthographicCameraZoom,
} from "../shared/camera/orthographicCameraControls";
import {
  ORTHOGRAPHIC_CAMERA_DAMPING_FACTOR,
  ORTHOGRAPHIC_CAMERA_PAN_SPEED,
  ORTHOGRAPHIC_CAMERA_TOOLBAR_ZOOM_SCALE,
  ORTHOGRAPHIC_CAMERA_ZOOM_SPEED,
  SCENE_CAMERA_MOUSE_BUTTONS,
  SCENE_CAMERA_TOUCHES,
} from "../shared/camera/sceneCameraControlSettings";
import { useSceneFitFrame } from "../shared/camera/useSceneFitFrame";

const MIN_FLOOR_PLAN_ZOOM = 1.15;
const MAX_FLOOR_PLAN_ZOOM = 12;
const FLOOR_PLAN_CAMERA_Z_INCHES = 600;
const MIN_FLOOR_PLAN_FIT_ZOOM = 1.8;
const FLOOR_PLAN_FIT_ZOOM_FRAME_INCHES = 290;

const FLOOR_PLAN_CAMERA_UP_VECTOR = {
  x: 0,
  y: -1,
  z: 0,
} as const;

const FLOOR_PLAN_ZOOM_RANGE = {
  minZoom: MIN_FLOOR_PLAN_ZOOM,
  maxZoom: MAX_FLOOR_PLAN_ZOOM,
} as const;

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
      updateFloorPlanZoom(camera as OrthographicCamera, camera.zoom * ORTHOGRAPHIC_CAMERA_TOOLBAR_ZOOM_SCALE);
    } else if (cameraCommand.tool === "zoom-out") {
      updateFloorPlanZoom(camera as OrthographicCamera, camera.zoom / ORTHOGRAPHIC_CAMERA_TOOLBAR_ZOOM_SCALE);
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
      dampingFactor={ORTHOGRAPHIC_CAMERA_DAMPING_FACTOR}
      minZoom={MIN_FLOOR_PLAN_ZOOM}
      maxZoom={MAX_FLOOR_PLAN_ZOOM}
      zoomSpeed={ORTHOGRAPHIC_CAMERA_ZOOM_SPEED}
      panSpeed={ORTHOGRAPHIC_CAMERA_PAN_SPEED}
      screenSpacePanning
      mouseButtons={SCENE_CAMERA_MOUSE_BUTTONS}
      touches={SCENE_CAMERA_TOUCHES}
      onChange={handleControlsChange}
    />
  );
}

function applyFloorPlanCameraState(
  camera: OrthographicCamera,
  controls: OrbitControlsImpl | null,
  cameraState: OrthographicCameraState,
): void {
  applyOrthographicCameraState({
    camera,
    controls,
    cameraState,
    cameraUpVector: FLOOR_PLAN_CAMERA_UP_VECTOR,
    zoomRange: FLOOR_PLAN_ZOOM_RANGE,
  });
}

function readFloorPlanCameraState(
  camera: OrthographicCamera,
  controls: OrbitControlsImpl,
): OrthographicCameraState {
  return readOrthographicCameraState(camera, controls);
}

function fitFloorPlanCameraToScene(
  camera: OrthographicCamera,
  controls: OrbitControlsImpl,
  sceneFitFrame: ReturnType<typeof useSceneFitFrame>,
): void {
  const { centerInches, sizeInches } = sceneFitFrame;

  camera.position.set(centerInches.xInches, centerInches.yInches, centerInches.zInches + FLOOR_PLAN_CAMERA_Z_INCHES);
  updateFloorPlanZoom(camera, Math.max(MIN_FLOOR_PLAN_FIT_ZOOM, FLOOR_PLAN_FIT_ZOOM_FRAME_INCHES / sizeInches));
  controls.target.set(centerInches.xInches, centerInches.yInches, centerInches.zInches);
  controls.update();
}

function updateFloorPlanZoom(camera: OrthographicCamera, zoom: number): void {
  updateOrthographicCameraZoom({
    camera,
    zoom,
    zoomRange: FLOOR_PLAN_ZOOM_RANGE,
  });
}
