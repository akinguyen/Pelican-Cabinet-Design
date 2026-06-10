"use client";

import { useMemo } from "react";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { CountertopOpening } from "@/engine/countertops/countertopOpeningTypes";
import { doCountertopOpeningsOverlap } from "@/engine/countertops/countertopOpeningValidation";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { PropertyNumberField } from "../shared/PropertyNumberField";
import { PropertySection } from "../shared/PropertySection";

export const COUNTERTOP_SLAB_DEFINITION_ID = "countertop-slab";

type CountertopOpeningsSectionProps = Readonly<{
  placedAssembly: PlacedAssembly;
}>;

export function CountertopOpeningsSection({ placedAssembly }: CountertopOpeningsSectionProps) {
  const allCountertopOpenings = useDesignSceneStore(
    (state) => state.designScene.countertopOpenings,
  );
  const addCountertopOpening = useDesignSceneStore((state) => state.addCountertopOpening);
  const countertopOpenings = useMemo(
    () =>
      allCountertopOpenings.filter(
        (opening) => opening.hostCountertopId === placedAssembly.id,
      ),
    [allCountertopOpenings, placedAssembly.id],
  );

  return (
    <PropertySection title="Cutouts">
      <div className="mt-3 space-y-3">
        <button
          type="button"
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          onClick={() => addCountertopOpening(placedAssembly.id)}
        >
          Add cutout
        </button>

        {countertopOpenings.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
            No cutouts yet. Add a cutout, then adjust its local X/Y position and size.
          </p>
        ) : null}

        {countertopOpenings.map((opening, index) => (
          <CountertopOpeningEditor
            key={opening.id}
            opening={opening}
            openingLabel={`Cutout ${index + 1}`}
            siblingOpenings={countertopOpenings.filter(
              (siblingOpening) => siblingOpening.id !== opening.id,
            )}
          />
        ))}
      </div>
    </PropertySection>
  );
}

type CountertopOpeningEditorProps = Readonly<{
  opening: CountertopOpening;
  openingLabel: string;
  siblingOpenings: readonly CountertopOpening[];
}>;

function CountertopOpeningEditor({
  opening,
  openingLabel,
  siblingOpenings,
}: CountertopOpeningEditorProps) {
  const updateCountertopOpeningShape = useDesignSceneStore(
    (state) => state.updateCountertopOpeningShape,
  );
  const updateCountertopOpeningLocalCenterX = useDesignSceneStore(
    (state) => state.updateCountertopOpeningLocalCenterX,
  );
  const updateCountertopOpeningLocalCenterY = useDesignSceneStore(
    (state) => state.updateCountertopOpeningLocalCenterY,
  );
  const updateCountertopOpeningWidth = useDesignSceneStore(
    (state) => state.updateCountertopOpeningWidth,
  );
  const updateCountertopOpeningDepth = useDesignSceneStore(
    (state) => state.updateCountertopOpeningDepth,
  );
  const updateCountertopOpeningCornerRadius = useDesignSceneStore(
    (state) => state.updateCountertopOpeningCornerRadius,
  );
  const updateCountertopOpeningEdgeClearance = useDesignSceneStore(
    (state) => state.updateCountertopOpeningEdgeClearance,
  );
  const deleteCountertopOpening = useDesignSceneStore((state) => state.deleteCountertopOpening);
  const hasOverlap = siblingOpenings.some((siblingOpening) =>
    doCountertopOpeningsOverlap(opening, siblingOpening),
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-900">{openingLabel}</div>
          <div className="mt-0.5 text-[11px] text-slate-500">{opening.id}</div>
        </div>
        <button
          type="button"
          className="rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
          onClick={() => deleteCountertopOpening(opening.id)}
        >
          Delete
        </button>
      </div>

      <label className="mt-3 block text-xs text-slate-600">
        <span className="mb-1 block font-medium">Shape</span>
        <select
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          value={opening.shape}
          onChange={(event) => {
            const shape = event.target.value === "rectangle" ? "rectangle" : "rounded-rectangle";
            updateCountertopOpeningShape(opening.id, shape);
          }}
        >
          <option value="rounded-rectangle">Rounded rectangle</option>
          <option value="rectangle">Rectangle</option>
        </select>
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <PropertyNumberField
          label="X Position"
          value={opening.localCenterInches.xInches}
          step={0.25}
          onChange={(valueInches) => updateCountertopOpeningLocalCenterX(opening.id, valueInches)}
        />
        <PropertyNumberField
          label="Y Position"
          value={opening.localCenterInches.yInches}
          step={0.25}
          onChange={(valueInches) => updateCountertopOpeningLocalCenterY(opening.id, valueInches)}
        />
        <PropertyNumberField
          label="Width"
          value={opening.widthInches}
          min={1}
          step={0.25}
          onChange={(valueInches) => updateCountertopOpeningWidth(opening.id, valueInches)}
        />
        <PropertyNumberField
          label="Depth"
          value={opening.depthInches}
          min={1}
          step={0.25}
          onChange={(valueInches) => updateCountertopOpeningDepth(opening.id, valueInches)}
        />
        <PropertyNumberField
          label="Corner Radius"
          value={opening.cornerRadiusInches}
          min={0}
          step={0.25}
          onChange={(valueInches) =>
            updateCountertopOpeningCornerRadius(opening.id, valueInches)
          }
        />
        <PropertyNumberField
          label="Edge Clearance"
          value={opening.edgeClearanceInches}
          min={0}
          step={0.25}
          onChange={(valueInches) =>
            updateCountertopOpeningEdgeClearance(opening.id, valueInches)
          }
        />      </div>

      {hasOverlap ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] font-medium text-amber-700">
          This cutout overlaps another cutout on the same countertop.
        </p>
      ) : null}
    </section>
  );
}
