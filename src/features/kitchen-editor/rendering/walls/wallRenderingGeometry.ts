import { ExtrudeGeometry, Shape, ShapeGeometry } from "three";
import type { Point3DInches } from "@/core/geometry/pointTypes";

export function createExtrudedWallGeometry(
  polygonInches: readonly Point3DInches[],
  heightInches: number,
): ExtrudeGeometry {
  const shape = createWallShape(polygonInches);

  return new ExtrudeGeometry(shape, {
    depth: heightInches,
    bevelEnabled: false,
  });
}

export function createWallFootprintGeometry(
  polygonInches: readonly Point3DInches[],
): ShapeGeometry {
  return new ShapeGeometry(createWallShape(polygonInches));
}

export const WALL_TOP_BOUNDARY_RENDER_OFFSET_INCHES = 0.2;

export function createTopBoundaryEdgePoints(args: {
  polygonInches: readonly Point3DInches[];
  heightInches: number;
}): readonly (readonly [number, number, number][])[] {
  if (args.polygonInches.length < 2) {
    return [];
  }

  const boundaryLineZInches = args.heightInches + WALL_TOP_BOUNDARY_RENDER_OFFSET_INCHES;
  const toLinePoint = (
    pointInches: Point3DInches,
  ): [number, number, number] => [
    pointInches.xInches,
    pointInches.yInches,
    boundaryLineZInches,
  ];

  return args.polygonInches.map((pointInches, pointIndex) => {
    const nextPointInches = args.polygonInches[(pointIndex + 1) % args.polygonInches.length];

    return [toLinePoint(pointInches), toLinePoint(nextPointInches)];
  });
}

export function createFlatBoundaryEdgePoints(args: {
  polygonInches: readonly Point3DInches[];
  zInches: number;
}): readonly (readonly [number, number, number][])[] {
  if (args.polygonInches.length < 2) {
    return [];
  }

  const toLinePoint = (
    pointInches: Point3DInches,
  ): [number, number, number] => [
    pointInches.xInches,
    pointInches.yInches,
    args.zInches,
  ];

  return args.polygonInches.map((pointInches, pointIndex) => {
    const nextPointInches = args.polygonInches[(pointIndex + 1) % args.polygonInches.length];

    return [toLinePoint(pointInches), toLinePoint(nextPointInches)];
  });
}

export function createVerticalBoundaryEdgePoints(args: {
  polygonInches: readonly Point3DInches[];
  bottomZInches: number;
  topZInches: number;
}): readonly (readonly [number, number, number][])[] {
  if (args.polygonInches.length < 1) {
    return [];
  }

  return args.polygonInches.map((pointInches) => [
    [pointInches.xInches, pointInches.yInches, args.bottomZInches],
    [pointInches.xInches, pointInches.yInches, args.topZInches],
  ]);
}

function createWallShape(polygonInches: readonly Point3DInches[]): Shape {
  const shape = new Shape();

  polygonInches.forEach((pointInches, pointIndex) => {
    if (pointIndex === 0) {
      shape.moveTo(pointInches.xInches, pointInches.yInches);
      return;
    }

    shape.lineTo(pointInches.xInches, pointInches.yInches);
  });
  shape.closePath();

  return shape;
}
