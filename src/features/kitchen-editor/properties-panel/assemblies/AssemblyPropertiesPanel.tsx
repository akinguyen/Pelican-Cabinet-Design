"use client";

import { useCallback } from "react";
import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { AssemblyDimensionSection } from "./AssemblyDimensionSection";
import { AssemblyOptionGroupsSection } from "./AssemblyOptionGroupsSection";
import { SceneEntityTransformSection } from "../scene-entities/SceneEntityTransformSection";

type AssemblyPropertiesPanelProps = Readonly<{ placedAssembly: PlacedAssembly; definition: AssemblyDefinition }>;

export function AssemblyPropertiesPanel({ placedAssembly, definition }: AssemblyPropertiesPanelProps) {
  const handleDuplicate = useCallback(() => { useDesignSceneStore.getState().duplicateSelectedSceneEntities(); }, []);
  const handleDelete = useCallback(() => { useDesignSceneStore.getState().deleteSelectedSceneEntities(); }, []);
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-blue-200 bg-blue-50 p-3"><div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Selected Assembly</div><div className="mt-1 font-semibold text-slate-900">{definition.name}</div><div className="mt-1 break-all text-[11px] text-slate-500">{placedAssembly.id}</div></section>
      <SceneEntityTransformSection sceneEntity={placedAssembly} />
      <AssemblyDimensionSection placedAssembly={placedAssembly} definition={definition} />
      <AssemblyOptionGroupsSection placedAssembly={placedAssembly} definition={definition} />
      <section className="rounded-lg border border-slate-200 bg-white p-3"><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Actions</div><button type="button" className="mt-3 w-full rounded-md bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800" onClick={handleDuplicate}>Duplicate assembly</button><button type="button" className="mt-2 w-full rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700" onClick={handleDelete}>Delete assembly</button></section>
    </div>
  );
}
