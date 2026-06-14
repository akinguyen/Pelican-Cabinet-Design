"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";
import type { CountertopCutoutDraftShapeKind } from "@/engine/countertops/countertopOpeningTypes";
import type { DesignSceneStore } from "@/engine/scene/designSceneStoreTypes";
import { degreesToUserFacingZRadians } from "@/core/geometry/rotationTypes";
import {
  createCountertopLocalPointFromRay,
  isCountertopLocalPointInsideFootprint,
} from "./countertopPointerProjection";

const COUNTERTOP_CUTOUT_SURFACE_Z_OFFSET_INCHES = 0.08;

export function CountertopCutoutDraftSurface() {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const startCountertopCutoutDraft = useDesignSceneStore((state) => state.startCountertopCutoutDraft);
  const updateCountertopCutoutDraft = useDesignSceneStore((state) => state.updateCountertopCutoutDraft);
  const commitCountertopCutoutDraft = useDesignSceneStore((state) => state.commitCountertopCutoutDraft);
  const setActiveCutoutDraftPointerTarget = useDesignSceneStore((state) => state.setActiveCutoutDraftPointerTarget);
  const shapeKind = getCountertopCutoutDraftShapeKind(activeToolbarTool);
  const selectedCountertop =
    activeSelection?.kind === "placed-assembly"
      ? placedAssemblies.find((assembly) => assembly.id === activeSelection.placedAssemblyId)
      : undefined;
  const selectedCountertopSizeInches = selectedCountertop?.configuration.sizeInches;

  if (
    !canManuallyEditScene(workspaceMode) ||
    shapeKind === null ||
    activeSceneViewMode === "elevation" ||
    selectedCountertop === undefined
  ) {
    return null;
  }

  function getInsideLocalPointInches(event: ThreeEvent<PointerEvent>) {
    if (selectedCountertop === undefined) {
      return null;
    }

    const localPointInches = createCountertopLocalPointFromRay(selectedCountertop, event.ray);

    return localPointInches !== null && isCountertopLocalPointInsideFootprint(selectedCountertop, localPointInches)
      ? localPointInches
      : null;
  }

  function handlePointerOver() {
    setActiveCutoutDraftPointerTarget("countertop");
  }

  function handlePointerOut() {
    setActiveCutoutDraftPointerTarget(null);
  }

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    if (selectedCountertop === undefined || shapeKind === null || event.button !== 0) {
      return;
    }

    const localPointInches = getInsideLocalPointInches(event);

    if (localPointInches === null) {
      return;
    }

    event.stopPropagation();
    setActiveCutoutDraftPointerTarget("countertop");
    startCountertopCutoutDraft({
      hostCountertopId: selectedCountertop.id,
      shapeKind,
      startLocalInches: localPointInches,
    });
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    if (
      selectedCountertop === undefined ||
      activeSceneOperation?.kind !== "countertop-cutout-draft"
    ) {
      return;
    }

    const localPointInches = getInsideLocalPointInches(event);

    if (localPointInches === null) {
      return;
    }

    event.stopPropagation();
    updateCountertopCutoutDraft(localPointInches);
  }

  function handlePointerUp(event: ThreeEvent<PointerEvent>) {
    if (activeSceneOperation?.kind !== "countertop-cutout-draft") {
      return;
    }

    event.stopPropagation();
    setActiveCutoutDraftPointerTarget(null);
    commitCountertopCutoutDraft();
  }

  if (selectedCountertopSizeInches === undefined) {
    return null;
  }

  const topZInches =
    selectedCountertop.worldPositionInches.zInches +
    selectedCountertopSizeInches.heightInches / 2 +
    COUNTERTOP_CUTOUT_SURFACE_Z_OFFSET_INCHES;

  return (
    <mesh
      position={[
        selectedCountertop.worldPositionInches.xInches,
        selectedCountertop.worldPositionInches.yInches,
        topZInches,
      ]}
      rotation={[0, 0, degreesToUserFacingZRadians(selectedCountertop.rotationDegrees.zDegrees ?? 0)]}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <planeGeometry
        args={[
          selectedCountertopSizeInches.widthInches,
          selectedCountertopSizeInches.depthInches,
        ]}
      />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function getCountertopCutoutDraftShapeKind(
  activeToolbarTool: DesignSceneStore["activeToolbarTool"],
): CountertopCutoutDraftShapeKind | null {
  if (activeToolbarTool === "draw-rectangle-cutout") {
    return "rectangle";
  }

  return null;
}
