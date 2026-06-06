import type { WallSplitDraft } from "./wallSplitDraftTypes";

export function createWallSplitDraftForTarget(
  targetPlacedWallId: string | null,
): WallSplitDraft {
  if (targetPlacedWallId === null) {
    return {
      phase: "waiting-for-target-wall",
    };
  }

  return {
    phase: "choosing-start",
    targetPlacedWallId,
    hoverAnchor: null,
  };
}
