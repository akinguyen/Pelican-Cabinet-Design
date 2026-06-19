import { createId } from "@/core/ids/createId";
import type { DesignScene } from "../designSceneTypes";
import type { DesignSceneHistoryEntry } from "../sceneHistoryTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

const MAX_SCENE_HISTORY_ENTRIES = 100;

export function createSceneHistoryActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "undoDesignSceneChange" | "redoDesignSceneChange" | "restoreDesignSceneHistoryEntry"> {
  return {
    undoDesignSceneChange() {
      const state = get();
      const previousEntry = state.sceneHistory.past[state.sceneHistory.past.length - 1];

      if (previousEntry === undefined) {
        return;
      }

      set({
        designScene: previousEntry.designScene,
        sceneHistory: {
          past: state.sceneHistory.past.slice(0, -1),
          future: [createHistoryEntry({ label: previousEntry.label, designScene: state.designScene }), ...state.sceneHistory.future].slice(0, MAX_SCENE_HISTORY_ENTRIES),
        },
        activeToolbarTool: null,
        cameraCommand: null,
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

      set({
        designScene: nextEntry.designScene,
        sceneHistory: {
          past: [...state.sceneHistory.past, createHistoryEntry({ label: nextEntry.label, designScene: state.designScene })].slice(-MAX_SCENE_HISTORY_ENTRIES),
          future: state.sceneHistory.future.slice(1),
        },
        activeToolbarTool: null,
        cameraCommand: null,
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
      const restoredFutureEntries = createFutureEntriesAfterHistoryRestore({
        pastEntries: state.sceneHistory.past,
        restoredEntryIndex: entryIndex,
        currentDesignScene: state.designScene,
      });

      set({
        designScene: historyEntry.designScene,
        sceneHistory: {
          past: state.sceneHistory.past.slice(0, entryIndex),
          future: [...restoredFutureEntries, ...state.sceneHistory.future].slice(0, MAX_SCENE_HISTORY_ENTRIES),
        },
        activeToolbarTool: null,
        cameraCommand: null,
        activeDrag: null,
        assemblyPlacementFeedback: null,
        activeObjectAlignmentGuides: [],
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


function createFutureEntriesAfterHistoryRestore(args: {
  pastEntries: readonly DesignSceneHistoryEntry[];
  restoredEntryIndex: number;
  currentDesignScene: DesignScene;
}): readonly DesignSceneHistoryEntry[] {
  const entriesAfterRestoredEntry = args.pastEntries.slice(args.restoredEntryIndex + 1);
  const futureEntries = entriesAfterRestoredEntry.map((entry, index) => createHistoryEntry({
    label: args.pastEntries[args.restoredEntryIndex + index].label,
    designScene: entry.designScene,
  }));
  const lastPastEntry = args.pastEntries[args.pastEntries.length - 1];

  if (lastPastEntry === undefined) {
    return futureEntries;
  }

  return [
    ...futureEntries,
    createHistoryEntry({
      label: lastPastEntry.label,
      designScene: args.currentDesignScene,
    }),
  ];
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
