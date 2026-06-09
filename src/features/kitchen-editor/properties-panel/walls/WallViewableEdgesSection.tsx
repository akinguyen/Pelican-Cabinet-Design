"use client";

import { getPlacedWallViewableEdgeIndices } from "@/engine/walls/elevation/wallViewableEdges";
import { getWallFootprintEdgeMeasurements } from "@/engine/walls/footprint/wallFootprintMeasurements";
import { formatInchesLabel } from "../../shared/formatInchesLabel";
import type { PlacedWall } from "@/engine/walls/wallTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { PropertySection } from "../shared/PropertySection";

const EMPTY_VIEWABLE_EDGE_SET = new Set<number>();

type WallViewableEdgesSectionProps = Readonly<{
  placedWall: PlacedWall;
}>;

export function WallViewableEdgesSection({ placedWall }: WallViewableEdgesSectionProps) {
  const updateSelectedPlacedWallViewableEdge = useDesignSceneStore(
    (state) => state.updateSelectedPlacedWallViewableEdge,
  );
  const edgeMeasurements = getWallFootprintEdgeMeasurements(placedWall.footprint);
  const viewableEdgeIndices = getPlacedWallViewableEdgeIndices(placedWall);
  const viewableEdgeIndexSet = viewableEdgeIndices.length > 0
    ? new Set(viewableEdgeIndices)
    : EMPTY_VIEWABLE_EDGE_SET;

  return (
    <PropertySection
      title="Elevation sides"
      description="Checked sides are available in the elevation view. Keep the meaningful wall faces selected and leave short thickness or cut edges off."
    >
      <div className="mt-3 space-y-2">
        {edgeMeasurements.map((measurement) => (
          <label
            key={`viewable-edge-${measurement.edgeIndex}`}
            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-2 py-1.5 text-xs text-slate-700"
          >
            <span>
              <span className="font-semibold text-slate-900">
                Side {measurement.edgeIndex + 1}
              </span>
              <span className="ml-2 text-slate-500">{formatInchesLabel(measurement.lengthInches)}</span>
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-red-600"
              checked={viewableEdgeIndexSet.has(measurement.edgeIndex)}
              onChange={(event) =>
                updateSelectedPlacedWallViewableEdge(
                  measurement.edgeIndex,
                  event.currentTarget.checked,
                )
              }
            />
          </label>
        ))}
      </div>
    </PropertySection>
  );
}
