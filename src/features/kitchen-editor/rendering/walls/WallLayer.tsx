"use client";

import { buildWall } from "@/engine/walls/wallBuilding";
import { getWallPlanEdgeMeasurements, getWallPlanMeasurementFrame } from "@/engine/walls/footprint/wallPlanMeasurements";
import type { PlacedWall } from "@/engine/walls/wallTypes";
import type { WallFootprintDraft } from "@/engine/walls/footprint-draft/wallFootprintDraftTypes";
import type { WallSplitDraft } from "@/engine/walls/split-draft/wallSplitDraftTypes";
import type { SceneSelection } from "@/engine/scene/sceneSelectionTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { PlacedWallElevationSide } from "@/engine/walls/elevation/wallElevationGeometry";
import { WallMesh } from "./WallMesh";
import { WallFootprintDraftRenderer } from "./WallFootprintDraftRenderer";
import { SelectedWallBoundaryOverlay } from "./SelectedWallBoundaryOverlay";
import { WallSplitDraftRenderer } from "./WallSplitDraftRenderer";
import { WallPlanMeasurementOverlay } from "./WallPlanMeasurementOverlay";
import { WallPlanEdgeMeasurementLabels } from "./WallPlanEdgeMeasurementLabels";
import { WallElevationSideRenderer } from "./WallElevationSideRenderer";

type WallLayerProps = Readonly<{
  placedWalls: readonly PlacedWall[];
  activeSelection: SceneSelection | null;
  wallFootprintDraft: WallFootprintDraft | null;
  wallSplitDraft: WallSplitDraft | null;
  showPlanMeasurements: boolean;
  sceneViewMode: SceneViewMode;
  activeElevationSide: PlacedWallElevationSide | null;
}>;

export function WallLayer({
  placedWalls,
  activeSelection,
  wallFootprintDraft,
  wallSplitDraft,
  showPlanMeasurements,
  sceneViewMode,
  activeElevationSide,
}: WallLayerProps) {
  const selectedPlacedWallId = activeSelection?.kind === "placed-wall"
    ? activeSelection.placedWallId
    : null;
  const splitTargetPlacedWallId = wallSplitDraft?.phase === "choosing-start" || wallSplitDraft?.phase === "choosing-end"
    ? wallSplitDraft.targetPlacedWallId
    : null;
  const highlightedPlacedWallId = splitTargetPlacedWallId ?? selectedPlacedWallId;
  const builtWalls = placedWalls.map(buildWall);
  const highlightedBuiltWall = highlightedPlacedWallId === null
    ? null
    : builtWalls.find((builtWall) => builtWall.placedWallId === highlightedPlacedWallId) ?? null;
  const planMeasurementFrame = showPlanMeasurements
    ? getWallPlanMeasurementFrame(placedWalls)
    : null;
  const planEdgeMeasurements = showPlanMeasurements
    ? getWallPlanEdgeMeasurements(placedWalls)
    : [];
  const shouldShowWallBoundaryOverlay = sceneViewMode === "floor-plan";

  if (sceneViewMode === "elevation") {
    return (
      <group>
        {activeElevationSide !== null ? (
          <WallElevationSideRenderer activeElevationSide={activeElevationSide} />
        ) : null}
      </group>
    );
  }

  return (
    <group>
      {builtWalls
        .filter((builtWall) => builtWall.placedWallId !== selectedPlacedWallId)
        .map((builtWall) => (
          <WallMesh
            key={builtWall.id}
            builtWall={builtWall}
            isSelected={false}
            sceneViewMode={sceneViewMode}
          />
        ))}
      {builtWalls
        .filter((builtWall) => builtWall.placedWallId === selectedPlacedWallId)
        .map((builtWall) => (
          <WallMesh
            key={builtWall.id}
            builtWall={builtWall}
            isSelected
            sceneViewMode={sceneViewMode}
          />
        ))}
      {shouldShowWallBoundaryOverlay && highlightedBuiltWall !== null ? (
        <SelectedWallBoundaryOverlay builtWall={highlightedBuiltWall} />
      ) : null}
      <WallPlanMeasurementOverlay measurementFrame={planMeasurementFrame} />
      <WallPlanEdgeMeasurementLabels measurements={planEdgeMeasurements} />
      <WallFootprintDraftRenderer draft={wallFootprintDraft} />
      <WallSplitDraftRenderer draft={wallSplitDraft} />
    </group>
  );
}
