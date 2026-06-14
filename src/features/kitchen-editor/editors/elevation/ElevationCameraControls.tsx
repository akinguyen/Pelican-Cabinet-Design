"use client";

import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { OrthographicCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { createWallElevationCameraFrame } from "@/engine/walls/wallElevationCameraFrame";
import type { WallElevationCameraFrame } from "@/engine/walls/wallElevationCameraFrame";
import { getWallElevationViewZoneForTarget } from "@/engine/walls/wallElevationViewZone";
import type { WallElevationViewZone } from "@/engine/walls/wallElevationViewZone";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { ElevationCameraState, SceneCameraStates } from "@/engine/scene/sceneCameraStateTypes";
import { getStoredElevationCameraState } from "@/engine/scene/sceneCameraStateTypes";
import type { SceneFitFrame } from "../shared/camera/cameraFit";
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

const MIN_ELEVATION_ZOOM = 1;
const MAX_ELEVATION_ZOOM = 12;
const ELEVATION_CAMERA_Y_OFFSET_INCHES = 360;

const ELEVATION_CAMERA_UP_VECTOR = {
  x: 0,
  y: 0,
  z: 1,
} as const;

const ELEVATION_ZOOM_RANGE = {
  minZoom: MIN_ELEVATION_ZOOM,
  maxZoom: MAX_ELEVATION_ZOOM,
} as const;

export function ElevationCameraControls() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const activeElevationFrameKeyRef = useRef<string | null>(null);
  const { camera, size } = useThree();
  const cameraCommand = useDesignSceneStore((state) => state.cameraCommand);
  const sceneCameraStates = useDesignSceneStore((state) => state.sceneCameraStates);
  const updateElevationCameraState = useDesignSceneStore((state) => state.updateElevationCameraState);
  const clearCameraCommand = useDesignSceneStore((state) => state.clearCameraCommand);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const activeWallElevationTarget = useDesignSceneStore((state) => state.activeWallElevationTarget);
  const sceneFitFrame = useSceneFitFrame();
  const activeElevationViewZone = useMemo(
    () => getWallElevationViewZoneForTarget({
      placedWallGraphs,
      activeWallElevationTarget,
    }),
    [activeWallElevationTarget, placedWallGraphs],
  );
  const activeElevationCameraFrame = useMemo(
    () => activeElevationViewZone === null
      ? null
      : createWallElevationCameraFrame({
          viewZone: activeElevationViewZone,
          viewportWidthPixels: size.width,
          viewportHeightPixels: size.height,
        }),
    [activeElevationViewZone, size.height, size.width],
  );
  const activeElevationViewKey = activeElevationViewZone === null
    ? null
    : createWallElevationViewKey(activeElevationViewZone);
  const activeElevationFrameKey = activeElevationViewZone === null || activeElevationCameraFrame === null
    ? activeElevationViewKey
    : createWallElevationFrameKey({
        viewZone: activeElevationViewZone,
        cameraFrame: activeElevationCameraFrame,
      });

  useEffect(() => {
    const nextCameraState = getNextElevationCameraState({
      sceneCameraStates,
      activeElevationCameraFrame,
      activeElevationViewKey,
      sceneFitFrame,
    });

    applyElevationCameraState({
      camera: camera as OrthographicCamera,
      controls: controlsRef.current,
      cameraState: nextCameraState,
      cameraFrame: activeElevationCameraFrame,
    });
    updateElevationCameraState(nextCameraState);
    activeElevationFrameKeyRef.current = activeElevationFrameKey;
  }, [camera]);

  useEffect(() => {
    if (activeElevationFrameKeyRef.current === activeElevationFrameKey) {
      return;
    }

    const nextCameraState = getNextElevationCameraState({
      sceneCameraStates,
      activeElevationCameraFrame,
      activeElevationViewKey,
      sceneFitFrame,
    });

    applyElevationCameraState({
      camera: camera as OrthographicCamera,
      controls: controlsRef.current,
      cameraState: nextCameraState,
      cameraFrame: activeElevationCameraFrame,
    });
    updateElevationCameraState(nextCameraState);
    activeElevationFrameKeyRef.current = activeElevationFrameKey;
  }, [
    activeElevationCameraFrame,
    activeElevationFrameKey,
    activeElevationViewKey,
    camera,
    sceneCameraStates,
    sceneFitFrame,
    updateElevationCameraState,
  ]);

  useEffect(() => {
    if (cameraCommand === null || cameraCommand.sceneViewMode !== "elevation") {
      return;
    }

    const controls = controlsRef.current;

    if (controls === null) {
      return;
    }

    let nextCameraState: ElevationCameraState;
    const usesLockedWallFaceFrame = activeElevationCameraFrame !== null;

    if (cameraCommand.tool === "zoom-in" && !usesLockedWallFaceFrame) {
      updateElevationZoom(camera as OrthographicCamera, camera.zoom * ORTHOGRAPHIC_CAMERA_TOOLBAR_ZOOM_SCALE);
      controls.update();
      nextCameraState = readElevationCameraState({
        camera: camera as OrthographicCamera,
        controls,
        elevationViewKey: activeElevationViewKey,
      });
    } else if (cameraCommand.tool === "zoom-out" && !usesLockedWallFaceFrame) {
      updateElevationZoom(camera as OrthographicCamera, camera.zoom / ORTHOGRAPHIC_CAMERA_TOOLBAR_ZOOM_SCALE);
      controls.update();
      nextCameraState = readElevationCameraState({
        camera: camera as OrthographicCamera,
        controls,
        elevationViewKey: activeElevationViewKey,
      });
    } else {
      nextCameraState = createElevationCameraState({
        activeElevationCameraFrame,
        elevationViewKey: activeElevationViewKey,
        sceneFitFrame,
      });
      applyElevationCameraState({
        camera: camera as OrthographicCamera,
        controls,
        cameraState: nextCameraState,
        cameraFrame: activeElevationCameraFrame,
      });
    }

    updateElevationCameraState(nextCameraState);
    clearCameraCommand(cameraCommand.id);
  }, [
    activeElevationCameraFrame,
    activeElevationFrameKey,
    activeElevationViewKey,
    camera,
    cameraCommand,
    clearCameraCommand,
    sceneFitFrame,
    updateElevationCameraState,
  ]);

  function handleControlsChange() {
    const controls = controlsRef.current;

    if (controls === null) {
      return;
    }

    updateElevationCameraState(readElevationCameraState({
      camera: camera as OrthographicCamera,
      controls,
      elevationViewKey: activeElevationViewKey,
    }));
  }

  const isEditorOperationActive = activeSceneOperation !== null || activeToolbarTool !== null;
  const hasLockedWallFaceFrame = activeElevationCameraFrame !== null;
  const allowCameraPan = !hasLockedWallFaceFrame && !isEditorOperationActive;
  const allowCameraZoom = !hasLockedWallFaceFrame && !isEditorOperationActive;

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={activeDrag === null && !hasLockedWallFaceFrame && activeSceneOperation?.kind !== "countertop-opening-drag"}
      makeDefault
      enableRotate={false}
      enablePan={allowCameraPan}
      enableZoom={allowCameraZoom}
      enableDamping
      dampingFactor={ORTHOGRAPHIC_CAMERA_DAMPING_FACTOR}
      minZoom={MIN_ELEVATION_ZOOM}
      maxZoom={MAX_ELEVATION_ZOOM}
      zoomSpeed={ORTHOGRAPHIC_CAMERA_ZOOM_SPEED}
      panSpeed={ORTHOGRAPHIC_CAMERA_PAN_SPEED}
      screenSpacePanning
      mouseButtons={SCENE_CAMERA_MOUSE_BUTTONS}
      touches={SCENE_CAMERA_TOUCHES}
      onChange={handleControlsChange}
    />
  );
}

