import type { Bounds3DInches } from "@/core/geometry/boxBounds";
import { measurePlacedAssemblyPlacementBounds } from "../assemblyBounds";
import type { PlacedAssembly } from "../placedAssemblyTypes";
import type { WallSegmentFace } from "@/engine/walls/connectedWallGeometryTypes";

const ELEVATION_ASSEMBLY_HORIZONTAL_TOLERANCE_INCHES = 6;
const ELEVATION_ASSEMBLY_BACK_DEPTH_TOLERANCE_INCHES = 8;
const ELEVATION_ASSEMBLY_FRONT_DEPTH_TOLERANCE_INCHES = 36;

export function shouldShowPlacedAssemblyInElevationView(args: {
  placedAssembly: PlacedAssembly;
  activeElevationSide: WallSegmentFace;
}): boolean {
  const boundsInches = measurePlacedAssemblyPlacementBounds(args.placedAssembly);
  const projectedBounds = projectBoundsToElevationSide({
    boundsInches,
    activeElevationSide: args.activeElevationSide,
  });

  const overlapsHorizontally =
    projectedBounds.maxHorizontalInches >= -ELEVATION_ASSEMBLY_HORIZONTAL_TOLERANCE_INCHES &&
    projectedBounds.minHorizontalInches <=
      args.activeElevationSide.lengthInches + ELEVATION_ASSEMBLY_HORIZONTAL_TOLERANCE_INCHES;
  const overlapsDepth =
    projectedBounds.maxDepthInches >= -ELEVATION_ASSEMBLY_BACK_DEPTH_TOLERANCE_INCHES &&
    projectedBounds.minDepthInches <= ELEVATION_ASSEMBLY_FRONT_DEPTH_TOLERANCE_INCHES;

  return overlapsHorizontally && overlapsDepth;
}

type ProjectedElevationSideBounds = Readonly<{
  minHorizontalInches: number;
  maxHorizontalInches: number;
  minDepthInches: number;
  maxDepthInches: number;
}>;

function projectBoundsToElevationSide(args: {
  boundsInches: Bounds3DInches;
  activeElevationSide: WallSegmentFace;
}): ProjectedElevationSideBounds {
  const edgeDirectionInches = getElevationSideDirection(args.activeElevationSide);
  const projectedPoints = getBoundsFloorCornerPoints(args.boundsInches).map((pointInches) => {
    const offsetXInches = pointInches.xInches - args.activeElevationSide.startPointInches.xInches;
    const offsetYInches = pointInches.yInches - args.activeElevationSide.startPointInches.yInches;

    return {
      horizontalInches:
        offsetXInches * edgeDirectionInches.xInches +
        offsetYInches * edgeDirectionInches.yInches,
      depthInches:
        offsetXInches * args.activeElevationSide.normalInches.xInches +
        offsetYInches * args.activeElevationSide.normalInches.yInches,
    };
  });

  return {
    minHorizontalInches: Math.min(...projectedPoints.map((point) => point.horizontalInches)),
    maxHorizontalInches: Math.max(...projectedPoints.map((point) => point.horizontalInches)),
    minDepthInches: Math.min(...projectedPoints.map((point) => point.depthInches)),
    maxDepthInches: Math.max(...projectedPoints.map((point) => point.depthInches)),
  };
}

function getElevationSideDirection(
  activeElevationSide: WallSegmentFace,
): Readonly<{ xInches: number; yInches: number }> {
  return {
    xInches:
      (activeElevationSide.endPointInches.xInches - activeElevationSide.startPointInches.xInches) /
      activeElevationSide.lengthInches,
    yInches:
      (activeElevationSide.endPointInches.yInches - activeElevationSide.startPointInches.yInches) /
      activeElevationSide.lengthInches,
  };
}

function getBoundsFloorCornerPoints(boundsInches: Bounds3DInches) {
  return [
    {
      xInches: boundsInches.minInches.xInches,
      yInches: boundsInches.minInches.yInches,
    },
    {
      xInches: boundsInches.maxInches.xInches,
      yInches: boundsInches.minInches.yInches,
    },
    {
      xInches: boundsInches.maxInches.xInches,
      yInches: boundsInches.maxInches.yInches,
    },
    {
      xInches: boundsInches.minInches.xInches,
      yInches: boundsInches.maxInches.yInches,
    },
  ];
}
