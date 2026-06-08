import type { KitchenWorkspaceMode } from "./kitchenWorkspaceModeTypes";

export function canManuallyEditScene(workspaceMode: KitchenWorkspaceMode): boolean {
  return workspaceMode === "editor";
}
