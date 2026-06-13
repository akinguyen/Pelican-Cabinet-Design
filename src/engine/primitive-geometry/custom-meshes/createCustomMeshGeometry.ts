import type { BufferGeometry } from "three";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { PrimitiveCustomMeshGeometry } from "../primitiveGeometryTypes";
import { createCountertopSlabGeometry } from "./createCountertopSlabGeometry";

export function createCustomMeshGeometry(
  geometry: PrimitiveCustomMeshGeometry,
  sizeInches: Size3DInches,
): BufferGeometry {
  return createCountertopSlabGeometry(geometry, sizeInches);
}
