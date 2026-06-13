import type { Point3DInches } from "@/core/geometry/pointTypes";
import { addPoint3DInches, rotatePointAroundZInches } from "@/core/geometry/pointTypes";
import type { PrimitiveBoxFrontOutlineEdge } from "../assemblyComponentTypes";
import { collectBuiltPrimitiveGeometries } from "../assemblyBounds";
import type { BuiltAssemblyTree, BuiltPrimitiveGeometry } from "../assemblyTreeBuilder";
import type { AssemblyFrontOutlineLineCandidate } from "./assemblyFrontOutlineLineMerging";
import { mergeAssemblyFrontOutlineLineCandidates } from "./assemblyFrontOutlineLineMerging";

export type AssemblyFrontOutlineLine = Readonly<{
  id: string;
  rootAssemblyId: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
}>;

const FRONT_OUTLINE_FACE_OFFSET_INCHES = 0.03;

export function buildAssemblyFrontOutlineLines(
  builtAssemblyTree: BuiltAssemblyTree,
): readonly AssemblyFrontOutlineLine[] {
  const outlineCandidates = collectBuiltPrimitiveGeometries(builtAssemblyTree).flatMap(
    createPrimitiveFrontOutlineLines,
  );

  return mergeAssemblyFrontOutlineLineCandidates(outlineCandidates).map((line, index) => ({
    id: `${line.rootAssemblyId}/front-outline-${index}`,
    rootAssemblyId: line.rootAssemblyId,
    startPointInches: line.startPointInches,
    endPointInches: line.endPointInches,
  }));
}

function createPrimitiveFrontOutlineLines(
  primitiveGeometry: BuiltPrimitiveGeometry,
): readonly AssemblyFrontOutlineLineCandidate[] {
  if (
    primitiveGeometry.geometry.kind !== "box" ||
    primitiveGeometry.frontOutlineEdges === undefined ||
    primitiveGeometry.frontOutlineEdges.length === 0
  ) {
    return [];
  }

  return primitiveGeometry.frontOutlineEdges.map((edge) =>
    createPrimitiveBoxFrontOutlineLine(primitiveGeometry, edge),
  );
}

function createPrimitiveBoxFrontOutlineLine(
  primitiveGeometry: BuiltPrimitiveGeometry,
  edge: PrimitiveBoxFrontOutlineEdge,
): AssemblyFrontOutlineLineCandidate {
  const { widthInches, depthInches, heightInches } = primitiveGeometry.sizeInches;
  const leftXInches = -widthInches / 2;
  const rightXInches = widthInches / 2;
  const bottomZInches = -heightInches / 2;
  const topZInches = heightInches / 2;
  const frontYInches = depthInches / 2 + FRONT_OUTLINE_FACE_OFFSET_INCHES;

  const localLineEndpointsByEdge: Record<
    PrimitiveBoxFrontOutlineEdge,
    readonly [Point3DInches, Point3DInches]
  > = {
    top: [
      { xInches: leftXInches, yInches: frontYInches, zInches: topZInches },
      { xInches: rightXInches, yInches: frontYInches, zInches: topZInches },
    ],
    right: [
      { xInches: rightXInches, yInches: frontYInches, zInches: bottomZInches },
      { xInches: rightXInches, yInches: frontYInches, zInches: topZInches },
    ],
    bottom: [
      { xInches: leftXInches, yInches: frontYInches, zInches: bottomZInches },
      { xInches: rightXInches, yInches: frontYInches, zInches: bottomZInches },
    ],
    left: [
      { xInches: leftXInches, yInches: frontYInches, zInches: bottomZInches },
      { xInches: leftXInches, yInches: frontYInches, zInches: topZInches },
    ],
  };

  const [localStartPointInches, localEndPointInches] = localLineEndpointsByEdge[edge];

  return {
    rootAssemblyId: primitiveGeometry.rootAssemblyId,
    startPointInches: primitiveLocalPointToWorldPoint(localStartPointInches, primitiveGeometry),
    endPointInches: primitiveLocalPointToWorldPoint(localEndPointInches, primitiveGeometry),
  };
}

function primitiveLocalPointToWorldPoint(
  localPointInches: Point3DInches,
  primitiveGeometry: BuiltPrimitiveGeometry,
): Point3DInches {
  return addPoint3DInches(
    primitiveGeometry.worldPositionInches,
    rotatePointAroundZInches(localPointInches, primitiveGeometry.worldRotationDegrees.zDegrees),
  );
}
