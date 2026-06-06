import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { WallFootprint } from "./wallFootprintTypes";
import {
  normalizeWallFootprintWinding,
  removeDuplicateAdjacentPoints,
} from "./wallFootprintGeometry";
import { validateWallFootprintPoints } from "./wallFootprintValidation";

export function createWallFootprint(
  boundaryPointsInches: readonly Point3DInches[],
): WallFootprint | null {
  const normalizedPointsInches = normalizeWallFootprintWinding(
    removeDuplicateAdjacentPoints(boundaryPointsInches),
  );

  if (!validateWallFootprintPoints(normalizedPointsInches)) {
    return null;
  }

  return {
    boundaryPointsInches: normalizedPointsInches,
  };
}
