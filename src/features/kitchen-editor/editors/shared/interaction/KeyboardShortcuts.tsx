"use client";

import { useEffect } from "react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";

export function KeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableKeyboardTarget(event.target)) {
        return;
      }

      const isModifierPressed = event.metaKey || event.ctrlKey;

      if (isModifierPressed && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          useDesignSceneStore.getState().redoDesignSceneChange();
        } else {
          useDesignSceneStore.getState().undoDesignSceneChange();
        }
        return;
      }

      if (isModifierPressed && event.key.toLowerCase() === "y") {
        event.preventDefault();
        useDesignSceneStore.getState().redoDesignSceneChange();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        useDesignSceneStore.getState().clearActiveInteraction();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        const designSceneStore = useDesignSceneStore.getState();
        designSceneStore.deleteSelectedDesignReservationZone();
        designSceneStore.deleteSelectedWallSegment();
        designSceneStore.deleteSelectedAssembly();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
