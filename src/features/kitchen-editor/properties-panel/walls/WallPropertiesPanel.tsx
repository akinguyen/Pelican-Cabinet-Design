"use client";

import type { PlacedWall } from "@/engine/walls/wallTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { WallHeightSection } from "./WallHeightSection";
import { WallViewableEdgesSection } from "./WallViewableEdgesSection";

type WallPropertiesPanelProps = Readonly<{
  placedWall: PlacedWall;
}>;

export function WallPropertiesPanel({ placedWall }: WallPropertiesPanelProps) {
  const deleteSelectedPlacedWall = useDesignSceneStore(
    (state) => state.deleteSelectedPlacedWall,
  );

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-cyan-200 bg-cyan-50 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">
          Selected Wall
        </div>
        <div className="mt-1 font-semibold text-slate-900">Placed Wall</div>
        <div className="mt-1 break-all text-[11px] text-slate-500">{placedWall.id}</div>
      </section>

      <WallHeightSection placedWall={placedWall} />
      <WallViewableEdgesSection placedWall={placedWall} />

      <button
        type="button"
        className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
        onClick={deleteSelectedPlacedWall}
      >
        Delete wall
      </button>
    </div>
  );
}
