"use client";

import type { CountertopOpening } from "@/engine/countertops/countertopOpeningTypes";
import { MIN_COUNTERTOP_OPENING_SIZE_INCHES } from "@/engine/countertops/countertopOpeningFactory";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { PropertyNumberField } from "../shared/PropertyNumberField";
import { PropertySection } from "../shared/PropertySection";

type CountertopOpeningPropertiesPanelProps = Readonly<{
  opening: CountertopOpening;
}>;

export function CountertopOpeningPropertiesPanel({ opening }: CountertopOpeningPropertiesPanelProps) {
  const updateCountertopOpeningLocalCenterX = useDesignSceneStore(
    (state) => state.updateCountertopOpeningLocalCenterX,
  );
  const updateCountertopOpeningLocalCenterY = useDesignSceneStore(
    (state) => state.updateCountertopOpeningLocalCenterY,
  );
  const updateCountertopOpeningRectangleSize = useDesignSceneStore(
    (state) => state.updateCountertopOpeningRectangleSize,
  );
  const updateCountertopOpeningRotation = useDesignSceneStore(
    (state) => state.updateCountertopOpeningRotation,
  );
  const deleteCountertopOpening = useDesignSceneStore((state) => state.deleteCountertopOpening);
  const shape = opening.shape;

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
          Selected Cutout
        </div>
        <div className="mt-1 font-semibold text-slate-900">Rectangle Cutout</div>
        <div className="mt-1 break-all text-[11px] text-slate-500">{opening.id}</div>
      </section>

      <PropertySection title="Placement">
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
            label="Rotation"
            value={opening.localRotationDegrees}
            step={1}
            onChange={(valueDegrees) => updateCountertopOpeningRotation(opening.id, valueDegrees)}
          />
        </div>
      </PropertySection>

      <PropertySection title="Size">
        <div className="mt-3 grid grid-cols-2 gap-3">
          <PropertyNumberField
            label="Width"
            value={shape.widthInches}
            min={MIN_COUNTERTOP_OPENING_SIZE_INCHES}
            step={0.25}
            onChange={(valueInches) =>
              updateCountertopOpeningRectangleSize(
                opening.id,
                valueInches,
                shape.depthInches,
              )
            }
          />
          <PropertyNumberField
            label="Depth"
            value={shape.depthInches}
            min={MIN_COUNTERTOP_OPENING_SIZE_INCHES}
            step={0.25}
            onChange={(valueInches) =>
              updateCountertopOpeningRectangleSize(
                opening.id,
                shape.widthInches,
                valueInches,
              )
            }
          />
        </div>
      </PropertySection>

      <section className="rounded-lg border border-red-200 bg-red-50 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-red-700">
          Actions
        </div>
        <button
          type="button"
          className="mt-3 w-full rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
          onClick={() => deleteCountertopOpening(opening.id)}
        >
          Delete cutout
        </button>
      </section>
    </div>
  );
}
