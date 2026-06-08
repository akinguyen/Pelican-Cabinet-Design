"use client";

import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MOUSE, TOUCH } from "three";
import type { PerspectiveCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { PerspectiveCameraState } from "../shared/sceneCameraStateTypes";
import { useSceneFitFrame } from "../shared/useSceneFitFrame";

const MIN_CAMERA_DISTANCE_INCHES = 20;
const MAX_CAMERA_DISTANCE_INCHES = 420;
const TOOLBAR_ZOOM_IN_DISTANCE_SCALE = 0.82;
const TOOLBAR_ZOOM_OUT_DISTANCE_SCALE = 1.18;

export function PerspectiveCameraControls() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const cameraCommand = useDesignSceneStore((state) => state.cameraCommand);
  const cameraState = useDesignSceneStore((state) => state.sceneCameraStates.perspective);
  const updatePerspectiveCameraState = useDesignSceneStore((state) => state.updatePerspectiveCameraState);
  const clearCameraCommand = useDesignSceneStore((state) => state.clearCameraCommand);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const sceneFitFrame = useSceneFitFrame();

  useEffect(() => {
    applyPerspectiveCameraState(camera as PerspectiveCamera, controlsRef.current, cameraState);
  }, [camera, cameraState]);

  useEffect(() => {
    if (cameraCommand === null || cameraCommand.sceneViewMode !== "perspective") {
      return;
    }

    const controls = controlsRef.current;

    if (controls === null) {
      return;
    }

    if (cameraCommand.tool === "zoom-in") {
      moveCameraTowardTarget(camera as PerspectiveCamera, controls, TOOLBAR_ZOOM_IN_DISTANCE_SCALE);
    } else if (cameraCommand.tool === "zoom-out") {
      moveCameraTowardTarget(camera as PerspectiveCamera, controls, TOOLBAR_ZOOM_OUT_DISTANCE_SCALE);
    } else {
      fitPerspectiveCameraToScene(camera as PerspectiveCamera, controls, sceneFitFrame);
    }

    updatePerspectiveCameraState(readPerspectiveCameraState(camera as PerspectiveCamera, controls));
    clearCameraCommand(cameraCommand.id);
  }, [camera, cameraCommand, clearCameraCommand, sceneFitFrame, updatePerspectiveCameraState]);

  function handleControlsChange() {
    const controls = controlsRef.current;

    if (controls === null) {
      return;
    }

    updatePerspectiveCameraState(readPerspectiveCameraState(camera as PerspectiveCamera, controls));
  }

  const isEditorOperationActive = activeSceneOperation !== null || activeToolbarTool !== null;

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={activeDrag === null}
      makeDefault
      enableDamping
      dampingFactor={0.06}
      enablePan={!isEditorOperationActive}
      enableZoom
      minDistance={MIN_CAMERA_DISTANCE_INCHES}
      maxDistance={MAX_CAMERA_DISTANCE_INCHES}
      rotateSpeed={0.55}
      zoomSpeed={0.4}
      panSpeed={0.75}
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

function applyPerspectiveCameraState(
  camera: PerspectiveCamera,
  controls: OrbitControlsImpl | null,
  cameraState: PerspectiveCameraState,
): void {
  camera.up.set(0, 0, 1);

  const hasCameraPositionChanged =
    Math.abs(camera.position.x - cameraState.cameraPositionInches.xInches) > 0.001 ||
    Math.abs(camera.position.y - cameraState.cameraPositionInches.yInches) > 0.001 ||
    Math.abs(camera.position.z - cameraState.cameraPositionInches.zInches) > 0.001;
  const hasCameraTargetChanged =
    controls !== null &&
    (Math.abs(controls.target.x - cameraState.cameraTargetInches.xInches) > 0.001 ||
      Math.abs(controls.target.y - cameraState.cameraTargetInches.yInches) > 0.001 ||
      Math.abs(controls.target.z - cameraState.cameraTargetInches.zInches) > 0.001);

  if (!hasCameraPositionChanged && !hasCameraTargetChanged) {
    return;
  }

  camera.position.set(
    cameraState.cameraPositionInches.xInches,
    cameraState.cameraPositionInches.yInches,
    cameraState.cameraPositionInches.zInches,
  );
  camera.updateProjectionMatrix();
  controls?.target.set(
    cameraState.cameraTargetInches.xInches,
    cameraState.cameraTargetInches.yInches,
    cameraState.cameraTargetInches.zInches,
  );
  controls?.update();
}

function readPerspectiveCameraState(
  camera: PerspectiveCamera,
  controls: OrbitControlsImpl,
): PerspectiveCameraState {
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
  };
}

function fitPerspectiveCameraToScene(
  camera: PerspectiveCamera,
  controls: OrbitControlsImpl,
  sceneFitFrame: ReturnType<typeof useSceneFitFrame>,
): void {
  const { centerInches, sizeInches } = sceneFitFrame;
  const distanceInches = Math.min(
    Math.max(sizeInches * 1.35, MIN_CAMERA_DISTANCE_INCHES),
    MAX_CAMERA_DISTANCE_INCHES,
  );

  camera.position.set(
    centerInches.xInches + distanceInches,
    centerInches.yInches - distanceInches,
    centerInches.zInches + distanceInches * 0.75,
  );
  camera.updateProjectionMatrix();
  controls.target.set(
    centerInches.xInches,
    centerInches.yInches,
    centerInches.zInches,
  );
  controls.update();
}

function moveCameraTowardTarget(
  camera: PerspectiveCamera,
  controls: OrbitControlsImpl,
  distanceScale: number,
) {
  const offset = camera.position.clone().sub(controls.target);
  const nextDistanceInches = Math.min(
    Math.max(offset.length() * distanceScale, MIN_CAMERA_DISTANCE_INCHES),
    MAX_CAMERA_DISTANCE_INCHES,
  );

  offset.setLength(nextDistanceInches);
  camera.position.copy(controls.target).add(offset);
  camera.updateProjectionMatrix();
  controls.update();
}
