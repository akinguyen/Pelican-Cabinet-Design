"use client";

import { useCallback, useMemo } from "react";
import type { PlacedWallNode } from "@/engine/walls/placedWallNodeTypes";
import type { PlacedWallSegment } from "@/engine/walls/placedWallSegmentTypes";
import {
  getPlanDistanceInches,
  getWallSegmentEndpointPoint,
} from "@/engine/walls/wallSegmentGeometry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { formatInchesLabel } from "../../shared/formatInchesLabel";
import { PropertyNumberField } from "../shared/PropertyNumberField";
import { PropertySection } from "../shared/PropertySection";

type WallSegmentPropertiesPanelProps = Readonly<{
  wallSegment: PlacedWallSegment;
  wallGraphNodes: readonly PlacedWallNode[];
}>;

export function WallSegmentPropertiesPanel({ wallSegment, wallGraphNodes }: WallSegmentPropertiesPanelProps) {
  const handleHeightChange = useCallback((heightInches: number) => {
    useDesignSceneStore.getState().updateSelectedWallSegmentHeight(heightInches);
  }, []);
  const handleThicknessChange = useCallback((thicknessInches: number) => {
    useDesignSceneStore.getState().updateSelectedWallSegmentThickness(thicknessInches);
  }, []);
  const handleDelete = useCallback(() => {
    useDesignSceneStore.getState().deleteSelectedWallSegment();
  }, []);
  const lengthInches = useMemo(() => {
    const startPointInches = getWallSegmentEndpointPoint(wallGraphNodes, wallSegment.startNodeId);
    const endPointInches = getWallSegmentEndpointPoint(wallGraphNodes, wallSegment.endNodeId);

    return startPointInches !== null && endPointInches !== null
      ? getPlanDistanceInches(startPointInches, endPointInches)
      : 0;
  }, [wallGraphNodes, wallSegment.endNodeId, wallSegment.startNodeId]);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-cyan-200 bg-cyan-50 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">
          Selected Wall Segment
        </div>
        <div className="mt-1 font-semibold text-slate-900">{wallSegment.name}</div>
        <div className="mt-1 break-all text-[11px] text-slate-500">{wallSegment.id}</div>
      </section>

      <PropertySection title="Segment Size">
        <div className="mt-3 space-y-3">
          <ReadOnlyWallMetric label="Length" valueInches={lengthInches} />
          <PropertyNumberField
            label="Height"
            value={wallSegment.heightInches}
            min={1}
            step={1}
            onChange={handleHeightChange}
          />
          <PropertyNumberField
            label="Thickness"
            value={wallSegment.thicknessInches}
            min={1}
            step={1}
            onChange={handleThicknessChange}
          />
        </div>
      </PropertySection>

      <button
        type="button"
        className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
        onClick={handleDelete}
      >
        Delete wall segment
      </button>
    </div>
  );
}

function ReadOnlyWallMetric({ label, valueInches }: Readonly<{ label: string; valueInches: number }>) {
  return (
    <div className="rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
      {label}: <span className="font-semibold text-slate-900">{formatInchesLabel(valueInches)}</span>
    </div>
  );
}
