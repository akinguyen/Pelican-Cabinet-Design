"use client";

import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { OrthographicCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import { createWallSegmentElevationViewKey, getActiveWallSegmentElevationFace } from "@/engine/walls/wallSegmentElevation";
import type { WallSegmentFace } from "@/engine/walls/wallSegmentTopologyTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { WallElevationTarget } from "@/engine/walls/wallSegmentElevationTypes";
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

const MIN_ELEVATION_ZOOM = 1.15;
const MAX_ELEVATION_ZOOM = 12;
const ELEVATION_CAMERA_Y_OFFSET_INCHES = 360;
const ELEVATION_CAMERA_DISTANCE_INCHES = 360;
const ELEVATION_FIT_VIEWPORT_SCALE = 0.74;
const ELEVATION_FIT_PADDING_INCHES = 24;

const ELEVATION_CAMERA_UP_VECTOR = {
  x: 0,
  y: 0,
  z: 1,
} as const;

const ELEVATION_ZOOM_RANGE = {
  minZoom: MIN_ELEVATION_ZOOM,
  maxZoom: MAX_ELEVATION_ZOOM,
} as const;

type CanvasSizePixels = Readonly<{
  widthPixels: number;
  heightPixels: number;
}>;

export function ElevationCameraControls() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const activeElevationViewKeyRef = useRef<string | null>(null);
  const { camera, size } = useThree();
  const canvasSizePixels = useMemo<CanvasSizePixels>(
    () => ({
      widthPixels: size.width,
      heightPixels: size.height,
    }),
    [size.height, size.width],
  );
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
  const activeElevationFace = getActiveWallElevationFaceFromGraphs({
    placedWallGraphs,
    activeWallElevationTarget,
  });
  const activeElevationViewKey = activeElevationFace === null
    ? null
    : createWallSegmentElevationViewKey(activeElevationFace);

  useEffect(() => {
    const nextCameraState = getNextElevationCameraState({
      sceneCameraStates,
      activeElevationFace,
      activeElevationViewKey,
      canvasSizePixels,
      sceneFitFrame,
    });

    applyElevationCameraState(camera as OrthographicCamera, controlsRef.current, nextCameraState);
    updateElevationCameraState(nextCameraState);
    activeElevationViewKeyRef.current = activeElevationViewKey;
  }, [camera]);

  useEffect(() => {
    if (activeElevationViewKeyRef.current === activeElevationViewKey) {
      return;
    }

    const nextCameraState = getNextElevationCameraState({
      sceneCameraStates,
      activeElevationFace,
      activeElevationViewKey,
      canvasSizePixels,
      sceneFitFrame,
    });

    applyElevationCameraState(camera as OrthographicCamera, controlsRef.current, nextCameraState);
    updateElevationCameraState(nextCameraState);
    activeElevationViewKeyRef.current = activeElevationViewKey;
  }, [
    activeElevationFace,
    activeElevationViewKey,
    camera,
    canvasSizePixels,
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

    if (cameraCommand.tool === "zoom-in") {
      updateElevationZoom(camera as OrthographicCamera, camera.zoom * ORTHOGRAPHIC_CAMERA_TOOLBAR_ZOOM_SCALE);
      controls.update();
      nextCameraState = readElevationCameraState({
        camera: camera as OrthographicCamera,
        controls,
        elevationViewKey: activeElevationViewKey,
      });
    } else if (cameraCommand.tool === "zoom-out") {
      updateElevationZoom(camera as OrthographicCamera, camera.zoom / ORTHOGRAPHIC_CAMERA_TOOLBAR_ZOOM_SCALE);
      controls.update();
      nextCameraState = readElevationCameraState({
        camera: camera as OrthographicCamera,
        controls,
        elevationViewKey: activeElevationViewKey,
      });
    } else {
      nextCameraState = createElevationCameraState({
        activeElevationFace,
        elevationViewKey: activeElevationViewKey,
        canvasSizePixels,
        sceneFitFrame,
      });
      applyElevationCameraState(camera as OrthographicCamera, controls, nextCameraState);
    }

    updateElevationCameraState(nextCameraState);
    clearCameraCommand(cameraCommand.id);
  }, [
    activeElevationFace,
    activeElevationViewKey,
    camera,
    cameraCommand,
    canvasSizePixels,
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

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={activeDrag === null && activeSceneOperation?.kind !== "countertop-opening-drag"}
      makeDefault
      enableRotate={false}
      enablePan={!isEditorOperationActive}
      enableZoom
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
  activeElevationFace: WallSegmentFace | null;
  activeElevationViewKey: string | null;
  canvasSizePixels: CanvasSizePixels;
  sceneFitFrame: SceneFitFrame;
}): ElevationCameraState {
  const storedCameraState = getStoredElevationCameraState(
    args.sceneCameraStates,
    args.activeElevationViewKey,
  );

  if (storedCameraState.elevationViewKey === args.activeElevationViewKey) {
    return storedCameraState;
  }

  return createElevationCameraState({
    activeElevationFace: args.activeElevationFace,
    elevationViewKey: args.activeElevationViewKey,
    canvasSizePixels: args.canvasSizePixels,
    sceneFitFrame: args.sceneFitFrame,
  });
}

function createElevationCameraState(args: {
  activeElevationFace: WallSegmentFace | null;
  elevationViewKey: string | null;
  canvasSizePixels: CanvasSizePixels;
  sceneFitFrame: SceneFitFrame;
}): ElevationCameraState {
  if (args.activeElevationFace !== null) {
    return createElevationCameraStateForFace({
      activeElevationFace: args.activeElevationFace,
      elevationViewKey: args.elevationViewKey,
      canvasSizePixels: args.canvasSizePixels,
    });
  }

  return createElevationCameraStateForSceneFit(args.sceneFitFrame);
}

function createElevationCameraStateForFace(args: {
  activeElevationFace: WallSegmentFace;
  elevationViewKey: string | null;
  canvasSizePixels: CanvasSizePixels;
}): ElevationCameraState {
  const midpointInches = {
    xInches: (args.activeElevationFace.startPointInches.xInches + args.activeElevationFace.endPointInches.xInches) / 2,
    yInches: (args.activeElevationFace.startPointInches.yInches + args.activeElevationFace.endPointInches.yInches) / 2,
    zInches: args.activeElevationFace.heightInches / 2,
  };
  const fitBoundsSize = {
    widthInches: args.activeElevationFace.lengthInches + ELEVATION_FIT_PADDING_INCHES * 2,
    heightInches: args.activeElevationFace.heightInches + ELEVATION_FIT_PADDING_INCHES * 2,
  };

  return {
    cameraPositionInches: {
      xInches:
        midpointInches.xInches +
        args.activeElevationFace.normalInches.xInches * ELEVATION_CAMERA_DISTANCE_INCHES,
      yInches:
        midpointInches.yInches +
        args.activeElevationFace.normalInches.yInches * ELEVATION_CAMERA_DISTANCE_INCHES,
      zInches: midpointInches.zInches,
    },
    cameraTargetInches: midpointInches,
    zoom: computeElevationFitZoom(fitBoundsSize, args.canvasSizePixels),
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

function computeElevationFitZoom(
  fitBoundsSize: Readonly<{ widthInches: number; heightInches: number }>,
  canvasSizePixels: CanvasSizePixels,
): number {
  const zoomForWidth = (canvasSizePixels.widthPixels * ELEVATION_FIT_VIEWPORT_SCALE) / fitBoundsSize.widthInches;
  const zoomForHeight = (canvasSizePixels.heightPixels * ELEVATION_FIT_VIEWPORT_SCALE) / fitBoundsSize.heightInches;
  return Math.min(
    Math.max(Math.min(zoomForWidth, zoomForHeight), MIN_ELEVATION_ZOOM),
    MAX_ELEVATION_ZOOM,
  );
}

function applyElevationCameraState(
  camera: OrthographicCamera,
  controls: OrbitControlsImpl | null,
  cameraState: ElevationCameraState,
): void {
  applyOrthographicCameraState({
    camera,
    controls,
    cameraState,
    cameraUpVector: ELEVATION_CAMERA_UP_VECTOR,
    zoomRange: ELEVATION_ZOOM_RANGE,
  });

  if (controls === null) {
    camera.lookAt(
      cameraState.cameraTargetInches.xInches,
      cameraState.cameraTargetInches.yInches,
      cameraState.cameraTargetInches.zInches,
    );
  }
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


function getActiveWallElevationFaceFromGraphs(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  activeWallElevationTarget: WallElevationTarget | null;
}): WallSegmentFace | null {
  if (args.placedWallGraphs.length === 0) {
    return null;
  }

  const targetGraph = args.activeWallElevationTarget === null
    ? args.placedWallGraphs[0]
    : args.placedWallGraphs.find((wallGraph) => wallGraph.id === args.activeWallElevationTarget?.wallGraphId) ?? args.placedWallGraphs[0];

  return getActiveWallSegmentElevationFace({
    topology: buildConnectedWallGeometry(targetGraph),
    activeWallElevationTarget: args.activeWallElevationTarget,
  });
}
