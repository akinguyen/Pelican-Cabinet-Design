"use client";

import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MOUSE, TOUCH } from "three";
import type { OrthographicCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  getElevationSideWorldPointAtHorizontal,
  getElevationViewFitBoundsCenter,
  getElevationViewFitBoundsSize,
  measureElevationViewFitBounds,
} from "@/engine/walls/elevation/elevationViewFitBounds";
import { getActivePlacedWallElevationView, createWallElevationViewKey } from "@/engine/walls/elevation/wallElevationGeometry";
import type { PlacedWallElevationSide } from "@/engine/walls/elevation/wallElevationGeometry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { kitchenEditorCatalogRegistry } from "../../catalogs/registry/kitchenEditorCatalogRegistry";
import type { ElevationEditorCameraState } from "../shared/editorCameraStateTypes";
import { getStoredElevationEditorCameraState } from "../shared/editorCameraStateTypes";
import type { SceneFitFrame } from "../shared/cameraFit";
import { useSceneFitFrame } from "../shared/useSceneFitFrame";

const MIN_ELEVATION_ZOOM = 1.15;
const MAX_ELEVATION_ZOOM = 12;
const TOOLBAR_ZOOM_SCALE = 1.16;
const ELEVATION_CAMERA_Y_OFFSET_INCHES = 360;
const ELEVATION_FIT_VIEWPORT_SCALE = 0.74;

export function ElevationCameraControls() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const activeElevationViewKeyRef = useRef<string | null>(null);
  const { camera, size: canvasSizePixels } = useThree();
  const cameraCommand = useDesignSceneStore((state) => state.cameraCommand);
  const editorCameraStates = useDesignSceneStore((state) => state.editorCameraStates);
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
    const storedCameraState = getStoredElevationEditorCameraState(
      editorCameraStates,
      activeElevationViewKey,
    );
    const nextCameraState = storedCameraState.elevationViewKey === activeElevationViewKey
      ? storedCameraState
      : createElevationCameraState({
          activeElevationSide,
          elevationViewKey: activeElevationViewKey,
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

    const storedCameraState = getStoredElevationEditorCameraState(
      editorCameraStates,
      activeElevationViewKey,
    );
    const nextCameraState = storedCameraState.elevationViewKey === activeElevationViewKey
      ? storedCameraState
      : createElevationCameraState({
          activeElevationSide,
          elevationViewKey: activeElevationViewKey,
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
    editorCameraStates,
    placedAssemblies,
    sceneFitFrame,
    updateElevationCameraState,
  ]);

  useEffect(() => {
    if (cameraCommand === null || cameraCommand.editorView !== "elevation") {
      return;
    }

    const controls = controlsRef.current;

    if (controls === null) {
      return;
    }

    let nextCameraState: ElevationEditorCameraState;

    if (cameraCommand.tool === "zoom-in") {
      updateElevationZoom(camera as OrthographicCamera, camera.zoom * TOOLBAR_ZOOM_SCALE);
      controls.update();
      nextCameraState = readElevationCameraState({
        camera: camera as OrthographicCamera,
        controls,
        elevationViewKey: activeElevationViewKey,
      });
    } else if (cameraCommand.tool === "zoom-out") {
      updateElevationZoom(camera as OrthographicCamera, camera.zoom / TOOLBAR_ZOOM_SCALE);
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
      enabled={activeDrag === null}
      makeDefault
      enableRotate={false}
      enablePan={!isEditorOperationActive}
      enableZoom
      enableDamping
      dampingFactor={0.08}
      minZoom={MIN_ELEVATION_ZOOM}
      maxZoom={MAX_ELEVATION_ZOOM}
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

function createElevationCameraState(args: {
  activeElevationSide: PlacedWallElevationSide | null;
  elevationViewKey: string | null;
  placedAssemblies: readonly PlacedAssembly[];
  canvasSizePixels: Readonly<{ width: number; height: number }>;
  sceneFitFrame: SceneFitFrame;
}): ElevationEditorCameraState {
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
  canvasSizePixels: Readonly<{ width: number; height: number }>;
}): ElevationEditorCameraState {
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

function createElevationCameraStateForSceneFit(sceneFitFrame: SceneFitFrame): ElevationEditorCameraState {
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
  canvasSizePixels: Readonly<{ width: number; height: number }>,
): number {
  const zoomForWidth = (canvasSizePixels.width * ELEVATION_FIT_VIEWPORT_SCALE) / fitBoundsSize.widthInches;
  const zoomForHeight = (canvasSizePixels.height * ELEVATION_FIT_VIEWPORT_SCALE) / fitBoundsSize.heightInches;
  return Math.min(
    Math.max(Math.min(zoomForWidth, zoomForHeight), MIN_ELEVATION_ZOOM),
    MAX_ELEVATION_ZOOM,
  );
}

function applyElevationCameraState(
  camera: OrthographicCamera,
  controls: OrbitControlsImpl | null,
  cameraState: ElevationEditorCameraState,
): void {
  camera.up.set(0, 0, 1);
  camera.position.set(
    cameraState.cameraPositionInches.xInches,
    cameraState.cameraPositionInches.yInches,
    cameraState.cameraPositionInches.zInches,
  );
  updateElevationZoom(camera, cameraState.zoom);
  controls?.target.set(
    cameraState.cameraTargetInches.xInches,
    cameraState.cameraTargetInches.yInches,
    cameraState.cameraTargetInches.zInches,
  );
  controls?.update();

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
}): ElevationEditorCameraState {
  return {
    cameraPositionInches: {
      xInches: args.camera.position.x,
      yInches: args.camera.position.y,
      zInches: args.camera.position.z,
    },
    cameraTargetInches: {
      xInches: args.controls.target.x,
      yInches: args.controls.target.y,
      zInches: args.controls.target.z,
    },
    zoom: args.camera.zoom,
    elevationViewKey: args.elevationViewKey,
  };
}

function updateElevationZoom(camera: OrthographicCamera, zoom: number): void {
  camera.zoom = Math.min(Math.max(zoom, MIN_ELEVATION_ZOOM), MAX_ELEVATION_ZOOM);
  camera.updateProjectionMatrix();
}
