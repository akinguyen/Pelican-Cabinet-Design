"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { createWallElevationCameraFrame } from "@/engine/walls/wallElevationCameraFrame";
import { getWallElevationViewZoneForTarget } from "@/engine/walls/wallElevationViewZone";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { WallOpeningScreenDraftLayer } from "../interaction/walls/WallOpeningScreenDraftLayer";
import { ElevationViewMaskOverlay } from "./elevation/ElevationViewMaskOverlay";
import { createWallElevationViewMaskFramePixels } from "./elevation/elevationViewMaskFrame";
import type { Size2DPixels } from "./elevation/elevationViewMaskFrame";
import { WallElevationNavigator } from "./elevation/WallElevationNavigator";
import { DesignSceneCanvas } from "./shared/scene-canvas/DesignSceneCanvas";

export function DesignSceneViewport() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewportSizePixels = useElementSizePixels(viewportRef);
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const placedWallGraphs = useDesignSceneStore((state) => state.designScene.placedWallGraphs);
  const activeWallElevationTarget = useDesignSceneStore((state) => state.activeWallElevationTarget);
  const activeElevationViewZone = useMemo(
    () => getWallElevationViewZoneForTarget({
      placedWallGraphs,
      activeWallElevationTarget,
    }),
    [activeWallElevationTarget, placedWallGraphs],
  );
  const elevationViewFramePixels = useMemo(() => {
    if (activeSceneViewMode !== "elevation" || activeElevationViewZone === null) {
      return null;
    }

    return createWallElevationViewMaskFramePixels({
      cameraFrame: createWallElevationCameraFrame({ viewZone: activeElevationViewZone }),
      viewZone: activeElevationViewZone,
      viewportSizePixels,
    });
  }, [activeElevationViewZone, activeSceneViewMode, viewportSizePixels]);

  return (
    <div ref={viewportRef} className="relative h-full min-h-0">
      <DesignSceneCanvas />
      {activeSceneViewMode === "elevation" ? (
        <ElevationViewMaskOverlay
          viewportSizePixels={viewportSizePixels}
          viewFramePixels={elevationViewFramePixels}
        />
      ) : null}
      <WallOpeningScreenDraftLayer />
      <WallElevationNavigator />
    </div>
  );
}

function useElementSizePixels(elementRef: RefObject<HTMLElement | null>): Size2DPixels {
  const [sizePixels, setSizePixels] = useState<Size2DPixels>({
    widthPixels: 0,
    heightPixels: 0,
  });

  useEffect(() => {
    const element = elementRef.current;

    if (element === null) {
      return;
    }

    function updateSizePixels() {
      setSizePixels({
        widthPixels: element.clientWidth,
        heightPixels: element.clientHeight,
      });
    }

    updateSizePixels();

    const resizeObserver = new ResizeObserver(updateSizePixels);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [elementRef]);

  return sizePixels;
}
