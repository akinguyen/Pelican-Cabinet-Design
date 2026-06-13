"use client";

import { Html } from "@react-three/drei";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Copy, Trash2 } from "lucide-react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { AssemblyPlacementFootprint } from "@/engine/assemblies/placement/assemblyPlacementTypes";

const EDIT_CONTROL_Z_INCHES = 12;

type AssemblyFloorPlanEditControlsProps = Readonly<{
  placedAssemblyId: string;
  footprint: AssemblyPlacementFootprint;
}>;

export function AssemblyFloorPlanEditControls({
  placedAssemblyId,
  footprint,
}: AssemblyFloorPlanEditControlsProps) {
  const duplicateSelectedAssembly = useDesignSceneStore((state) => state.duplicateSelectedAssembly);
  const deleteSelectedAssembly = useDesignSceneStore((state) => state.deleteSelectedAssembly);
  const topYInches = Math.min(...footprint.cornerPointsInches.map((pointInches) => pointInches.yInches));
  const centerXInches = footprint.centerPointInches.xInches;

  function stopPointerEvent(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  return (
    <Html
      center
      position={[centerXInches, topYInches - 14, EDIT_CONTROL_Z_INCHES]}
      style={{ pointerEvents: "auto", zIndex: 50 }}
    >
      <div
        className="flex items-center gap-1 rounded-lg border-2 border-cyan-400 bg-white px-2 py-1 shadow-lg"
        onPointerDown={stopPointerEvent}
        onPointerMove={stopPointerEvent}
        onPointerUp={stopPointerEvent}
      >
        <button
          type="button"
          className="rounded-md p-1.5 text-slate-600 transition hover:bg-cyan-50 hover:text-cyan-700"
          onClick={(event) => {
            event.stopPropagation();
            duplicateSelectedAssembly();
          }}
          title="Duplicate"
          aria-label={`Duplicate assembly ${placedAssemblyId}`}
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded-md p-1.5 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
          onClick={(event) => {
            event.stopPropagation();
            deleteSelectedAssembly();
          }}
          title="Delete"
          aria-label={`Delete assembly ${placedAssemblyId}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Html>
  );
}
