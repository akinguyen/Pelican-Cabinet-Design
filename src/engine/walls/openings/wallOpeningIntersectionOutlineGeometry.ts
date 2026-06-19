import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { createAssemblyPlacementFootprint } from "@/engine/assemblies/placement/assemblyPlacementGeometry";
import type { DerivedWallOpening } from "../placedWallSegmentTypes";
import type { BuiltWallSegmentBody } from "../connectedWallGeometryTypes";
import { createDerivedWallOpeningFaceAxes } from "./wallOpeningFaceAxes";
import { addUniqueWallPlanPoint, getWallPlanCrossProduct, projectWallPlanPointOntoDirection } from "../wallPlanGeometry";

const GEOMETRY_EPSILON = 0.000001;
const WALL_OPENING_INTERSECTION_INTERACTION_DEPTH_PADDING_INCHES = 0.25;
const MIN_WALL_OPENING_INTERSECTION_INTERACTION_WIDTH_INCHES = 1;
const MIN_WALL_OPENING_INTERSECTION_INTERACTION_DEPTH_INCHES = 6;

export type DerivedWallOpeningIntersectionOutlineInches = Readonly<{
  id: string;
  sourceAssemblyId: string;
  outlinePointsInches: readonly Point3DInches[];
  interactionCenterInches: Point3DInches;
  interactionWidthInches: number;
  interactionDepthInches: number;
  interactionRotationZRadians: number;
}>;

export function createDerivedWallOpeningIntersectionOutline(args: {
  segmentBody: BuiltWallSegmentBody;
  opening: DerivedWallOpening;
  sourceAssembly: PlacedAssembly;
}): DerivedWallOpeningIntersectionOutlineInches | null {
  const faceAxes = createDerivedWallOpeningFaceAxes({
    segmentBody: args.segmentBody,
    faceSide: args.opening.faceSide,
  });

  if (faceAxes === null) {
    return null;
  }

  const sourceFootprint = createAssemblyPlacementFootprint(args.sourceAssembly);
  const clippedPolygonInches = clipPolygonToConvexPolygon({
    subjectPolygonInches: sourceFootprint.cornerPointsInches,
    clipPolygonInches: args.segmentBody.footprintPolygonInches,
  });

  if (clippedPolygonInches.length < 3 || getAbsolutePolygonArea(clippedPolygonInches) <= GEOMETRY_EPSILON) {
    return null;
  }

  const outlinePointsInches = [
    ...clippedPolygonInches.map((pointInches) => ({ ...pointInches, zInches: 0 })),
    { ...clippedPolygonInches[0], zInches: 0 },
  ];
  const interactionCenterInches = getPolygonCenter(clippedPolygonInches);
  const faceCoordinatesInches = clippedPolygonInches.map((pointInches) => projectWallPlanPointOntoDirection({
    pointInches,
    originInches: faceAxes.sideStartPointInches,
    directionInches: faceAxes.faceDirectionInches,
  }));
  const outwardCoordinatesInches = clippedPolygonInches.map((pointInches) => projectWallPlanPointOntoDirection({
    pointInches,
    originInches: faceAxes.sideStartPointInches,
    directionInches: faceAxes.outwardDirectionInches,
  }));

  return {
    id: args.opening.id,
    sourceAssemblyId: args.opening.sourceAssemblyId,
    outlinePointsInches,
    interactionCenterInches,
    interactionWidthInches: Math.max(
      Math.max(...faceCoordinatesInches) - Math.min(...faceCoordinatesInches),
      MIN_WALL_OPENING_INTERSECTION_INTERACTION_WIDTH_INCHES,
    ),
    interactionDepthInches: Math.max(
      Math.max(...outwardCoordinatesInches) - Math.min(...outwardCoordinatesInches) +
        WALL_OPENING_INTERSECTION_INTERACTION_DEPTH_PADDING_INCHES * 2,
      MIN_WALL_OPENING_INTERSECTION_INTERACTION_DEPTH_INCHES,
    ),
    interactionRotationZRadians: Math.atan2(
      faceAxes.faceDirectionInches.yInches,
      faceAxes.faceDirectionInches.xInches,
    ),
  };
}

