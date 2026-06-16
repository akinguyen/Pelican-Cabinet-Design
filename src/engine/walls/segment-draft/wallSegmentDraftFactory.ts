import type { WallSegmentDraft } from "./wallSegmentDraftTypes";

export function createEmptyWallSegmentDraft(args: {
  heightInches: number;
  thicknessInches: number;
}): WallSegmentDraft {
  return {
    activeStartAnchor: null,
    hoverAnchor: null,
    activeGuides: [],
    heightInches: args.heightInches,
    thicknessInches: args.thicknessInches,
  };
}
