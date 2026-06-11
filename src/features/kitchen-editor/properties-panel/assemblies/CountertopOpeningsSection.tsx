"use client";

import { useMemo } from "react";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { CountertopOpening } from "@/engine/countertops/countertopOpeningTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { PropertySection } from "../shared/PropertySection";

export const COUNTERTOP_SLAB_DEFINITION_ID = "countertop-slab";

type CountertopOpeningsSectionProps = Readonly<{
  placedAssembly: PlacedAssembly;
}>;

export function CountertopOpeningsSection({ placedAssembly }: CountertopOpeningsSectionProps) {
  const allCountertopOpenings = useDesignSceneStore(
    (state) => state.designScene.countertopOpenings,
  );
  const selectCountertopOpening = useDesignSceneStore((state) => state.selectCountertopOpening);
  const deleteCountertopOpening = useDesignSceneStore((state) => state.deleteCountertopOpening);
  const countertopOpenings = useMemo(
    () => allCountertopOpenings.filter((opening) => opening.hostCountertopId === placedAssembly.id),
    [allCountertopOpenings, placedAssembly.id],
  );

  return (
    <PropertySection title="Cutouts">
      {countertopOpenings.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
          Use Rectangle cutout in the toolbar to draw manual cutouts on this countertop.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {countertopOpenings.map((countertopOpening, index) => (
            <section
              key={countertopOpening.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    {getCountertopOpeningLabel(index)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {getCountertopOpeningSizeLabel(countertopOpening)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {getCountertopOpeningPositionLabel(countertopOpening)}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  onClick={() => selectCountertopOpening(countertopOpening.id)}
                >
                  Select
                </button>
                <button
                  type="button"
                  className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                  onClick={() => deleteCountertopOpening(countertopOpening.id)}
                >
                  Delete
                </button>
              </div>
            </section>
          ))}
        </div>
      )}
    </PropertySection>
  );
}

function getCountertopOpeningLabel(index: number): string {
  return `Rectangle Cutout ${index + 1}`;
}

function getCountertopOpeningSizeLabel(opening: CountertopOpening): string {
  return `${formatNumber(opening.shape.widthInches)}" × ${formatNumber(opening.shape.depthInches)}"`;
}

function getCountertopOpeningPositionLabel(opening: CountertopOpening): string {
  return `X: ${formatNumber(opening.localCenterInches.xInches)}"   Y: ${formatNumber(opening.localCenterInches.yInches)}"`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
