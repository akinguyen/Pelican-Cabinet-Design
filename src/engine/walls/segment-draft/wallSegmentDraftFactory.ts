import type { WallSegmentDraft } from "./wallSegmentDraftTypes";

export function createEmptyWallSegmentDraft(args: {
  heightInches: number;
  thicknessInches: number;
}): WallSegmentDraft {
  return {
    activeStartAnchor: null,
    hoverAnchor: null,
    activeGuide: null,
    heightInches: args.heightInches,
    thicknessInches: args.thicknessInches,
  };
}
