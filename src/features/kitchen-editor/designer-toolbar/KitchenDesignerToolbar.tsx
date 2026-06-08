"use client";

import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { kitchenDesignerToolbarActions } from "./kitchenDesignerToolbarConfig";

export function KitchenDesignerToolbar() {
  const runCameraCommand = useDesignSceneStore((state) => state.runCameraCommand);

  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-3">
      {kitchenDesignerToolbarActions.map((toolbarAction) => {
        const Icon = toolbarAction.icon;

        return (
          <button
            key={`${toolbarAction.id}-${toolbarAction.label}`}
            type="button"
            disabled={toolbarAction.isDisabled === true}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-transparent px-2.5 text-sm text-slate-600 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent"
            title={toolbarAction.label}
            onClick={() => {
              if (toolbarAction.kind === "camera-command") {
                runCameraCommand(toolbarAction.id);
              }
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
