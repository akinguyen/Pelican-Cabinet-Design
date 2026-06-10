import type { BufferGeometry } from "three";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { CustomMeshGeometry } from "./customMeshGeometryTypes";
import { createCountertopSlabGeometry } from "./createCountertopSlabGeometry";
import { createLShapedPrismGeometry } from "./createLShapedPrismGeometry";
import { createRectangularFrustumGeometry } from "./createRectangularFrustumGeometry";

export function createCustomMeshGeometry(
  geometry: CustomMeshGeometry,
  sizeInches: Size3DInches,
): BufferGeometry {
  switch (geometry.meshId) {
    case "countertop-slab":
      return createCountertopSlabGeometry(geometry, sizeInches);
    case "l-shaped-prism":
      return createLShapedPrismGeometry(geometry, sizeInches);
    case "rectangular-frustum":
      return createRectangularFrustumGeometry(geometry, sizeInches);
  }
}
