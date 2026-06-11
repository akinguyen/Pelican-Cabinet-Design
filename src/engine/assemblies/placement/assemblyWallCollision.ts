import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { PlacedWall } from "@/engine/walls/wallTypes";
import { getClosedPolygonEdges, isPointInsidePolygon } from "@/engine/walls/footprint/wallFootprintGeometry";
import { createAssemblyPlacementFootprint } from "./assemblyPlacementGeometry";

const COLLISION_EPSILON_INCHES = 0.001;

export function doesAssemblyPlacementOverlapWalls(args: {
  placedAssembly: PlacedAssembly;
  placedWalls: readonly PlacedWall[];
}): boolean {
  const footprint = createAssemblyPlacementFootprint(args.placedAssembly);

  return args.placedWalls.some((placedWall) =>
    doPolygonsOverlapByArea(
      footprint.cornerPointsInches,
      placedWall.footprint.boundaryPointsInches,
    ),
  );
}

export function isAssemblyPlacementValid(args: {
  placedAssembly: PlacedAssembly;
  placedWalls: readonly PlacedWall[];
}): boolean {
  return !doesAssemblyPlacementOverlapWalls(args);
}

function doPolygonsOverlapByArea(
  firstPolygonInches: readonly Point3DInches[],
  secondPolygonInches: readonly Point3DInches[],
): boolean {
  if (
    firstPolygonInches.some((pointInches) =>
      isPointStrictlyInsidePolygon(pointInches, secondPolygonInches),
    ) ||
    secondPolygonInches.some((pointInches) =>
      isPointStrictlyInsidePolygon(pointInches, firstPolygonInches),
    )
  ) {
    return true;
  }

  const firstEdges = getClosedPolygonEdges(firstPolygonInches);
  const secondEdges = getClosedPolygonEdges(secondPolygonInches);

  return firstEdges.some((firstEdge) =>
    secondEdges.some((secondEdge) =>
      doSegmentsCrossThroughInterior(
        firstEdge.startPointInches,
        firstEdge.endPointInches,
        secondEdge.startPointInches,
        secondEdge.endPointInches,
      ),
    ),
  );
}

function isPointStrictlyInsidePolygon(
  pointInches: Point3DInches,
  polygonInches: readonly Point3DInches[],
): boolean {
  if (isPointOnPolygonBoundary(pointInches, polygonInches)) {
    return false;
  }

  return isPointInsidePolygon({ pointInches, polygonInches });
}

function isPointOnPolygonBoundary(
  pointInches: Point3DInches,
  polygonInches: readonly Point3DInches[],
): boolean {
  return getClosedPolygonEdges(polygonInches).some((edge) =>
    isPointOnSegment(edge.startPointInches, pointInches, edge.endPointInches),
  );
}

function doSegmentsCrossThroughInterior(
  firstStartInches: Point3DInches,
  firstEndInches: Point3DInches,
  secondStartInches: Point3DInches,
  secondEndInches: Point3DInches,
): boolean {
  const firstOrientationA = getOrientation(firstStartInches, firstEndInches, secondStartInches);
  const firstOrientationB = getOrientation(firstStartInches, firstEndInches, secondEndInches);
  const secondOrientationA = getOrientation(secondStartInches, secondEndInches, firstStartInches);
  const secondOrientationB = getOrientation(secondStartInches, secondEndInches, firstEndInches);

  return firstOrientationA * firstOrientationB < 0 && secondOrientationA * secondOrientationB < 0;
}

function getOrientation(
  firstPointInches: Point3DInches,
  secondPointInches: Point3DInches,
  thirdPointInches: Point3DInches,
): number {
  const value =
    (secondPointInches.xInches - firstPointInches.xInches) *
      (thirdPointInches.yInches - firstPointInches.yInches) -
    (secondPointInches.yInches - firstPointInches.yInches) *
      (thirdPointInches.xInches - firstPointInches.xInches);

  if (Math.abs(value) <= COLLISION_EPSILON_INCHES) {
    return 0;
  }

  return value > 0 ? 1 : -1;
}

function isPointOnSegment(
  startPointInches: Point3DInches,
  pointInches: Point3DInches,
  endPointInches: Point3DInches,
): boolean {
  const crossProduct =
    (pointInches.yInches - startPointInches.yInches) *
      (endPointInches.xInches - startPointInches.xInches) -
    (pointInches.xInches - startPointInches.xInches) *
      (endPointInches.yInches - startPointInches.yInches);

  if (Math.abs(crossProduct) > COLLISION_EPSILON_INCHES) {
    return false;
  }

  return (
    pointInches.xInches >= Math.min(startPointInches.xInches, endPointInches.xInches) - COLLISION_EPSILON_INCHES &&
    pointInches.xInches <= Math.max(startPointInches.xInches, endPointInches.xInches) + COLLISION_EPSILON_INCHES &&
    pointInches.yInches >= Math.min(startPointInches.yInches, endPointInches.yInches) - COLLISION_EPSILON_INCHES &&
    pointInches.yInches <= Math.max(startPointInches.yInches, endPointInches.yInches) + COLLISION_EPSILON_INCHES
  );
}