function clipPolygonToConvexPolygon(args: {
  subjectPolygonInches: readonly Point3DInches[];
  clipPolygonInches: readonly Point3DInches[];
}): readonly Point3DInches[] {
  if (args.subjectPolygonInches.length < 3 || args.clipPolygonInches.length < 3) {
    return [];
  }

  const clipOrientation: 1 | -1 = getSignedPolygonArea(args.clipPolygonInches) >= 0 ? 1 : -1;
  let clippedPolygon = args.subjectPolygonInches.map((pointInches) => ({ ...pointInches, zInches: 0 }));

  for (let clipIndex = 0; clipIndex < args.clipPolygonInches.length; clipIndex += 1) {
    const clipStartInches = args.clipPolygonInches[clipIndex];
    const clipEndInches = args.clipPolygonInches[(clipIndex + 1) % args.clipPolygonInches.length];
    const inputPolygon = clippedPolygon;
    clippedPolygon = [];

    if (inputPolygon.length === 0) {
      break;
    }

    for (let pointIndex = 0; pointIndex < inputPolygon.length; pointIndex += 1) {
      const currentPointInches = inputPolygon[pointIndex];
      const previousPointInches = inputPolygon[(pointIndex + inputPolygon.length - 1) % inputPolygon.length];
      const currentInside = isPointInsideClipEdge({
        pointInches: currentPointInches,
        clipStartInches,
        clipEndInches,
        clipOrientation,
      });
      const previousInside = isPointInsideClipEdge({
        pointInches: previousPointInches,
        clipStartInches,
        clipEndInches,
        clipOrientation,
      });

      if (currentInside) {
        if (!previousInside) {
          addUniqueWallPlanPoint(clippedPolygon, createLineIntersection({
            firstStartInches: previousPointInches,
            firstEndInches: currentPointInches,
            secondStartInches: clipStartInches,
            secondEndInches: clipEndInches,
          }));
        }

        addUniqueWallPlanPoint(clippedPolygon, currentPointInches);
        continue;
      }

      if (previousInside) {
        addUniqueWallPlanPoint(clippedPolygon, createLineIntersection({
          firstStartInches: previousPointInches,
          firstEndInches: currentPointInches,
          secondStartInches: clipStartInches,
          secondEndInches: clipEndInches,
        }));
      }
    }
  }

  return clippedPolygon;
}

function isPointInsideClipEdge(args: {
  pointInches: Point3DInches;
  clipStartInches: Point3DInches;
  clipEndInches: Point3DInches;
  clipOrientation: 1 | -1;
}): boolean {
  const edgeVectorInches = {
    xInches: args.clipEndInches.xInches - args.clipStartInches.xInches,
    yInches: args.clipEndInches.yInches - args.clipStartInches.yInches,
  };
  const startToPointInches = {
    xInches: args.pointInches.xInches - args.clipStartInches.xInches,
    yInches: args.pointInches.yInches - args.clipStartInches.yInches,
  };
  const side = getWallPlanCrossProduct(edgeVectorInches, startToPointInches);

  return args.clipOrientation === 1
    ? side >= -GEOMETRY_EPSILON
    : side <= GEOMETRY_EPSILON;
}

function createLineIntersection(args: {
  firstStartInches: Point3DInches;
  firstEndInches: Point3DInches;
  secondStartInches: Point3DInches;
  secondEndInches: Point3DInches;
}): Point3DInches {
  const firstVectorInches = {
    xInches: args.firstEndInches.xInches - args.firstStartInches.xInches,
    yInches: args.firstEndInches.yInches - args.firstStartInches.yInches,
  };
  const secondVectorInches = {
    xInches: args.secondEndInches.xInches - args.secondStartInches.xInches,
    yInches: args.secondEndInches.yInches - args.secondStartInches.yInches,
  };
  const denominator = getWallPlanCrossProduct(firstVectorInches, secondVectorInches);

  if (Math.abs(denominator) <= GEOMETRY_EPSILON) {
    return {
      xInches: args.firstEndInches.xInches,
      yInches: args.firstEndInches.yInches,
      zInches: 0,
    };
  }

  const startDeltaInches = {
    xInches: args.secondStartInches.xInches - args.firstStartInches.xInches,
    yInches: args.secondStartInches.yInches - args.firstStartInches.yInches,
  };
  const firstDistanceRatio = getWallPlanCrossProduct(startDeltaInches, secondVectorInches) / denominator;

  return {
    xInches: args.firstStartInches.xInches + firstVectorInches.xInches * firstDistanceRatio,
    yInches: args.firstStartInches.yInches + firstVectorInches.yInches * firstDistanceRatio,
    zInches: 0,
  };
}


function getPolygonCenter(pointsInches: readonly Point3DInches[]): Point3DInches {
  const pointCount = Math.max(pointsInches.length, 1);
  const sum = pointsInches.reduce((total, pointInches) => ({
    xInches: total.xInches + pointInches.xInches,
    yInches: total.yInches + pointInches.yInches,
    zInches: total.zInches + pointInches.zInches,
  }), { xInches: 0, yInches: 0, zInches: 0 });

  return {
    xInches: sum.xInches / pointCount,
    yInches: sum.yInches / pointCount,
    zInches: sum.zInches / pointCount,
  };
}

function getAbsolutePolygonArea(pointsInches: readonly Point3DInches[]): number {
  return Math.abs(getSignedPolygonArea(pointsInches));
}

function getSignedPolygonArea(pointsInches: readonly Point3DInches[]): number {
  let area = 0;

  pointsInches.forEach((pointInches, pointIndex) => {
    const nextPointInches = pointsInches[(pointIndex + 1) % pointsInches.length];
    area += pointInches.xInches * nextPointInches.yInches - nextPointInches.xInches * pointInches.yInches;
  });

  return area / 2;
}


export function isDerivedWallOpeningIntersectionOutline(
  outline: DerivedWallOpeningIntersectionOutlineInches | null,
): outline is DerivedWallOpeningIntersectionOutlineInches {
  return outline !== null;
}
