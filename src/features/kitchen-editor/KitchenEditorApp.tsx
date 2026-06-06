"use client";

import { EditorViewSwitcher } from "./editors/EditorViewSwitcher";
import { KeyboardShortcuts } from "./editors/shared/KeyboardShortcuts";
import { KitchenEditorShell } from "./layout/KitchenEditorShell";

export function KitchenEditorApp() {
  return (
    <>
      <KeyboardShortcuts />
      <KitchenEditorShell>
        <EditorViewSwitcher />
      </KitchenEditorShell>
    </>
  );
}
