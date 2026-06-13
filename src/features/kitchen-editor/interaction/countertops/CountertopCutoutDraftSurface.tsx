"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";
import type { CountertopCutoutDraftShapeKind } from "@/engine/countertops/countertopOpeningTypes";
import type { DesignSceneStore } from "@/engine/scene/designSceneStoreTypes";
import { createCountertopLocalPointFromRay } from "./countertopPointerProjection";

const COUNTERTOP_DRAWING_SURFACE_SIZE_INCHES = 3200;

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
  const shapeKind = getCountertopCutoutDraftShapeKind(activeToolbarTool);
  const selectedCountertop =
    activeSelection?.kind === "placed-assembly"
      ? placedAssemblies.find((assembly) => assembly.id === activeSelection.placedAssemblyId)
      : undefined;

  if (
    !canManuallyEditScene(workspaceMode) ||
    shapeKind === null ||
    activeSceneViewMode === "elevation" ||
    selectedCountertop === undefined
  ) {
    return null;
  }

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    if (selectedCountertop === undefined || shapeKind === null || event.button !== 0) {
      return;
    }

    const localPointInches = createCountertopLocalPointFromRay(selectedCountertop, event.ray);

    if (localPointInches === null) {
      return;
    }

    event.stopPropagation();
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

    const localPointInches = createCountertopLocalPointFromRay(selectedCountertop, event.ray);

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
    commitCountertopCutoutDraft();
  }

  return (
    <mesh
      position={[0, 0, 0]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <planeGeometry args={[COUNTERTOP_DRAWING_SURFACE_SIZE_INCHES, COUNTERTOP_DRAWING_SURFACE_SIZE_INCHES]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function getCountertopCutoutDraftShapeKind(
  activeToolbarTool: DesignSceneStore["activeToolbarTool"],
): CountertopCutoutDraftShapeKind | null {
  if (activeToolbarTool === "draw-countertop-cutout-rectangle") {
    return "rectangle";
  }

  return null;
}
