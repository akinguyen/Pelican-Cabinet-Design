"use client";

import { shouldShowPlacedAssemblyInElevationView } from "@/engine/assemblies/elevation/assemblyElevationProjection";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { getActivePlacedWallElevationView } from "@/engine/walls/elevation/wallElevationGeometry";
import { AssemblyDragSurface } from "../../../interaction/assemblies/AssemblyDragSurface";
import { WallFootprintDraftSurface } from "../../../interaction/walls/WallFootprintDraftSurface";
import { WallSplitDraftSurface } from "../../../interaction/walls/WallSplitDraftSurface";
import { AssemblyLayer } from "../../../rendering/assemblies/AssemblyLayer";
import { AssemblyPlacementCandidateRenderer } from "../../../rendering/assemblies/AssemblyPlacementCandidateRenderer";
import { SelectedAssemblyOutlineLayer } from "../../../rendering/assemblies/SelectedAssemblyOutlineLayer";
import { WallLayer } from "../../../rendering/walls/WallLayer";

export function DesignSceneRenderer() {
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const placedWalls = useDesignSceneStore((state) => state.designScene.placedWalls);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const activeWallElevationWallId = useDesignSceneStore((state) => state.activeWallElevationWallId);
  const activeWallElevationEdgeIndex = useDesignSceneStore((state) => state.activeWallElevationEdgeIndex);
  const wallFootprintDraft =
    activeSceneOperation?.kind === "wall-footprint-draft"
      ? activeSceneOperation.wallFootprintDraft
      : null;
  const wallSplitDraft =
    activeSceneOperation?.kind === "wall-split-draft"
      ? activeSceneOperation.wallSplitDraft
      : null;
  const activeElevationView = activeSceneViewMode === "elevation"
    ? getActivePlacedWallElevationView({
        placedWalls,
        activeWallElevationWallId,
        activeWallElevationEdgeIndex,
      })
    : null;
  const activeElevationSide = activeElevationView?.side ?? null;

  const showFrontOutlineLines = activeSceneViewMode === "elevation";
  const showWallPlanMeasurements =
    activeSceneViewMode === "floor-plan" &&
    wallFootprintDraft === null &&
    wallSplitDraft === null;
  const visiblePlacedAssemblies = activeSceneViewMode === "elevation" && activeElevationSide !== null
    ? placedAssemblies.filter((placedAssembly) =>
        shouldShowPlacedAssemblyInElevationView({
          placedAssembly,
          activeElevationSide,
        }),
      )
    : placedAssemblies;

  return (
    <>
      <WallLayer
        placedWalls={placedWalls}
        activeSelection={activeSelection}
        wallFootprintDraft={wallFootprintDraft}
        wallSplitDraft={wallSplitDraft}
        showPlanMeasurements={showWallPlanMeasurements}
        sceneViewMode={activeSceneViewMode}
        activeElevationSide={activeElevationSide}
      />
      <AssemblyLayer
        placedAssemblies={visiblePlacedAssemblies}
        showFrontOutlineLines={showFrontOutlineLines}
      />
      <SelectedAssemblyOutlineLayer placedAssemblies={visiblePlacedAssemblies} activeSelection={activeSelection} />
      <AssemblyPlacementCandidateRenderer
        activeSceneOperation={activeSceneOperation}
        showFrontOutlineLines={showFrontOutlineLines}
      />
      <AssemblyDragSurface />
      <WallFootprintDraftSurface />
      <WallSplitDraftSurface />
    </>
  );
}
