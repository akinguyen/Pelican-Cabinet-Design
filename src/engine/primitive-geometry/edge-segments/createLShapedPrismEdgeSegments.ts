import type { Point2DInches, Point3DInches } from "@/core/geometry/pointTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { PrimitiveLShapedPrismGeometry } from "../primitiveGeometryTypes";
import { createPrimitiveEdgeLoopSegments, type PrimitiveEdgeSegmentInches } from "./primitiveEdgeSegmentTypes";

export function createLShapedPrismEdgeSegments(args: {
  geometry: PrimitiveLShapedPrismGeometry;
  sizeInches: Size3DInches;
}): readonly PrimitiveEdgeSegmentInches[] {
  const footprintInches = createLShapedPrismFootprint(args.geometry, args.sizeInches);
  const bottomZInches = -args.sizeInches.heightInches / 2;
  const topZInches = args.sizeInches.heightInches / 2;
  const topLoopInches = footprintInches.map((pointInches) => toPoint3D(pointInches, topZInches));
  const bottomLoopInches = footprintInches.map((pointInches) => toPoint3D(pointInches, bottomZInches));

  return [
    ...createPrimitiveEdgeLoopSegments(topLoopInches),
    ...createPrimitiveEdgeLoopSegments(bottomLoopInches),
    ...footprintInches.map((pointInches) => ({
      startInches: toPoint3D(pointInches, bottomZInches),
      endInches: toPoint3D(pointInches, topZInches),
    })),
  ];
}

function createLShapedPrismFootprint(
  geometry: PrimitiveLShapedPrismGeometry,
  sizeInches: Size3DInches,
): readonly Point2DInches[] {
  const halfWidthInches = sizeInches.widthInches / 2;
  const halfDepthInches = sizeInches.depthInches / 2;
  const cutoutWidthInches = sizeInches.widthInches * geometry.cutoutWidthRatio;
  const cutoutDepthInches = sizeInches.depthInches * geometry.cutoutDepthRatio;
  const cutoutBackYInches = halfDepthInches - cutoutDepthInches;

  if (geometry.cutoutCorner === "front-left") {
    const cutoutRightXInches = -halfWidthInches + cutoutWidthInches;

    return [
      { xInches: -halfWidthInches, yInches: -halfDepthInches },
      { xInches: halfWidthInches, yInches: -halfDepthInches },
      { xInches: halfWidthInches, yInches: halfDepthInches },
      { xInches: cutoutRightXInches, yInches: halfDepthInches },
      { xInches: cutoutRightXInches, yInches: cutoutBackYInches },
      { xInches: -halfWidthInches, yInches: cutoutBackYInches },
    ];
  }

  const cutoutLeftXInches = halfWidthInches - cutoutWidthInches;

  return [
    { xInches: -halfWidthInches, yInches: -halfDepthInches },
    { xInches: halfWidthInches, yInches: -halfDepthInches },
    { xInches: halfWidthInches, yInches: cutoutBackYInches },
    { xInches: cutoutLeftXInches, yInches: cutoutBackYInches },
    { xInches: cutoutLeftXInches, yInches: halfDepthInches },
    { xInches: -halfWidthInches, yInches: halfDepthInches },
  ];
}

function toPoint3D(pointInches: Point2DInches, zInches: number): Point3DInches {
  return {
    xInches: pointInches.xInches,
    yInches: pointInches.yInches,
    zInches,
  };
}
