import type { WallOpening } from "../placedWallSegmentTypes";
import type { WallOpeningDraft, WallOpeningDraftPointInches } from "./wallOpeningDraftTypes";
export const MIN_WALL_OPENING_SIZE_INCHES = 2;

export type WallOpeningFaceRectangleInches = Readonly<{
  leftInchesAlongFace: number;
  bottomInchesFromFloor: number;
  widthInches: number;
  heightInches: number;
}>;

export function clampWallOpeningDraftPoint(args: {
  facePointInches: WallOpeningDraftPointInches;
  faceLengthInches: number;
  wallHeightInches: number;
}): WallOpeningDraftPointInches {
  return {
    xInchesAlongFace: clamp(args.facePointInches.xInchesAlongFace, 0, args.faceLengthInches),
    zInchesFromFloor: clamp(args.facePointInches.zInchesFromFloor, 0, args.wallHeightInches),
  };
}

export function createWallOpeningFaceRectangleFromDraft(args: {
  draft: WallOpeningDraft;
  faceLengthInches: number;
  wallHeightInches: number;
}): WallOpeningFaceRectangleInches {
  const startPointInches = clampWallOpeningDraftPoint({
    facePointInches: args.draft.startFacePointInches,
    faceLengthInches: args.faceLengthInches,
    wallHeightInches: args.wallHeightInches,
  });
  const currentPointInches = clampWallOpeningDraftPoint({
    facePointInches: args.draft.currentFacePointInches,
    faceLengthInches: args.faceLengthInches,
    wallHeightInches: args.wallHeightInches,
  });
  const leftInchesAlongFace = Math.min(
    startPointInches.xInchesAlongFace,
    currentPointInches.xInchesAlongFace,
  );
  const rightInchesAlongFace = Math.max(
    startPointInches.xInchesAlongFace,
    currentPointInches.xInchesAlongFace,
  );
  const bottomInchesFromFloor = Math.min(
    startPointInches.zInchesFromFloor,
    currentPointInches.zInchesFromFloor,
  );
  const topInchesFromFloor = Math.max(
    startPointInches.zInchesFromFloor,
    currentPointInches.zInchesFromFloor,
  );
  const widthInches = rightInchesAlongFace - leftInchesAlongFace;
  const heightInches = topInchesFromFloor - bottomInchesFromFloor;

  return {
    leftInchesAlongFace,
    bottomInchesFromFloor,
    widthInches,
    heightInches,
  };
}

export function createWallOpeningFaceRectanglePoints(
  rectangleInches: WallOpeningFaceRectangleInches,
): readonly WallOpeningDraftPointInches[] {
  const leftInchesAlongFace = rectangleInches.leftInchesAlongFace;
  const rightInchesAlongFace = rectangleInches.leftInchesAlongFace + rectangleInches.widthInches;
  const bottomInchesFromFloor = rectangleInches.bottomInchesFromFloor;
  const topInchesFromFloor = rectangleInches.bottomInchesFromFloor + rectangleInches.heightInches;

  return [
    { xInchesAlongFace: leftInchesAlongFace, zInchesFromFloor: bottomInchesFromFloor },
    { xInchesAlongFace: rightInchesAlongFace, zInchesFromFloor: bottomInchesFromFloor },
    { xInchesAlongFace: rightInchesAlongFace, zInchesFromFloor: topInchesFromFloor },
    { xInchesAlongFace: leftInchesAlongFace, zInchesFromFloor: topInchesFromFloor },
  ];
}

export function createWallOpeningFaceRectangleFromOpening(
  opening: WallOpening,
): WallOpeningFaceRectangleInches {
  return {
    leftInchesAlongFace: opening.leftInchesAlongFace,
    bottomInchesFromFloor: opening.bottomInchesFromFloor,
    widthInches: opening.widthInches,
    heightInches: opening.heightInches,
  };
}

export function clampWallOpeningToFace(args: {
  opening: WallOpening;
  faceLengthInches: number;
  wallHeightInches: number;
}): WallOpening {
  const widthInches = clamp(
    args.opening.widthInches,
    MIN_WALL_OPENING_SIZE_INCHES,
    Math.max(MIN_WALL_OPENING_SIZE_INCHES, args.faceLengthInches),
  );
  const heightInches = clamp(
    args.opening.heightInches,
    MIN_WALL_OPENING_SIZE_INCHES,
    Math.max(MIN_WALL_OPENING_SIZE_INCHES, args.wallHeightInches),
  );
  const maxLeftInchesAlongFace = Math.max(0, args.faceLengthInches - widthInches);
  const maxBottomInchesFromFloor = Math.max(0, args.wallHeightInches - heightInches);

  return {
    ...args.opening,
    leftInchesAlongFace: clamp(args.opening.leftInchesAlongFace, 0, maxLeftInchesAlongFace),
    bottomInchesFromFloor: clamp(args.opening.bottomInchesFromFloor, 0, maxBottomInchesFromFloor),
    widthInches,
    heightInches,
  };
}

export function clampWallOpeningRectangleSize(args: {
  opening: WallOpening;
  widthInches: number;
  heightInches: number;
  faceLengthInches: number;
  wallHeightInches: number;
}): WallOpening {
  return clampWallOpeningToFace({
    opening: {
      ...args.opening,
      widthInches: args.widthInches,
      heightInches: args.heightInches,
    },
    faceLengthInches: args.faceLengthInches,
    wallHeightInches: args.wallHeightInches,
  });
}

export function clampWallOpeningPlacement(args: {
  opening: WallOpening;
  leftInchesAlongFace: number;
  bottomInchesFromFloor: number;
  faceLengthInches: number;
  wallHeightInches: number;
}): WallOpening {
  return clampWallOpeningToFace({
    opening: {
      ...args.opening,
      leftInchesAlongFace: args.leftInchesAlongFace,
      bottomInchesFromFloor: args.bottomInchesFromFloor,
    },
    faceLengthInches: args.faceLengthInches,
    wallHeightInches: args.wallHeightInches,
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
