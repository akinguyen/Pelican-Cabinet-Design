import type { BufferGeometry } from "three";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { CustomMeshGeometry } from "./customMeshGeometryTypes";
import { createRectangularFrustumGeometry } from "./createRectangularFrustumGeometry";

export function createCustomMeshGeometry(
  geometry: CustomMeshGeometry,
  sizeInches: Size3DInches,
): BufferGeometry {
  switch (geometry.meshId) {
    case "rectangular-frustum":
      return createRectangularFrustumGeometry(geometry, sizeInches);
  }
}
