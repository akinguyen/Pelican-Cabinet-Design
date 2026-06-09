import { ExtrudeGeometry, Shape } from "three";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { PrimitiveLShapedPrismGeometry } from "../primitiveGeometryTypes";

export function createLShapedPrismGeometry(
  geometry: PrimitiveLShapedPrismGeometry,
  sizeInches: Size3DInches,
): ExtrudeGeometry {
  const halfWidthInches = sizeInches.widthInches / 2;
  const halfDepthInches = sizeInches.depthInches / 2;
  const cutoutWidthInches = sizeInches.widthInches * geometry.cutoutWidthRatio;
  const cutoutDepthInches = sizeInches.depthInches * geometry.cutoutDepthRatio;
  const cutoutRightXInches = -halfWidthInches + cutoutWidthInches;
  const cutoutBackYInches = halfDepthInches - cutoutDepthInches;

  const shape = new Shape();
  shape.moveTo(-halfWidthInches, -halfDepthInches);
  shape.lineTo(halfWidthInches, -halfDepthInches);
  shape.lineTo(halfWidthInches, halfDepthInches);
  shape.lineTo(cutoutRightXInches, halfDepthInches);
  shape.lineTo(cutoutRightXInches, cutoutBackYInches);
  shape.lineTo(-halfWidthInches, cutoutBackYInches);
  shape.lineTo(-halfWidthInches, -halfDepthInches);

  const prismGeometry = new ExtrudeGeometry(shape, {
    bevelEnabled: false,
    depth: sizeInches.heightInches,
  });

  prismGeometry.translate(0, 0, -sizeInches.heightInches / 2);
  prismGeometry.computeVertexNormals();
  prismGeometry.computeBoundingBox();
  prismGeometry.computeBoundingSphere();

  return prismGeometry;
}
