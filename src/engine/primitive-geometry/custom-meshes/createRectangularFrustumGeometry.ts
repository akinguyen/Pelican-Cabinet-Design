import { BufferGeometry, Float32BufferAttribute } from "three";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { PrimitiveCustomMeshGeometry } from "../primitiveGeometryTypes";

export function createRectangularFrustumGeometry(
  geometry: PrimitiveCustomMeshGeometry,
  sizeInches: Size3DInches,
): BufferGeometry {
  const bottomWidthInches = sizeInches.widthInches;
  const bottomDepthInches = sizeInches.depthInches;
  const topWidthInches = sizeInches.widthInches * geometry.topWidthRatio;
  const topDepthInches = sizeInches.depthInches * geometry.topDepthRatio;
  const heightInches = sizeInches.heightInches;

  const bottomXInches = bottomWidthInches / 2;
  const bottomYInches = bottomDepthInches / 2;
  const topXInches = topWidthInches / 2;
  const topYInches = topDepthInches / 2;
  const bottomZInches = -heightInches / 2;
  const topZInches = heightInches / 2;

  const vertices = new Float32Array([
    -bottomXInches,
    -bottomYInches,
    bottomZInches,
    bottomXInches,
    -bottomYInches,
    bottomZInches,
    bottomXInches,
    bottomYInches,
    bottomZInches,
    -bottomXInches,
    bottomYInches,
    bottomZInches,
    -topXInches,
    -topYInches,
    topZInches,
    topXInches,
    -topYInches,
    topZInches,
    topXInches,
    topYInches,
    topZInches,
    -topXInches,
    topYInches,
    topZInches,
  ]);

  const indices = [
    0,
    2,
    1,
    0,
    3,
    2,
    4,
    5,
    6,
    4,
    6,
    7,
    3,
    6,
    2,
    3,
    7,
    6,
    0,
    1,
    5,
    0,
    5,
    4,
    0,
    7,
    3,
    0,
    4,
    7,
    1,
    2,
    6,
    1,
    6,
    5,
  ];

  const bufferGeometry = new BufferGeometry();
  bufferGeometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  bufferGeometry.setIndex(indices);
  bufferGeometry.computeVertexNormals();
  bufferGeometry.computeBoundingBox();
  bufferGeometry.computeBoundingSphere();

  return bufferGeometry;
}
