import { createId } from "@/core/ids/createId";
import type { DesignScene } from "../designSceneTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import type { DesignSceneHistoryEntry } from "../sceneHistoryTypes";

const MAX_SCENE_HISTORY_ENTRIES = 100;
const MAX_HISTORY_RESTORE_ENTRIES = 50;

export function createSceneHistoryActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "undoDesignSceneChange" | "redoDesignSceneChange" | "restoreDesignSceneHistoryEntry" | "clearDesignSceneHistory"> {
  return {
    undoDesignSceneChange() {
      const state = get();
      const previousEntry = state.sceneHistory.past[state.sceneHistory.past.length - 1];

      if (previousEntry === undefined) {
        return;
      }

      const currentEntry = createHistoryEntry({
        label: "Redo point",
        designScene: state.designScene,
      });

      set({
        designScene: previousEntry.designScene,
        sceneHistory: {
          past: state.sceneHistory.past.slice(0, -1),
          future: [currentEntry, ...state.sceneHistory.future].slice(0, MAX_SCENE_HISTORY_ENTRIES),
        },
        activeDrag: null,
        assemblyPlacementFeedback: null,
        activeObjectAlignmentGuides: [],
      });
    },

    redoDesignSceneChange() {
      const state = get();
      const nextEntry = state.sceneHistory.future[0];

      if (nextEntry === undefined) {
        return;
      }

      const currentEntry = createHistoryEntry({
        label: "Undo point",
        designScene: state.designScene,
      });

      set({
        designScene: nextEntry.designScene,
        sceneHistory: {
          past: [...state.sceneHistory.past, currentEntry].slice(-MAX_SCENE_HISTORY_ENTRIES),
          future: state.sceneHistory.future.slice(1),
        },
        activeDrag: null,
        assemblyPlacementFeedback: null,
        activeObjectAlignmentGuides: [],
      });
    },

    restoreDesignSceneHistoryEntry(historyEntryId) {
      const state = get();
      const entryIndex = state.sceneHistory.past.findIndex((entry) => entry.id === historyEntryId);

      if (entryIndex < 0) {
        return;
      }

      const historyEntry = state.sceneHistory.past[entryIndex];
      const currentEntry = createHistoryEntry({
        label: "Restore point",
        designScene: state.designScene,
      });

      set({
        designScene: historyEntry.designScene,
        sceneHistory: {
          past: state.sceneHistory.past.slice(0, entryIndex),
          future: [currentEntry, ...state.sceneHistory.past.slice(entryIndex + 1).reverse(), ...state.sceneHistory.future].slice(0, MAX_SCENE_HISTORY_ENTRIES),
        },
        activeDrag: null,
        assemblyPlacementFeedback: null,
        activeObjectAlignmentGuides: [],
      });
    },

    clearDesignSceneHistory() {
      set({
        sceneHistory: {
          past: [],
          future: [],
        },
      });
    },
  };
}

export function recordDesignSceneHistoryEntry(args: {
  get: DesignSceneStoreGetter;
  set: DesignSceneStoreSetter;
  label: string;
  designScene?: DesignScene;
}): void {
  const state = args.get();
  const designScene = args.designScene ?? state.designScene;
  const previousEntry = state.sceneHistory.past[state.sceneHistory.past.length - 1];

  if (previousEntry?.designScene === designScene) {
    return;
  }

  args.set({
    sceneHistory: {
      past: [...state.sceneHistory.past, createHistoryEntry({ label: args.label, designScene })].slice(-MAX_SCENE_HISTORY_ENTRIES),
      future: [],
    },
  });
}

export function getVisibleSceneHistoryEntries(
  entries: readonly DesignSceneHistoryEntry[],
): readonly DesignSceneHistoryEntry[] {
  return entries.slice(-MAX_HISTORY_RESTORE_ENTRIES).reverse();
}

function createHistoryEntry(args: {
  label: string;
  designScene: DesignScene;
}): DesignSceneHistoryEntry {
  return {
    id: createId(),
    label: args.label,
    createdAtMs: Date.now(),
    designScene: args.designScene,
  };
}
