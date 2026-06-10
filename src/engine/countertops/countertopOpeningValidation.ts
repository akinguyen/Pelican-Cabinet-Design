import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { CountertopOpening } from "./countertopOpeningTypes";

const MIN_COUNTERTOP_OPENING_SIZE_INCHES = 1;
const MIN_COUNTERTOP_OPENING_EDGE_CLEARANCE_INCHES = 0;

export function fitCountertopOpeningToHost(
  opening: CountertopOpening,
  countertopSizeInches: Size3DInches,
): CountertopOpening {
  const edgeClearanceInches = Math.max(
    MIN_COUNTERTOP_OPENING_EDGE_CLEARANCE_INCHES,
    opening.edgeClearanceInches,
  );
  const maxWidthInches = Math.max(
    MIN_COUNTERTOP_OPENING_SIZE_INCHES,
    countertopSizeInches.widthInches - edgeClearanceInches * 2,
  );
  const maxDepthInches = Math.max(
    MIN_COUNTERTOP_OPENING_SIZE_INCHES,
    countertopSizeInches.depthInches - edgeClearanceInches * 2,
  );
  const widthInches = clampNumber(
    opening.widthInches,
    MIN_COUNTERTOP_OPENING_SIZE_INCHES,
    maxWidthInches,
  );
  const depthInches = clampNumber(
    opening.depthInches,
    MIN_COUNTERTOP_OPENING_SIZE_INCHES,
    maxDepthInches,
  );
  const openingBoundsInches = createCountertopOpeningAabb({
    ...opening,
    widthInches,
    depthInches,
    edgeClearanceInches,
  });
  const halfAvailableWidthInches = Math.max(
    0,
    countertopSizeInches.widthInches / 2 - edgeClearanceInches - openingBoundsInches.halfWidthInches,
  );
  const halfAvailableDepthInches = Math.max(
    0,
    countertopSizeInches.depthInches / 2 - edgeClearanceInches - openingBoundsInches.halfDepthInches,
  );
  const maxCornerRadiusInches = Math.min(widthInches, depthInches) / 2;

  return {
    ...opening,
    localCenterInches: {
      xInches: clampNumber(
        opening.localCenterInches.xInches,
        -halfAvailableWidthInches,
        halfAvailableWidthInches,
      ),
      yInches: clampNumber(
        opening.localCenterInches.yInches,
        -halfAvailableDepthInches,
        halfAvailableDepthInches,
      ),
    },
    widthInches,
    depthInches,
    cornerRadiusInches:
      opening.shape === "rounded-rectangle"
        ? clampNumber(opening.cornerRadiusInches, 0, maxCornerRadiusInches)
        : 0,
    edgeClearanceInches,
  };
}

export function doCountertopOpeningsOverlap(
  firstOpening: CountertopOpening,
  secondOpening: CountertopOpening,
): boolean {
  const firstBoundsInches = createCountertopOpeningAabb(firstOpening);
  const secondBoundsInches = createCountertopOpeningAabb(secondOpening);

  return (
    firstBoundsInches.leftInches < secondBoundsInches.rightInches &&
    firstBoundsInches.rightInches > secondBoundsInches.leftInches &&
    firstBoundsInches.backInches < secondBoundsInches.frontInches &&
    firstBoundsInches.frontInches > secondBoundsInches.backInches
  );
}

type CountertopOpeningAabb = Readonly<{
  halfWidthInches: number;
  halfDepthInches: number;
  leftInches: number;
  rightInches: number;
  backInches: number;
  frontInches: number;
}>;

function createCountertopOpeningAabb(opening: CountertopOpening): CountertopOpeningAabb {
  const radians = (opening.localRotationDegrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const halfWidthInches = opening.widthInches / 2;
  const halfDepthInches = opening.depthInches / 2;
  const projectedHalfWidthInches = halfWidthInches * cos + halfDepthInches * sin;
  const projectedHalfDepthInches = halfWidthInches * sin + halfDepthInches * cos;

  return {
    halfWidthInches: projectedHalfWidthInches,
    halfDepthInches: projectedHalfDepthInches,
    leftInches: opening.localCenterInches.xInches - projectedHalfWidthInches,
    rightInches: opening.localCenterInches.xInches + projectedHalfWidthInches,
    backInches: opening.localCenterInches.yInches - projectedHalfDepthInches,
    frontInches: opening.localCenterInches.yInches + projectedHalfDepthInches,
  };
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
