"use client";

import { DesignSceneViewport } from "./editors/DesignSceneViewport";
import { KeyboardShortcuts } from "./editors/shared/KeyboardShortcuts";
import { KitchenWorkspaceShell } from "./workspace/KitchenWorkspaceShell";

export function KitchenEditorApp() {
  return (
    <>
      <KeyboardShortcuts />
      <KitchenWorkspaceShell>
        <DesignSceneViewport />
      </KitchenWorkspaceShell>
    </>
  );
}
