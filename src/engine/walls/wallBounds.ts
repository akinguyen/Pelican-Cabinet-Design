import type { Bounds3DInches } from "@/core/geometry/boxBounds";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWallGraph } from "./placedWallGraphTypes";
import { buildConnectedWallGeometry } from "./buildConnectedWallGeometry";

export function measurePlacedWallGraphsBounds(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
}): Bounds3DInches | null {
  const points = args.placedWallGraphs.flatMap((wallGraph) => (
    buildConnectedWallGeometry(wallGraph).segmentBodies.flatMap((segmentBody) => (
      segmentBody.footprintPolygonInches.flatMap((pointInches) => [
        pointInches,
        { ...pointInches, zInches: segmentBody.heightInches },
      ])
    ))
  ));

  if (points.length === 0) {
    return null;
  }

  return {
    minInches: createBoundsPoint(points, Math.min),
    maxInches: createBoundsPoint(points, Math.max),
  };
}

function createBoundsPoint(
  points: readonly Point3DInches[],
  selectValue: (...values: number[]) => number,
): Point3DInches {
  return {
    xInches: selectValue(...points.map((point) => point.xInches)),
    yInches: selectValue(...points.map((point) => point.yInches)),
    zInches: selectValue(...points.map((point) => point.zInches)),
  };
}
