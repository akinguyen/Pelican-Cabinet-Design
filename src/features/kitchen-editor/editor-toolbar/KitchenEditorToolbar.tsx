"use client";

import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { DesignSceneStore } from "@/engine/scene/designSceneStoreTypes";
import type { SceneEditingTool } from "@/engine/scene/sceneEditingToolTypes";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";
import { kitchenEditorToolbarActions } from "./kitchenEditorToolbarConfig";

export function KitchenEditorToolbar() {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);

  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-3">
      {kitchenEditorToolbarActions.map((toolbarAction) => {
        const Icon = toolbarAction.icon;
        const isActive = toolbarAction.kind === "active-tool" && toolbarAction.id === activeToolbarTool;
        const isDisabled = toolbarAction.isDisabled === true || isToolbarActionDisabled({
          activeSceneViewMode,
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
              const designSceneStore = useDesignSceneStore.getState();

              if (toolbarAction.kind === "camera-command") {
                designSceneStore.runCameraCommand(toolbarAction.id);
                return;
              }

              designSceneStore.setActiveToolbarTool(isActive ? null : toolbarAction.id);
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
  toolbarTool: SceneEditingTool | null;
  workspaceMode: DesignSceneStore["workspaceMode"];
}>;

function isToolbarActionDisabled(args: ToolbarDisabledArgs): boolean {
  if (!canManuallyEditScene(args.workspaceMode) && args.toolbarTool !== null) {
    return true;
  }

  return args.toolbarTool === "draw-wall-segment" && args.activeSceneViewMode !== "floor-plan";
}
