"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useMemo } from "react";
import { Matrix4, Vector3 } from "three";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getAssemblyDistanceFromFloorInches } from "@/engine/assemblies/placedAssemblyTypes";
import type { AssemblyPlacementElevationFrame } from "@/engine/assemblies/placement/assemblyPlacementTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { WallElevationTarget } from "@/engine/walls/wallSegmentElevationTypes";
import { getWallElevationViewZoneForTarget } from "@/engine/walls/wallElevationViewZone";

const PLACEMENT_SURFACE_SIZE_INCHES = 3200;
const MIN_FACE_LENGTH_INCHES = 0.000001;

type PlacementSurfaceProps = Readonly<{
  sceneViewMode: SceneViewMode;
}>;

export function PlacementSurface({ sceneViewMode }: PlacementSurfaceProps) {
  const placementAssembly = useDesignSceneStore((state) => state.designScene.activeSceneOperation?.kind === "assembly-placement"
    ? state.designScene.activeSceneOperation.placedAssembly
    : null);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const activeWallElevationTarget = useDesignSceneStore((state) => state.activeWallElevationTarget);

  const elevationPlacementFrame = useMemo(
    () => sceneViewMode === "elevation"
      ? createElevationPlacementFrame({
          placedWallGraphs,
          activeWallElevationTarget,
        })
      : null,
    [activeWallElevationTarget, placedWallGraphs, sceneViewMode],
  );
  const elevationPlacementSurfaceMatrix = useMemo(
    () => elevationPlacementFrame === null
      ? null
      : createElevationPlacementSurfaceMatrix(elevationPlacementFrame),
    [elevationPlacementFrame],
  );

  const heightInches = placementAssembly?.configuration.sizeInches.heightInches ?? 0;
  const depthInches = placementAssembly?.configuration.sizeInches.depthInches ?? 0;
  const distanceFromFloorInches = placementAssembly === null
    ? 0
    : getAssemblyDistanceFromFloorInches(placementAssembly);

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (placementAssembly === null) {
      return;
    }

    event.stopPropagation();
    useDesignSceneStore.getState().updateAssemblyCandidateWorldPosition(
      createAssemblyCandidatePositionFromPointerPoint({
        sceneViewMode,
        point: event.point,
        heightInches,
        depthInches,
        distanceFromFloorInches,
        elevationPlacementFrame,
      }),
      sceneViewMode,
      elevationPlacementFrame ?? undefined,
    );
  }, [
    depthInches,
    distanceFromFloorInches,
    elevationPlacementFrame,
    heightInches,
    placementAssembly,
    sceneViewMode,
  ]);

  const handleClick = useCallback((event: ThreeEvent<MouseEvent>) => {
    if (placementAssembly === null) {
      return;
    }

    event.stopPropagation();
    useDesignSceneStore.getState().commitAssemblyPlacementCandidate();
  }, [placementAssembly]);

  if (placementAssembly === null) {
    return null;
  }

  if (sceneViewMode === "elevation" && elevationPlacementSurfaceMatrix !== null) {
    return (
      <mesh
        matrix={elevationPlacementSurfaceMatrix}
        matrixAutoUpdate={false}
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

function createAssemblyCandidatePositionFromPointerPoint(args: {
  sceneViewMode: SceneViewMode;
  point: { x: number; y: number; z: number };
  heightInches: number;
  depthInches: number;
  distanceFromFloorInches: number;
  elevationPlacementFrame: AssemblyPlacementElevationFrame | null;
}): Point3DInches {
  if (args.sceneViewMode === "elevation" && args.elevationPlacementFrame !== null) {
    return {
      xInches:
        args.point.x +
        args.elevationPlacementFrame.outwardDirectionInches.xInches * (args.depthInches / 2),
      yInches:
        args.point.y +
        args.elevationPlacementFrame.outwardDirectionInches.yInches * (args.depthInches / 2),
      zInches: Math.max(args.heightInches / 2, args.point.z),
    };
  }

  if (args.sceneViewMode === "elevation") {
    return {
      xInches: args.point.x,
      yInches: 0,
      zInches: Math.max(args.heightInches / 2, args.point.z),
    };
  }

  return {
    xInches: args.point.x,
    yInches: args.point.y,
    zInches: args.distanceFromFloorInches + args.heightInches / 2,
  };
}

function createElevationPlacementFrame(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  activeWallElevationTarget: WallElevationTarget | null;
}): AssemblyPlacementElevationFrame | null {
  const viewZone = getWallElevationViewZoneForTarget({
    placedWallGraphs: args.placedWallGraphs,
    activeWallElevationTarget: args.activeWallElevationTarget,
  });

  if (viewZone === null) {
    return null;
  }

  const faceLengthInches = Math.max(viewZone.faceLengthInches, MIN_FACE_LENGTH_INCHES);

  return {
    faceDirectionInches: {
      xInches: (viewZone.faceEndInches.xInches - viewZone.faceStartInches.xInches) / faceLengthInches,
      yInches: (viewZone.faceEndInches.yInches - viewZone.faceStartInches.yInches) / faceLengthInches,
      zInches: 0,
    },
    outwardDirectionInches: {
      xInches: viewZone.outwardDirectionInches.xInches,
      yInches: viewZone.outwardDirectionInches.yInches,
      zInches: 0,
    },
    planeOriginInches: viewZone.faceCenterInches,
    viewZoneInches: {
      originInches: viewZone.faceCenterInches,
      leftInches: viewZone.viewFrameLeftInches,
      rightInches: viewZone.viewFrameRightInches,
      nearDepthInches: -viewZone.behindFaceDepthInches,
      farDepthInches: viewZone.depthInches,
      bottomInches: 0,
      topInches: viewZone.wallHeightInches,
    },
  };
}

function createElevationPlacementSurfaceMatrix(
  elevationPlacementFrame: AssemblyPlacementElevationFrame,
): Matrix4 {
  const xAxis = new Vector3(
    elevationPlacementFrame.faceDirectionInches.xInches,
    elevationPlacementFrame.faceDirectionInches.yInches,
    elevationPlacementFrame.faceDirectionInches.zInches,
  ).normalize();
  const yAxis = new Vector3(0, 0, 1);
  const zAxis = new Vector3(
    elevationPlacementFrame.outwardDirectionInches.xInches,
    elevationPlacementFrame.outwardDirectionInches.yInches,
    elevationPlacementFrame.outwardDirectionInches.zInches,
  ).normalize();
  const origin = new Vector3(
    elevationPlacementFrame.planeOriginInches.xInches,
    elevationPlacementFrame.planeOriginInches.yInches,
    elevationPlacementFrame.planeOriginInches.zInches,
  );

  return new Matrix4().makeBasis(xAxis, yAxis, zAxis).setPosition(origin);
}
