import { ExtrudeGeometry, Shape } from "three";
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
