import { createEmptyWallReferenceGuides } from "../draft-guides/wallDraftGuides";
import type { WallFootprintDraft } from "./wallFootprintDraftTypes";

export function createEmptyWallFootprintDraft(heightInches: number): WallFootprintDraft {
  return {
    points: [],
    edges: [],
    activePointId: null,
    hoverPointInches: null,
    snapTarget: null,
    referenceGuides: createEmptyWallReferenceGuides(),
    angleGuide: null,
    parallelGuide: null,
    heightInches,
  };
}
