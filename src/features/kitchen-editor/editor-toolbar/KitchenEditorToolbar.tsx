"use client";

import { getAssemblyDefinition } from "@/engine/assemblies/assemblyRegistry";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { DesignSceneStore } from "@/engine/scene/designSceneStoreTypes";
import type { SceneEditingTool } from "@/engine/scene/sceneEditingToolTypes";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";
import { kitchenEditorCatalogRegistry } from "../catalogs/registry/kitchenEditorCatalogRegistry";
import { kitchenEditorToolbarActions } from "./kitchenEditorToolbarConfig";

const COUNTERTOP_SLAB_DEFINITION_ID = "countertop-slab";

export function KitchenEditorToolbar() {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const runCameraCommand = useDesignSceneStore((state) => state.runCameraCommand);
  const setActiveToolbarTool = useDesignSceneStore((state) => state.setActiveToolbarTool);

  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-3">
      {kitchenEditorToolbarActions.map((toolbarAction) => {
        const Icon = toolbarAction.icon;
        const isActive = toolbarAction.kind === "active-tool" && toolbarAction.id === activeToolbarTool;
        const isDisabled = toolbarAction.isDisabled === true || isToolbarActionDisabled({
          activeSceneViewMode,
          activeSelection,
          placedAssemblies,
          toolbarTool: toolbarAction.kind === "active-tool" ? toolbarAction.id : null,
          workspaceMode,
        });

        return (
          <button
            key={`${toolbarAction.id}-${toolbarAction.label}`}
            type="button"
            disabled={isDisabled}
            className={`inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent ${
              isActive
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"
            }`}
            title={toolbarAction.label}
            onClick={() => {
              if (toolbarAction.kind === "camera-command") {
                runCameraCommand(toolbarAction.id);
                return;
              }

              setActiveToolbarTool(isActive ? null : toolbarAction.id);
            }}
          >
            <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
            <span>{toolbarAction.label}</span>
          </button>
        );
      })}
    </div>
  );
}

type ToolbarDisabledArgs = Readonly<{
  activeSceneViewMode: DesignSceneStore["activeSceneViewMode"];
  activeSelection: DesignSceneStore["designScene"]["activeSelection"];
  placedAssemblies: DesignSceneStore["designScene"]["placedAssemblies"];
  toolbarTool: SceneEditingTool | null;
  workspaceMode: DesignSceneStore["workspaceMode"];
}>;

function isToolbarActionDisabled(args: ToolbarDisabledArgs): boolean {
  if (!canManuallyEditScene(args.workspaceMode) && args.toolbarTool !== null) {
    return true;
  }

  if (!isCountertopCutoutTool(args.toolbarTool)) {
    return false;
  }

  if (args.activeSceneViewMode === "elevation") {
    return true;
  }

  if (args.activeSelection?.kind !== "placed-assembly") {
    return true;
  }

  const selectedPlacedAssemblyId = args.activeSelection.placedAssemblyId;
  const selectedAssembly = args.placedAssemblies.find(
    (assembly) => assembly.id === selectedPlacedAssemblyId,
  );

  if (selectedAssembly === undefined) {
    return true;
  }

  const selectedDefinition = getAssemblyDefinition(
    kitchenEditorCatalogRegistry,
    selectedAssembly.definitionId,
  );

  if (selectedDefinition?.id !== COUNTERTOP_SLAB_DEFINITION_ID) {
    return true;
  }

  return false;
}

function isCountertopCutoutTool(toolbarTool: SceneEditingTool | null): boolean {
  return (
    toolbarTool === "draw-countertop-cutout-rectangle"
  );
}
