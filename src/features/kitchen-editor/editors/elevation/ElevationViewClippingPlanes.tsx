"use client";

import { useEffect, useMemo } from "react";
import { Plane, Vector3 } from "three";
import { useThree } from "@react-three/fiber";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { getWallElevationViewZoneForTarget } from "@/engine/walls/wallElevationViewZone";
import type { WallElevationViewZone } from "@/engine/walls/wallElevationViewZone";

export function ElevationViewClippingPlanes() {
  const { gl } = useThree();
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const activeWallElevationTarget = useDesignSceneStore((state) => state.activeWallElevationTarget);

  const viewZone = useMemo(
    () => getWallElevationViewZoneForTarget({
      placedWallGraphs,
      activeWallElevationTarget,
    }),
    [activeWallElevationTarget, placedWallGraphs],
  );

  const clippingPlanes = useMemo(() => {
    if (activeSceneViewMode !== "elevation" || viewZone === null) {
      return [];
    }

    return createWallElevationViewClippingPlanes(viewZone);
  }, [activeSceneViewMode, viewZone]);

  useEffect(() => {
    const previousClippingPlanes = gl.clippingPlanes;
    const previousLocalClippingEnabled = gl.localClippingEnabled;

    gl.clippingPlanes = clippingPlanes;
    gl.localClippingEnabled = clippingPlanes.length > 0 || previousLocalClippingEnabled;

    return () => {
      gl.clippingPlanes = previousClippingPlanes;
      gl.localClippingEnabled = previousLocalClippingEnabled;
    };
  }, [clippingPlanes, gl]);

  return null;
}

function createWallElevationViewClippingPlanes(viewZone: WallElevationViewZone): Plane[] {
  const faceDirection = new Vector3(
    viewZone.faceDirectionInches.xInches,
    viewZone.faceDirectionInches.yInches,
    0,
  ).normalize();
  const faceStart = new Vector3(
    viewZone.faceStartInches.xInches,
    viewZone.faceStartInches.yInches,
    0,
  );
  const faceEnd = new Vector3(
    viewZone.faceEndInches.xInches,
    viewZone.faceEndInches.yInches,
    0,
  );

  return [
    new Plane(faceDirection.clone(), -faceDirection.dot(faceStart)),
    new Plane(faceDirection.clone().negate(), faceDirection.dot(faceEnd)),
    new Plane(new Vector3(0, 0, 1), 0),
    new Plane(new Vector3(0, 0, -1), viewZone.wallHeightInches),
  ];
}
