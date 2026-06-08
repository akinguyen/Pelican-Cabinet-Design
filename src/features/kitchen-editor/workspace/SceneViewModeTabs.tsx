"use client";

import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";

const sceneViewModeTabs: readonly Readonly<{ id: SceneViewMode; label: string }>[] = [
  { id: "perspective", label: "Perspective" },
  { id: "floor-plan", label: "Floor Plan" },
  { id: "elevation", label: "Elevation" },
];

export function SceneViewModeTabs() {
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const setActiveSceneViewMode = useDesignSceneStore((state) => state.setActiveSceneViewMode);

  return (
    <nav className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      {sceneViewModeTabs.map((sceneViewModeTab) => {
        const isActive = activeSceneViewMode === sceneViewModeTab.id;

        return (
          <button
            key={sceneViewModeTab.id}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              isActive
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
            onClick={() => setActiveSceneViewMode(sceneViewModeTab.id)}
          >
            {sceneViewModeTab.label}
          </button>
        );
      })}
    </nav>
  );
}
