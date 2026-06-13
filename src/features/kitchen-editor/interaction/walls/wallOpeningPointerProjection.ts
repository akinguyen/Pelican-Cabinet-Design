import type { Ray } from "three";
import type { WallElevationViewZone } from "@/engine/walls/wallElevationViewZone";
import type { WallOpeningDraftPointInches } from "@/engine/walls/openings/wallOpeningDraftTypes";

const RAY_PLANE_PARALLEL_EPSILON = 0.000001;

export function createWallOpeningFacePointFromRay(
  viewZone: WallElevationViewZone,
  ray: Ray,
): WallOpeningDraftPointInches | null {
  const denominator =
    viewZone.outwardDirectionInches.xInches * ray.direction.x +
    viewZone.outwardDirectionInches.yInches * ray.direction.y;

  if (Math.abs(denominator) < RAY_PLANE_PARALLEL_EPSILON) {
    return null;
  }

  const t = (
    viewZone.outwardDirectionInches.xInches * (viewZone.faceStartInches.xInches - ray.origin.x) +
    viewZone.outwardDirectionInches.yInches * (viewZone.faceStartInches.yInches - ray.origin.y)
  ) / denominator;

  if (t < 0) {
    return null;
  }

  const worldXInches = ray.origin.x + ray.direction.x * t;
  const worldYInches = ray.origin.y + ray.direction.y * t;
  const worldZInches = ray.origin.z + ray.direction.z * t;
  const faceDirection = getFaceDirection(viewZone);

  return {
    xInchesAlongFace:
      (worldXInches - viewZone.faceStartInches.xInches) * faceDirection.xInches +
      (worldYInches - viewZone.faceStartInches.yInches) * faceDirection.yInches,
    zInchesFromFloor: worldZInches,
  };
}

export function createWallOpeningWorldPointFromFacePoint(args: {
  viewZone: WallElevationViewZone;
  facePointInches: WallOpeningDraftPointInches;
  outwardOffsetInches?: number;
}): Readonly<{ xInches: number; yInches: number; zInches: number }> {
  const faceDirection = getFaceDirection(args.viewZone);
  const outwardOffsetInches = args.outwardOffsetInches ?? 0;

  return {
    xInches:
      args.viewZone.faceStartInches.xInches +
      faceDirection.xInches * args.facePointInches.xInchesAlongFace +
      args.viewZone.outwardDirectionInches.xInches * outwardOffsetInches,
    yInches:
      args.viewZone.faceStartInches.yInches +
      faceDirection.yInches * args.facePointInches.xInchesAlongFace +
      args.viewZone.outwardDirectionInches.yInches * outwardOffsetInches,
    zInches: args.facePointInches.zInchesFromFloor,
  };
}

function getFaceDirection(
  viewZone: WallElevationViewZone,
): Readonly<{ xInches: number; yInches: number }> {
  const lengthInches = Math.max(viewZone.faceLengthInches, 0.000001);

  return {
    xInches: (viewZone.faceEndInches.xInches - viewZone.faceStartInches.xInches) / lengthInches,
    yInches: (viewZone.faceEndInches.yInches - viewZone.faceStartInches.yInches) / lengthInches,
  };
}
