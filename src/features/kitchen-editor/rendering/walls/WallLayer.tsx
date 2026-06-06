"use client";

import { buildWall } from "@/engine/walls/wallBuilding";
import type { PlacedWall } from "@/engine/walls/wallTypes";
import type { WallFootprintDraft } from "@/engine/walls/footprint-draft/wallFootprintDraftTypes";
import type { WallSplitDraft } from "@/engine/walls/split-draft/wallSplitDraftTypes";
import type { SceneSelection } from "@/engine/scene/sceneSelectionTypes";
import { WallMeasurementGuides } from "./WallMeasurementGuides";
import { WallMesh } from "./WallMesh";
import { WallFootprintDraftRenderer } from "./WallFootprintDraftRenderer";
import { SelectedWallBoundaryOverlay } from "./SelectedWallBoundaryOverlay";
import { WallSplitDraftRenderer } from "./WallSplitDraftRenderer";

type WallLayerProps = Readonly<{
  placedWalls: readonly PlacedWall[];
  activeSelection: SceneSelection | null;
  wallFootprintDraft: WallFootprintDraft | null;
  wallSplitDraft: WallSplitDraft | null;
}>;

export function WallLayer({
  placedWalls,
  activeSelection,
  wallFootprintDraft,
  wallSplitDraft,
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

  return (
    <group>
      {builtWalls
        .filter((builtWall) => builtWall.placedWallId !== selectedPlacedWallId)
        .map((builtWall) => (
          <WallMesh
            key={builtWall.id}
            builtWall={builtWall}
            isSelected={false}
          />
        ))}
      {builtWalls
        .filter((builtWall) => builtWall.placedWallId === selectedPlacedWallId)
        .map((builtWall) => (
          <WallMesh
            key={builtWall.id}
            builtWall={builtWall}
            isSelected
          />
        ))}
      {builtWalls.map((builtWall) => (
        <WallMeasurementGuides
          key={`wall-measurements-${builtWall.id}`}
          measurements={builtWall.edgeMeasurements}
        />
      ))}
      {highlightedBuiltWall !== null ? (
        <SelectedWallBoundaryOverlay builtWall={highlightedBuiltWall} />
      ) : null}
      <WallFootprintDraftRenderer draft={wallFootprintDraft} />
      <WallSplitDraftRenderer draft={wallSplitDraft} />
    </group>
  );
}
