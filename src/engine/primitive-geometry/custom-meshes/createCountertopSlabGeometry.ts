import { ExtrudeGeometry, Path, Shape } from "three";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type {
  CountertopSlabOpening,
  PrimitiveCountertopSlabGeometry,
} from "../primitiveGeometryTypes";

export function createCountertopSlabGeometry(
  geometry: PrimitiveCountertopSlabGeometry,
  sizeInches: Size3DInches,
): ExtrudeGeometry {
  const halfWidthInches = sizeInches.widthInches / 2;
  const halfDepthInches = sizeInches.depthInches / 2;
  const shape = new Shape();

  shape.moveTo(-halfWidthInches, -halfDepthInches);
  shape.lineTo(halfWidthInches, -halfDepthInches);
  shape.lineTo(halfWidthInches, halfDepthInches);
  shape.lineTo(-halfWidthInches, halfDepthInches);
  shape.lineTo(-halfWidthInches, -halfDepthInches);

  geometry.openingsInches.forEach((openingInches) => {
    shape.holes.push(createCountertopOpeningPath(openingInches));
  });

  const slabGeometry = new ExtrudeGeometry(shape, {
    bevelEnabled: false,
    depth: sizeInches.heightInches,
  });

  slabGeometry.translate(0, 0, -sizeInches.heightInches / 2);
  slabGeometry.computeVertexNormals();
  slabGeometry.computeBoundingBox();
  slabGeometry.computeBoundingSphere();

  return slabGeometry;
}

function createCountertopOpeningPath(openingInches: CountertopSlabOpening): Path {
  if (openingInches.shape === "rounded-rectangle" && openingInches.cornerRadiusInches > 0) {
    return createRoundedRectangleOpeningPath(openingInches);
  }

  return createRectangleOpeningPath(openingInches);
}

function createRectangleOpeningPath(openingInches: CountertopSlabOpening): Path {
  const halfWidthInches = openingInches.widthInches / 2;
  const halfDepthInches = openingInches.depthInches / 2;
  const path = new Path();
  const bottomLeftInches = rotateOpeningPoint(
    openingInches,
    -halfWidthInches,
    -halfDepthInches,
  );
  const topLeftInches = rotateOpeningPoint(
    openingInches,
    -halfWidthInches,
    halfDepthInches,
  );
  const topRightInches = rotateOpeningPoint(
    openingInches,
    halfWidthInches,
    halfDepthInches,
  );
  const bottomRightInches = rotateOpeningPoint(
    openingInches,
    halfWidthInches,
    -halfDepthInches,
  );

  path.moveTo(bottomLeftInches.xInches, bottomLeftInches.yInches);
  path.lineTo(topLeftInches.xInches, topLeftInches.yInches);
  path.lineTo(topRightInches.xInches, topRightInches.yInches);
  path.lineTo(bottomRightInches.xInches, bottomRightInches.yInches);
  path.lineTo(bottomLeftInches.xInches, bottomLeftInches.yInches);

  return path;
}

function createRoundedRectangleOpeningPath(openingInches: CountertopSlabOpening): Path {
  const halfWidthInches = openingInches.widthInches / 2;
  const halfDepthInches = openingInches.depthInches / 2;
  const cornerRadiusInches = Math.min(
    openingInches.cornerRadiusInches,
    halfWidthInches,
    halfDepthInches,
  );
  const path = new Path();

  const startInches = rotateOpeningPoint(
    openingInches,
    -halfWidthInches,
    -halfDepthInches + cornerRadiusInches,
  );
  path.moveTo(startInches.xInches, startInches.yInches);

  addOpeningLine(path, openingInches, -halfWidthInches, halfDepthInches - cornerRadiusInches);
  addOpeningQuadraticCurve(
    path,
    openingInches,
    -halfWidthInches,
    halfDepthInches,
    -halfWidthInches + cornerRadiusInches,
    halfDepthInches,
  );
  addOpeningLine(path, openingInches, halfWidthInches - cornerRadiusInches, halfDepthInches);
  addOpeningQuadraticCurve(
    path,
    openingInches,
    halfWidthInches,
    halfDepthInches,
    halfWidthInches,
    halfDepthInches - cornerRadiusInches,
  );
  addOpeningLine(path, openingInches, halfWidthInches, -halfDepthInches + cornerRadiusInches);
  addOpeningQuadraticCurve(
    path,
    openingInches,
    halfWidthInches,
    -halfDepthInches,
    halfWidthInches - cornerRadiusInches,
    -halfDepthInches,
  );
  addOpeningLine(path, openingInches, -halfWidthInches + cornerRadiusInches, -halfDepthInches);
  addOpeningQuadraticCurve(
    path,
    openingInches,
    -halfWidthInches,
    -halfDepthInches,
    -halfWidthInches,
    -halfDepthInches + cornerRadiusInches,
  );

  return path;
}

function addOpeningLine(
  path: Path,
  openingInches: CountertopSlabOpening,
  xInches: number,
  yInches: number,
): void {
  const pointInches = rotateOpeningPoint(openingInches, xInches, yInches);
  path.lineTo(pointInches.xInches, pointInches.yInches);
}

function addOpeningQuadraticCurve(
  path: Path,
  openingInches: CountertopSlabOpening,
  controlXInches: number,
  controlYInches: number,
  endXInches: number,
  endYInches: number,
): void {
  const controlPointInches = rotateOpeningPoint(openingInches, controlXInches, controlYInches);
  const endPointInches = rotateOpeningPoint(openingInches, endXInches, endYInches);
  path.quadraticCurveTo(
    controlPointInches.xInches,
    controlPointInches.yInches,
    endPointInches.xInches,
    endPointInches.yInches,
  );
}

function rotateOpeningPoint(
  openingInches: CountertopSlabOpening,
  localXInches: number,
  localYInches: number,
): Readonly<{ xInches: number; yInches: number }> {
  const radians = (openingInches.rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    xInches:
      openingInches.centerXInches + localXInches * cos - localYInches * sin,
    yInches:
      openingInches.centerYInches + localXInches * sin + localYInches * cos,
  };
}
