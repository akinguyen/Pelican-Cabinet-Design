import { createId } from "@/core/ids/createId";
import type { WallOpening } from "../placedWallSegmentTypes";
import type { WallOpeningDraft } from "./wallOpeningDraftTypes";
import {
  createWallOpeningFaceRectangleFromDraft,
  MIN_WALL_OPENING_SIZE_INCHES,
} from "./wallOpeningGeometry";

export { MIN_WALL_OPENING_SIZE_INCHES };

export function createWallOpeningFromDraft(args: {
  draft: WallOpeningDraft;
  faceLengthInches: number;
  wallHeightInches: number;
}): WallOpening | null {
  const rectangleInches = createWallOpeningFaceRectangleFromDraft(args);

  if (
    rectangleInches.widthInches < MIN_WALL_OPENING_SIZE_INCHES ||
    rectangleInches.heightInches < MIN_WALL_OPENING_SIZE_INCHES
  ) {
    return null;
  }

  return {
    id: createId(),
    wallSegmentId: args.draft.wallSegmentId,
    faceSide: args.draft.faceSide,
    ...rectangleInches,
  };
}
