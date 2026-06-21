"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useMemo } from "react";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getSceneEntitySizeInches } from "@/engine/scene-entities/sceneEntityTransforms";
import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import type { SceneEntityElevationFrame } from "@/engine/scene/sceneDragTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { createAssemblyDragPointerWorldPoint } from "../assemblies/assemblyDragPointer";
import { createElevationDragSurfaceMatrix } from "../elevation/createElevationDragSurfaceMatrix";
import { createSceneEntityElevationFrame } from "./sceneEntityElevationFrame";

const SURFACE_SIZE_INCHES = 3200;

export function SceneEntityPlacementSurface({ sceneViewMode }: Readonly<{ sceneViewMode: SceneViewMode }>) {
  const placementSceneEntity = useDesignSceneStore((state) => state.designScene.activeSceneOperation?.kind === "scene-entity-placement" ? state.designScene.activeSceneOperation.candidate.sceneEntity : null);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const activeWallElevationTarget = useDesignSceneStore((state) => state.activeWallElevationTarget);
  const elevationPlacementFrame = useMemo(() => sceneViewMode === "elevation" ? createSceneEntityElevationFrame({ placedWallGraphs, activeWallElevationTarget }) ?? null : null, [activeWallElevationTarget, placedWallGraphs, sceneViewMode]);
  const elevationPlacementSurfaceMatrix = useMemo(() => elevationPlacementFrame === null ? null : createElevationDragSurfaceMatrix(elevationPlacementFrame), [elevationPlacementFrame]);

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (placementSceneEntity === null) return;
    const pointerWorldInches = createAssemblyDragPointerWorldPoint(sceneViewMode, event.ray, placementSceneEntity.worldPositionInches.yInches, elevationPlacementFrame ?? undefined);
    if (pointerWorldInches === null) return;
    event.stopPropagation();
    useDesignSceneStore.getState().updateSceneEntityPlacementCandidate(createCandidatePosition({ sceneViewMode, pointerWorldInches, sceneEntity: placementSceneEntity, elevationPlacementFrame }), sceneViewMode, elevationPlacementFrame ?? undefined);
  }, [elevationPlacementFrame, placementSceneEntity, sceneViewMode]);
  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); useDesignSceneStore.getState().commitSceneEntityPlacementCandidate(); }, []);

  if (placementSceneEntity === null || (sceneViewMode === "elevation" && elevationPlacementSurfaceMatrix === null)) return null;
  if (sceneViewMode === "elevation" && elevationPlacementSurfaceMatrix !== null) {
    return <mesh matrix={elevationPlacementSurfaceMatrix} matrixAutoUpdate={false} onPointerMove={handlePointerMove} onClick={handleClick}><planeGeometry args={[SURFACE_SIZE_INCHES, SURFACE_SIZE_INCHES]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>;
  }
  return <mesh onPointerMove={handlePointerMove} onClick={handleClick}><planeGeometry args={[SURFACE_SIZE_INCHES, SURFACE_SIZE_INCHES]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>;
}

function createCandidatePosition(args: { sceneViewMode: SceneViewMode; pointerWorldInches: Point3DInches; sceneEntity: SceneEntity; elevationPlacementFrame: SceneEntityElevationFrame | null }): Point3DInches {
  const sizeInches = getSceneEntitySizeInches(args.sceneEntity);
  if (args.sceneViewMode === "elevation" && args.elevationPlacementFrame !== null) {
    return {
      xInches: args.pointerWorldInches.xInches + args.elevationPlacementFrame.outwardDirectionInches.xInches * (sizeInches.depthInches / 2),
      yInches: args.pointerWorldInches.yInches + args.elevationPlacementFrame.outwardDirectionInches.yInches * (sizeInches.depthInches / 2),
      zInches: Math.max(sizeInches.heightInches / 2, args.pointerWorldInches.zInches),
    };
  }
  return { xInches: args.pointerWorldInches.xInches, yInches: args.pointerWorldInches.yInches, zInches: args.sceneEntity.entityKind === "placed-assembly" ? args.sceneEntity.worldPositionInches.zInches : sizeInches.heightInches / 2 };
}