function getNextElevationCameraState(args: {
  sceneCameraStates: SceneCameraStates;
  activeElevationCameraFrame: WallElevationCameraFrame | null;
  activeElevationViewKey: string | null;
  sceneFitFrame: SceneFitFrame;
}): ElevationCameraState {
  if (args.activeElevationCameraFrame !== null) {
    return createElevationCameraStateForWallFace({
      cameraFrame: args.activeElevationCameraFrame,
      elevationViewKey: args.activeElevationViewKey,
    });
  }

  const storedCameraState = getStoredElevationCameraState(
    args.sceneCameraStates,
    args.activeElevationViewKey,
  );

  if (storedCameraState.elevationViewKey === args.activeElevationViewKey) {
    return storedCameraState;
  }

  return createElevationCameraState({
    activeElevationCameraFrame: args.activeElevationCameraFrame,
    elevationViewKey: args.activeElevationViewKey,
    sceneFitFrame: args.sceneFitFrame,
  });
}

function createElevationCameraState(args: {
  activeElevationCameraFrame: WallElevationCameraFrame | null;
  elevationViewKey: string | null;
  sceneFitFrame: SceneFitFrame;
}): ElevationCameraState {
  if (args.activeElevationCameraFrame !== null) {
    return createElevationCameraStateForWallFace({
      cameraFrame: args.activeElevationCameraFrame,
      elevationViewKey: args.elevationViewKey,
    });
  }

  return createElevationCameraStateForSceneFit(args.sceneFitFrame);
}

