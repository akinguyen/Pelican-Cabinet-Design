"use client";

import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { OrthographicCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { ElevationCameraState, SceneCameraStates } from "@/engine/scene/sceneCameraStateTypes";
import { getStoredElevationCameraState } from "@/engine/scene/sceneCameraStateTypes";
import {
  getElevationSideWorldPointAtHorizontal,
  getElevationViewFitBoundsCenter,
  getElevationViewFitBoundsSize,
  measureElevationViewFitBounds,
} from "@/engine/walls/elevation/elevationViewFitBounds";
import { createWallElevationViewKey, getActivePlacedWallElevationView } from "@/engine/walls/elevation/wallElevationGeometry";
import type { PlacedWallElevationSide } from "@/engine/walls/elevation/wallElevationGeometry";
import { kitchenEditorCatalogRegistry } from "../../catalogs/registry/kitchenEditorCatalogRegistry";
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
const ELEVATION_FIT_VIEWPORT_SCALE = 0.74;

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
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const placedWalls = useDesignSceneStore((state) => state.designScene.placedWalls);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const activeWallElevationWallId = useDesignSceneStore((state) => state.activeWallElevationWallId);
  const activeWallElevationEdgeIndex = useDesignSceneStore((state) => state.activeWallElevationEdgeIndex);
  const sceneFitFrame = useSceneFitFrame();
  const activeElevationView = getActivePlacedWallElevationView({
    placedWalls,
    activeWallElevationWallId,
    activeWallElevationEdgeIndex,
  });
  const activeElevationSide = activeElevationView?.side ?? null;
  const activeElevationViewKey = activeElevationSide === null
    ? null
    : createWallElevationViewKey(activeElevationSide);

  useEffect(() => {
    const nextCameraState = getNextElevationCameraState({
      sceneCameraStates,
      activeElevationSide,
      activeElevationViewKey,
      placedAssemblies,
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
      activeElevationSide,
      activeElevationViewKey,
      placedAssemblies,
      canvasSizePixels,
      sceneFitFrame,
    });

    applyElevationCameraState(camera as OrthographicCamera, controlsRef.current, nextCameraState);
    updateElevationCameraState(nextCameraState);
    activeElevationViewKeyRef.current = activeElevationViewKey;
  }, [
    activeElevationSide,
    activeElevationViewKey,
    camera,
    canvasSizePixels,
    sceneCameraStates,
    placedAssemblies,
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
        activeElevationSide,
        elevationViewKey: activeElevationViewKey,
        placedAssemblies,
        canvasSizePixels,
        sceneFitFrame,
      });
      applyElevationCameraState(camera as OrthographicCamera, controls, nextCameraState);
    }

    updateElevationCameraState(nextCameraState);
    clearCameraCommand(cameraCommand.id);
  }, [
    activeElevationSide,
    activeElevationViewKey,
    camera,
    cameraCommand,
    canvasSizePixels,
    clearCameraCommand,
    placedAssemblies,
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
  activeElevationSide: PlacedWallElevationSide | null;
  activeElevationViewKey: string | null;
  placedAssemblies: readonly PlacedAssembly[];
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
    activeElevationSide: args.activeElevationSide,
    elevationViewKey: args.activeElevationViewKey,
    placedAssemblies: args.placedAssemblies,
    canvasSizePixels: args.canvasSizePixels,
    sceneFitFrame: args.sceneFitFrame,
  });
}

function createElevationCameraState(args: {
  activeElevationSide: PlacedWallElevationSide | null;
  elevationViewKey: string | null;
  placedAssemblies: readonly PlacedAssembly[];
  canvasSizePixels: CanvasSizePixels;
  sceneFitFrame: SceneFitFrame;
}): ElevationCameraState {
  if (args.activeElevationSide !== null) {
    return createElevationCameraStateForSide({
      activeElevationSide: args.activeElevationSide,
      elevationViewKey: args.elevationViewKey,
      placedAssemblies: args.placedAssemblies,
      canvasSizePixels: args.canvasSizePixels,
    });
  }

  return createElevationCameraStateForSceneFit(args.sceneFitFrame);
}

function createElevationCameraStateForSide(args: {
  activeElevationSide: PlacedWallElevationSide;
  elevationViewKey: string | null;
  placedAssemblies: readonly PlacedAssembly[];
  canvasSizePixels: CanvasSizePixels;
}): ElevationCameraState {
  const fitBounds = measureElevationViewFitBounds({
    activeElevationSide: args.activeElevationSide,
    placedAssemblies: args.placedAssemblies,
    registry: kitchenEditorCatalogRegistry,
  });
  const fitBoundsCenter = getElevationViewFitBoundsCenter(fitBounds);
  const fitBoundsSize = getElevationViewFitBoundsSize(fitBounds);
  const targetBasePointInches = getElevationSideWorldPointAtHorizontal(
    args.activeElevationSide,
    fitBoundsCenter.horizontalInches,
  );
  const cameraTargetInches = {
    ...targetBasePointInches,
    zInches: fitBoundsCenter.zInches,
  };
  const cameraDistanceInches = Math.max(
    args.activeElevationSide.cameraDistanceInches,
    fitBoundsSize.widthInches * 0.5,
    40,
  );

  return {
    cameraPositionInches: {
      xInches:
        cameraTargetInches.xInches +
        args.activeElevationSide.outwardNormalInches.xInches * cameraDistanceInches,
      yInches:
        cameraTargetInches.yInches +
        args.activeElevationSide.outwardNormalInches.yInches * cameraDistanceInches,
      zInches: cameraTargetInches.zInches,
    },
    cameraTargetInches,
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
