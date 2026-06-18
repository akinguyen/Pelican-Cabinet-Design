"use client";

import { useEffect } from "react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";

export function KeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableKeyboardTarget(event.target)) {
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
