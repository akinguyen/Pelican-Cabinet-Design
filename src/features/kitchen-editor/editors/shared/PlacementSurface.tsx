"use client";

import type { ThreeEvent } from "@react-three/fiber";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getAssemblyDistanceFromFloorInches } from "@/engine/assemblies/placedAssemblyTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { KitchenEditorView } from "./editorViewTypes";

const PLACEMENT_SURFACE_SIZE_INCHES = 3200;

type PlacementSurfaceProps = Readonly<{
  editorView: KitchenEditorView;
}>;

export function PlacementSurface({ editorView }: PlacementSurfaceProps) {
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const updateAssemblyCandidateWorldPosition = useDesignSceneStore(
    (state) => state.updateAssemblyCandidateWorldPosition,
  );
  const commitAssemblyPlacementCandidate = useDesignSceneStore((state) => state.commitAssemblyPlacementCandidate);

  if (activeSceneOperation?.kind !== "assembly-placement") {
    return null;
  }

  const heightInches = activeSceneOperation.placedAssembly.configuration.sizeInches.heightInches;
  const distanceFromFloorInches = getAssemblyDistanceFromFloorInches(activeSceneOperation.placedAssembly);

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    updateAssemblyCandidateWorldPosition(
      createAssemblyCandidatePositionFromPointerPoint(
        editorView,
        event.point,
        heightInches,
        distanceFromFloorInches,
      ),
    );
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    commitAssemblyPlacementCandidate();
  }

  if (editorView === "elevation") {
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
  editorView: KitchenEditorView,
  point: { x: number; y: number; z: number },
  heightInches: number,
  distanceFromFloorInches: number,
): Point3DInches {
  if (editorView === "elevation") {
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