function createElevationCameraStateForWallFace(args: {
  cameraFrame: WallElevationCameraFrame;
  elevationViewKey: string | null;
}): ElevationCameraState {
  return {
    cameraPositionInches: args.cameraFrame.cameraPositionInches,
    cameraTargetInches: args.cameraFrame.cameraTargetInches,
    zoom: args.cameraFrame.zoom,
    elevationViewKey: args.elevationViewKey,
  };
}

function createElevationCameraStateForSceneFit(sceneFitFrame: SceneFitFrame): ElevationCameraState {
  const { centerInches, sizeInches } = sceneFitFrame;

  return {
    cameraPositionInches: {
      xInches: centerInches.xInches,
      yInches: centerInches.yInches + ELEVATION_CAMERA_Y_OFFSET_INCHES,
      zInches: centerInches.zInches,
    },
    cameraTargetInches: centerInches,
    zoom: Math.max(MIN_ELEVATION_ZOOM, 220 / sizeInches),
    elevationViewKey: null,
  };
}

function applyElevationCameraState(args: {
  camera: OrthographicCamera;
  controls: OrbitControlsImpl | null;
  cameraState: ElevationCameraState;
  cameraFrame: WallElevationCameraFrame | null;
}): void {
  if (args.cameraFrame !== null) {
    args.camera.left = args.cameraFrame.leftInches;
    args.camera.right = args.cameraFrame.rightInches;
    args.camera.top = args.cameraFrame.topInches;
    args.camera.bottom = args.cameraFrame.bottomInches;
    args.camera.near = args.cameraFrame.nearInches;
    args.camera.far = args.cameraFrame.farInches;
  }

  applyOrthographicCameraState({
    camera: args.camera,
    controls: args.controls,
    cameraState: args.cameraState,
    cameraUpVector: ELEVATION_CAMERA_UP_VECTOR,
    zoomRange: ELEVATION_ZOOM_RANGE,
  });

  if (args.controls === null) {
    args.camera.lookAt(
      args.cameraState.cameraTargetInches.xInches,
      args.cameraState.cameraTargetInches.yInches,
      args.cameraState.cameraTargetInches.zInches,
    );
  }

  args.camera.updateProjectionMatrix();
}

function readElevationCameraState(args: {
  camera: OrthographicCamera;
  controls: OrbitControlsImpl;
  elevationViewKey: string | null;
}): ElevationCameraState {
  return {
    ...readOrthographicCameraState(args.camera, args.controls),
    elevationViewKey: args.elevationViewKey,
  };
}

function updateElevationZoom(camera: OrthographicCamera, zoom: number): void {
  updateOrthographicCameraZoom({
    camera,
    zoom,
    zoomRange: ELEVATION_ZOOM_RANGE,
  });
}

function createWallElevationViewKey(viewZone: WallElevationViewZone): string {
  return `${viewZone.wallGraphId}-${viewZone.wallSegmentId}-${viewZone.faceSide}`;
}

function createWallElevationFrameKey(args: {
  viewZone: WallElevationViewZone;
  cameraFrame: WallElevationCameraFrame;
}): string {
  return [
    createWallElevationViewKey(args.viewZone),
    roundFrameValue(args.viewZone.faceStartInches.xInches),
    roundFrameValue(args.viewZone.faceStartInches.yInches),
    roundFrameValue(args.viewZone.faceEndInches.xInches),
    roundFrameValue(args.viewZone.faceEndInches.yInches),
    roundFrameValue(args.viewZone.faceLengthInches),
    roundFrameValue(args.viewZone.wallHeightInches),
    roundFrameValue(args.cameraFrame.leftInches),
    roundFrameValue(args.cameraFrame.rightInches),
    roundFrameValue(args.cameraFrame.topInches),
    roundFrameValue(args.cameraFrame.bottomInches),
    roundFrameValue(args.cameraFrame.nearInches),
    roundFrameValue(args.cameraFrame.farInches),
  ].join(":");
}

function roundFrameValue(value: number): string {
  return value.toFixed(3);
}
