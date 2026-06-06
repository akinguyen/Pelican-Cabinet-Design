"use client";

import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { editorToolbarActions } from "./editorToolbarConfig";

export function EditorToolbar() {
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const runCameraCommand = useDesignSceneStore((state) => state.runCameraCommand);
  const setActiveToolbarTool = useDesignSceneStore((state) => state.setActiveToolbarTool);

  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-3">
      {editorToolbarActions.map((toolbarAction) => {
        const Icon = toolbarAction.icon;
        const isActive = toolbarAction.kind === "active-tool" && toolbarAction.id === activeToolbarTool;

        return (
          <button
            key={`${toolbarAction.id}-${toolbarAction.label}`}
            type="button"
            disabled={toolbarAction.isDisabled === true}
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
