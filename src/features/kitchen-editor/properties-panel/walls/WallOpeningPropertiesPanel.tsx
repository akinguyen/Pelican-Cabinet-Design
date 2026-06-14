"use client";

import { MIN_WALL_OPENING_SIZE_INCHES } from "@/engine/walls/openings/wallOpeningFactory";
import type { WallOpening } from "@/engine/walls/placedWallSegmentTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { PropertyNumberField } from "../shared/PropertyNumberField";
import { PropertySection } from "../shared/PropertySection";

type WallOpeningPropertiesPanelProps = Readonly<{
  wallGraphId: string;
  wallSegmentId: string;
  opening: WallOpening;
}>;

export function WallOpeningPropertiesPanel({
  wallGraphId,
  wallSegmentId,
  opening,
}: WallOpeningPropertiesPanelProps) {
  const updateWallOpeningLeft = useDesignSceneStore((state) => state.updateWallOpeningLeft);
  const updateWallOpeningBottom = useDesignSceneStore((state) => state.updateWallOpeningBottom);
  const updateWallOpeningRectangleSize = useDesignSceneStore(
    (state) => state.updateWallOpeningRectangleSize,
  );
  const deleteWallOpening = useDesignSceneStore((state) => state.deleteWallOpening);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
          Selected Wall Cutout
        </div>
        <div className="mt-1 font-semibold text-slate-900">Rectangle Cutout</div>
        <div className="mt-1 text-[11px] text-slate-500">Face: {opening.faceSide}</div>
        <div className="mt-1 break-all text-[11px] text-slate-500">{opening.id}</div>
      </section>

      <PropertySection title="Placement">
        <div className="mt-3 grid grid-cols-2 gap-3">
          <PropertyNumberField
            label="Left along wall"
            value={opening.leftInchesAlongFace}
            min={0}
            step={0.25}
            onChange={(valueInches) =>
              updateWallOpeningLeft(
                wallGraphId,
                wallSegmentId,
                opening.id,
                valueInches,
              )
            }
          />
          <PropertyNumberField
            label="Bottom from floor"
            value={opening.bottomInchesFromFloor}
            min={0}
            step={0.25}
            onChange={(valueInches) =>
              updateWallOpeningBottom(
                wallGraphId,
                wallSegmentId,
                opening.id,
                valueInches,
              )
            }
          />
        </div>
      </PropertySection>

      <PropertySection title="Size">
        <div className="mt-3 grid grid-cols-2 gap-3">
          <PropertyNumberField
            label="Width"
            value={opening.widthInches}
            min={MIN_WALL_OPENING_SIZE_INCHES}
            step={0.25}
            onChange={(valueInches) =>
              updateWallOpeningRectangleSize(
                wallGraphId,
                wallSegmentId,
                opening.id,
                valueInches,
                opening.heightInches,
              )
            }
          />
          <PropertyNumberField
            label="Height"
            value={opening.heightInches}
            min={MIN_WALL_OPENING_SIZE_INCHES}
            step={0.25}
            onChange={(valueInches) =>
              updateWallOpeningRectangleSize(
                wallGraphId,
                wallSegmentId,
                opening.id,
                opening.widthInches,
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
          onClick={() => deleteWallOpening(wallGraphId, wallSegmentId, opening.id)}
        >
          Delete cutout
        </button>
      </section>
    </div>
  );
}
