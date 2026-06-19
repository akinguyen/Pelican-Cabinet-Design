import type { DesignScene } from "./designSceneTypes";

export type DesignSceneHistoryEntry = Readonly<{
  id: string;
  label: string;
  createdAtMs: number;
  designScene: DesignScene;
}>;

export type DesignSceneHistoryState = Readonly<{
  past: readonly DesignSceneHistoryEntry[];
  future: readonly DesignSceneHistoryEntry[];
}>;

export function createEmptyDesignSceneHistoryState(): DesignSceneHistoryState {
  return {
    past: [],
    future: [],
  };
}


const MAX_HISTORY_RESTORE_ENTRIES = 50;

export function getVisibleSceneHistoryEntries(
  entries: readonly DesignSceneHistoryEntry[],
): readonly DesignSceneHistoryEntry[] {
  return entries.slice(-MAX_HISTORY_RESTORE_ENTRIES).reverse();
}
