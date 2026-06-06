"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { OrthographicCamera } from "three";
import type { ElevationEditorCameraState } from "../shared/editorCameraStateTypes";
import type { SceneFitFrame } from "../shared/cameraFit";
import { getPlacedWallActiveElevationSide } from "@/engine/walls/elevation/wallElevationGeometry";
import type { PlacedWallElevationSide } from "@/engine/walls/elevation/wallElevationGeometry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { useSceneFitFrame } from "../shared/useSceneFitFrame";

const ELEVATION_ZOOM_BASE_INCHES = 220;
const MIN_ELEVATION_ZOOM = 1.15;
const TOOLBAR_ZOOM_SCALE = 1.16;
const ELEVATION_CAMERA_Y_OFFSET_INCHES = 360;

export function ElevationCameraControls() {
  const { camera } = useThree();
  const hasInitializedCameraStateRef = useRef(false);
  const activeElevationSideKeyRef = useRef<string | null>(null);
  const cameraCommand = useDesignSceneStore((state) => state.cameraCommand);
  const cameraState = useDesignSceneStore((state) => state.editorCameraStates.elevation);
  const updateElevationCameraState = useDesignSceneStore((state) => state.updateElevationCameraState);
  const clearCameraCommand = useDesignSceneStore((state) => state.clearCameraCommand);
  const placedWalls = useDesignSceneStore((state) => state.designScene.placedWalls);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const activeWallElevationEdgeIndex = useDesignSceneStore((state) => state.activeWallElevationEdgeIndex);
  const selectedPlacedWall = activeSelection?.kind === "placed-wall"
    ? placedWalls.find((placedWall) => placedWall.id === activeSelection.placedWallId) ?? null
    : null;
  const activeElevationSide = useMemo(
    () => selectedPlacedWall === null
      ? null
      : getPlacedWallActiveElevationSide(selectedPlacedWall, activeWallElevationEdgeIndex),
    [selectedPlacedWall, activeWallElevationEdgeIndex],
  );
  const activeElevationSideKey = getElevationSideKey(activeElevationSide);
  const sceneFitFrame = useSceneFitFrame();

  useEffect(() => {
    const nextCameraState = cameraState.elevationSideKey === activeElevationSideKey
      ? cameraState
      : createElevationCameraState({
          activeElevationSide,
          elevationSideKey: activeElevationSideKey,
          sceneFitFrame,
        });

    applyElevationCameraState(camera as OrthographicCamera, nextCameraState);
    updateElevationCameraState(nextCameraState);
    hasInitializedCameraStateRef.current = true;
    activeElevationSideKeyRef.current = activeElevationSideKey;
  }, [camera]);

  useEffect(() => {
    if (!hasInitializedCameraStateRef.current) {
      return;
    }

    if (activeElevationSideKeyRef.current === activeElevationSideKey) {
      return;
    }

    const nextCameraState = createElevationCameraState({
      activeElevationSide,
      elevationSideKey: activeElevationSideKey,
      sceneFitFrame,
    });

    applyElevationCameraState(camera as OrthographicCamera, nextCameraState);
    updateElevationCameraState(nextCameraState);
    activeElevationSideKeyRef.current = activeElevationSideKey;
  }, [activeElevationSide, activeElevationSideKey, camera, sceneFitFrame, updateElevationCameraState]);

  useEffect(() => {
    if (cameraCommand === null || cameraCommand.editorView !== "elevation") {
      return;
    }

    let nextCameraState: ElevationEditorCameraState;

    if (cameraCommand.tool === "zoom-in") {
      updateElevationZoom(camera as OrthographicCamera, camera.zoom * TOOLBAR_ZOOM_SCALE);
      nextCameraState = readElevationCameraState({
        camera: camera as OrthographicCamera,
        cameraTargetInches: cameraState.cameraTargetInches,
        elevationSideKey: cameraState.elevationSideKey,
      });
    } else if (cameraCommand.tool === "zoom-out") {
      updateElevationZoom(camera as OrthographicCamera, camera.zoom / TOOLBAR_ZOOM_SCALE);
      nextCameraState = readElevationCameraState({
        camera: camera as OrthographicCamera,
        cameraTargetInches: cameraState.cameraTargetInches,
        elevationSideKey: cameraState.elevationSideKey,
      });
    } else {
      nextCameraState = createElevationCameraState({
        activeElevationSide,
        elevationSideKey: activeElevationSideKey,
        sceneFitFrame,
      });
      applyElevationCameraState(camera as OrthographicCamera, nextCameraState);
    }

    updateElevationCameraState(nextCameraState);
    clearCameraCommand(cameraCommand.id);
  }, [
    activeElevationSide,
    activeElevationSideKey,
    camera,
    cameraCommand,
    cameraState.cameraTargetInches,
    cameraState.elevationSideKey,
    clearCameraCommand,
    sceneFitFrame,
    updateElevationCameraState,
  ]);

  return null;
}

function getElevationSideKey(activeElevationSide: PlacedWallElevationSide | null): string | null {
  if (activeElevationSide === null) {
    return null;
  }

  return `${activeElevationSide.placedWallId}:${activeElevationSide.edgeIndex}`;
}

function createElevationCameraState(args: {
  activeElevationSide: PlacedWallElevationSide | null;
  elevationSideKey: string | null;
  sceneFitFrame: SceneFitFrame;
}): ElevationEditorCameraState {
  if (args.activeElevationSide !== null) {
    return createElevationCameraStateForSide(args.activeElevationSide, args.elevationSideKey);
  }

  return createElevationCameraStateForSceneFit(args.sceneFitFrame);
}

function createElevationCameraStateForSide(
  activeElevationSide: PlacedWallElevationSide,
  elevationSideKey: string | null,
): ElevationEditorCameraState {
  return {
    cameraPositionInches: activeElevationSide.cameraPositionInches,
    cameraTargetInches: activeElevationSide.cameraTargetInches,
    zoom: Math.max(MIN_ELEVATION_ZOOM, ELEVATION_ZOOM_BASE_INCHES / activeElevationSide.viewSizeInches),
    elevationSideKey,
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
    zoom: Math.max(MIN_ELEVATION_ZOOM, ELEVATION_ZOOM_BASE_INCHES / sizeInches),
    elevationSideKey: null,
  };
}

function applyElevationCameraState(
  camera: OrthographicCamera,
  cameraState: ElevationEditorCameraState,
): void {
  camera.up.set(0, 0, 1);
  camera.position.set(
    cameraState.cameraPositionInches.xInches,
    cameraState.cameraPositionInches.yInches,
    cameraState.cameraPositionInches.zInches,
  );
  camera.lookAt(
    cameraState.cameraTargetInches.xInches,
    cameraState.cameraTargetInches.yInches,
    cameraState.cameraTargetInches.zInches,
  );
  updateElevationZoom(camera, cameraState.zoom);
}

function readElevationCameraState(args: {
  camera: OrthographicCamera;
  cameraTargetInches: ElevationEditorCameraState["cameraTargetInches"];
  elevationSideKey: string | null;
}): ElevationEditorCameraState {
  return {
    cameraPositionInches: {
      xInches: args.camera.position.x,
      yInches: args.camera.position.y,
      zInches: args.camera.position.z,
    },
    cameraTargetInches: args.cameraTargetInches,
    zoom: args.camera.zoom,
    elevationSideKey: args.elevationSideKey,
  };
}

function updateElevationZoom(camera: OrthographicCamera, zoom: number): void {
  camera.zoom = Math.max(MIN_ELEVATION_ZOOM, zoom);
  camera.updateProjectionMatrix();
}
