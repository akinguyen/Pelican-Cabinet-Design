import { createId } from "@/core/ids/createId";
import type { WallOpening } from "../placedWallSegmentTypes";
import type { WallOpeningDraft } from "./wallOpeningDraftTypes";

export const MIN_WALL_OPENING_SIZE_INCHES = 2;

export function createWallOpeningFromDraft(args: {
  draft: WallOpeningDraft;
  faceLengthInches: number;
  wallHeightInches: number;
}): WallOpening | null {
  const leftInchesAlongFace = Math.max(
    0,
    Math.min(
      args.draft.startFacePointInches.xInchesAlongFace,
      args.draft.currentFacePointInches.xInchesAlongFace,
    ),
  );
  const rightInchesAlongFace = Math.min(
    args.faceLengthInches,
    Math.max(
      args.draft.startFacePointInches.xInchesAlongFace,
      args.draft.currentFacePointInches.xInchesAlongFace,
    ),
  );
  const bottomInchesFromFloor = Math.max(
    0,
    Math.min(
      args.draft.startFacePointInches.zInchesFromFloor,
      args.draft.currentFacePointInches.zInchesFromFloor,
    ),
  );
  const topInchesFromFloor = Math.min(
    args.wallHeightInches,
    Math.max(
      args.draft.startFacePointInches.zInchesFromFloor,
      args.draft.currentFacePointInches.zInchesFromFloor,
    ),
  );
  const widthInches = rightInchesAlongFace - leftInchesAlongFace;
  const heightInches = topInchesFromFloor - bottomInchesFromFloor;

  if (widthInches < MIN_WALL_OPENING_SIZE_INCHES || heightInches < MIN_WALL_OPENING_SIZE_INCHES) {
    return null;
  }

  return {
    id: createId(),
    wallSegmentId: args.draft.wallSegmentId,
    faceSide: args.draft.faceSide,
    leftInchesAlongFace,
    bottomInchesFromFloor,
    widthInches,
    heightInches,
  };
}
