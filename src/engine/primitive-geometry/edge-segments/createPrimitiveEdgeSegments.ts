import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { PrimitiveGeometry } from "../primitiveGeometryTypes";
import { createBoxEdgeSegments } from "./createBoxEdgeSegments";
import { createCountertopSlabEdgeSegments } from "./createCountertopSlabEdgeSegments";
import { createCylinderEdgeSegments } from "./createCylinderEdgeSegments";
import { createLShapedPrismEdgeSegments } from "./createLShapedPrismEdgeSegments";
import { createRectangularFrustumEdgeSegments } from "./createRectangularFrustumEdgeSegments";
import type { PrimitiveEdgeSegmentInches } from "./primitiveEdgeSegmentTypes";

export function createPrimitiveEdgeSegments(args: {
  geometry: PrimitiveGeometry;
  sizeInches: Size3DInches;
}): readonly PrimitiveEdgeSegmentInches[] {
  switch (args.geometry.kind) {
    case "box":
      return createBoxEdgeSegments(args.sizeInches);
    case "cylinder":
      return createCylinderEdgeSegments(args.sizeInches);
    case "rectangular-frustum":
      return createRectangularFrustumEdgeSegments({
        geometry: args.geometry,
        sizeInches: args.sizeInches,
      });
    case "l-shaped-prism":
      return createLShapedPrismEdgeSegments({
        geometry: args.geometry,
        sizeInches: args.sizeInches,
      });
    case "custom-mesh":
      return createCountertopSlabEdgeSegments({
        geometry: args.geometry,
        sizeInches: args.sizeInches,
      });
  }
}
