"use client";

import { useEffect } from "react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";

export function KeyboardShortcuts() {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const clearActiveInteraction = useDesignSceneStore((state) => state.clearActiveInteraction);
  const deleteSelectedAssembly = useDesignSceneStore((state) => state.deleteSelectedAssembly);
  const deleteSelectedPlacedWall = useDesignSceneStore((state) => state.deleteSelectedPlacedWall);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const deleteCountertopOpening = useDesignSceneStore((state) => state.deleteCountertopOpening);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableKeyboardTarget(event.target)) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        clearActiveInteraction();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();

        if (!canManuallyEditScene(workspaceMode)) {
          return;
        }
        if (activeSelection?.kind === "countertop-opening") {
          deleteCountertopOpening(activeSelection.countertopOpeningId);
          return;
        }

        deleteSelectedPlacedWall();
        deleteSelectedAssembly();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeSelection, clearActiveInteraction, deleteCountertopOpening, deleteSelectedAssembly, deleteSelectedPlacedWall, workspaceMode]);

  return null;
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}
