"use client";

import type { ThreeEvent } from "@react-three/fiber";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getAssemblyDistanceFromFloorInches } from "@/engine/assemblies/placedAssemblyTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";

const PLACEMENT_SURFACE_SIZE_INCHES = 3200;

type PlacementSurfaceProps = Readonly<{
  sceneViewMode: SceneViewMode;
}>;

export function PlacementSurface({ sceneViewMode }: PlacementSurfaceProps) {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const updateAssemblyCandidateWorldPosition = useDesignSceneStore(
    (state) => state.updateAssemblyCandidateWorldPosition,
  );
  const commitAssemblyPlacementCandidate = useDesignSceneStore((state) => state.commitAssemblyPlacementCandidate);

  if (!canManuallyEditScene(workspaceMode) || activeSceneOperation?.kind !== "assembly-placement") {
    return null;
  }

  const heightInches = activeSceneOperation.placedAssembly.configuration.sizeInches.heightInches;
  const distanceFromFloorInches = getAssemblyDistanceFromFloorInches(activeSceneOperation.placedAssembly);

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    updateAssemblyCandidateWorldPosition(
      createAssemblyCandidatePositionFromPointerPoint(
        sceneViewMode,
        event.point,
        heightInches,
        distanceFromFloorInches,
      ),
      sceneViewMode,
    );
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    commitAssemblyPlacementCandidate();
  }

  if (sceneViewMode === "elevation") {
    return (
      <mesh
        position={[0, 0, 120]}
        rotation={[Math.PI / 2, 0, 0]}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
      >
        <planeGeometry args={[PLACEMENT_SURFACE_SIZE_INCHES, PLACEMENT_SURFACE_SIZE_INCHES]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    );
  }

  return (
    <mesh position={[0, 0, 0]} onPointerMove={handlePointerMove} onClick={handleClick}>
      <planeGeometry args={[PLACEMENT_SURFACE_SIZE_INCHES, PLACEMENT_SURFACE_SIZE_INCHES]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function createAssemblyCandidatePositionFromPointerPoint(
  sceneViewMode: SceneViewMode,
  point: { x: number; y: number; z: number },
  heightInches: number,
  distanceFromFloorInches: number,
): Point3DInches {
  if (sceneViewMode === "elevation") {
    return {
      xInches: point.x,
      yInches: 0,
      zInches: Math.max(heightInches / 2, point.z),
    };
  }

  return {
    xInches: point.x,
    yInches: point.y,
    zInches: distanceFromFloorInches + heightInches / 2,
  };
}
