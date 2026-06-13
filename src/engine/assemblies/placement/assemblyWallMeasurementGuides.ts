import type { Point3DInches } from "@/core/geometry/pointTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { WallSegmentFace } from "@/engine/walls/wallSegmentTopologyTypes";
import type {
  AssemblyPlacementFootprint,
  AssemblyWallAttachmentHighlight,
  AssemblyWallMeasurementGuide,
} from "./assemblyPlacementTypes";

const AXIS_ALIGNED_FACE_EPSILON_INCHES = 0.01;
const FACE_SPAN_TOLERANCE_INCHES = 3;
const MIN_MEASUREMENT_LENGTH_INCHES = 1;
const ATTACHED_FACE_DISTANCE_EPSILON_INCHES = 0.5;
const MIN_ATTACHMENT_HIGHLIGHT_LENGTH_INCHES = 1;

type PlanBoundsInches = Readonly<{
  minXInches: number;
  maxXInches: number;
  minYInches: number;
  maxYInches: number;
}>;

type MeasurementDirection = "left" | "right" | "top" | "bottom";

type DirectionalMeasurementCandidate = Readonly<{
  direction: MeasurementDirection;
  wallFaceId: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  lengthInches: number;
  labelRotationDegrees: number;
}>;

type DirectionalMeasurementCandidatesByDirection = Record<MeasurementDirection, DirectionalMeasurementCandidate | null>;
type AttachedDirections = Readonly<Record<MeasurementDirection, boolean>>;

export function buildAssemblyWallMeasurementGuides(args: {
  footprint: AssemblyPlacementFootprint;
  placedWallGraphs: readonly PlacedWallGraph[];
}): readonly AssemblyWallMeasurementGuide[] {
  if (args.placedWallGraphs.length === 0) {
    return [];
  }

  const footprintBounds = getFootprintPlanBounds(args.footprint);
  const wallFaces = getWallFaces(args.placedWallGraphs);
  const attachedDirections = getAttachedDirections({ wallFaces, footprintBounds });
  const nearestCandidatesByDirection = wallFaces.reduce<DirectionalMeasurementCandidatesByDirection>(
    (currentCandidatesByDirection, wallFace) => {
      const nextCandidatesByDirection = { ...currentCandidatesByDirection };
      const candidate = createMeasurementCandidate({
        wallFace,
        footprint: args.footprint,
        footprintBounds,
      });

      if (candidate === null || attachedDirections[candidate.direction]) {
        return currentCandidatesByDirection;
      }

      const currentCandidate = nextCandidatesByDirection[candidate.direction];

      if (currentCandidate === null || candidate.lengthInches < currentCandidate.lengthInches) {
        nextCandidatesByDirection[candidate.direction] = candidate;
      }

      return nextCandidatesByDirection;
    },
    {
      left: null,
      right: null,
      top: null,
      bottom: null,
    },
  );

  return [
    nearestCandidatesByDirection.top,
    nearestCandidatesByDirection.right,
    nearestCandidatesByDirection.bottom,
    nearestCandidatesByDirection.left,
  ]
    .filter(isDirectionalMeasurementCandidate)
    .map((candidate) => ({
      id: `assembly-wall-measurement-${candidate.direction}-${candidate.wallFaceId}`,
      startPointInches: candidate.startPointInches,
      endPointInches: candidate.endPointInches,
      lengthInches: candidate.lengthInches,
      labelPointInches: getMidpoint(candidate.startPointInches, candidate.endPointInches),
      labelRotationDegrees: candidate.labelRotationDegrees,
    }));
}

export function buildAssemblyWallAttachmentHighlights(args: {
  footprint: AssemblyPlacementFootprint;
  placedWallGraphs: readonly PlacedWallGraph[];
}): readonly AssemblyWallAttachmentHighlight[] {
  if (args.placedWallGraphs.length === 0) {
    return [];
  }

  const footprintBounds = getFootprintPlanBounds(args.footprint);

  return getWallFaces(args.placedWallGraphs)
    .map((wallFace) => createAttachmentHighlight({ wallFace, footprintBounds }))
    .filter(isAssemblyWallAttachmentHighlight);
}

function getWallFaces(placedWallGraphs: readonly PlacedWallGraph[]): readonly WallSegmentFace[] {
  return placedWallGraphs.flatMap((placedWallGraph) => buildConnectedWallGeometry(placedWallGraph).faces);
}

function getAttachedDirections(args: {
  wallFaces: readonly WallSegmentFace[];
  footprintBounds: PlanBoundsInches;
}): AttachedDirections {
  return args.wallFaces.reduce<AttachedDirections>(
    (attachedDirections, wallFace) => {
      const direction = getAttachedDirection({ wallFace, footprintBounds: args.footprintBounds });

      if (direction === null) {
        return attachedDirections;
      }

      return {
        ...attachedDirections,
        [direction]: true,
      };
    },
    {
      left: false,
      right: false,
      top: false,
      bottom: false,
    },
  );
}

function createMeasurementCandidate(args: {
  wallFace: WallSegmentFace;
  footprint: AssemblyPlacementFootprint;
  footprintBounds: PlanBoundsInches;
}): DirectionalMeasurementCandidate | null {
  if (isHorizontalWallFace(args.wallFace)) {
    return createVerticalMeasurementCandidate(args);
  }

  if (isVerticalWallFace(args.wallFace)) {
    return createHorizontalMeasurementCandidate(args);
  }

  return null;
}

function createVerticalMeasurementCandidate(args: {
  wallFace: WallSegmentFace;
  footprint: AssemblyPlacementFootprint;
  footprintBounds: PlanBoundsInches;
}): DirectionalMeasurementCandidate | null {
  const centerXInches = args.footprint.centerPointInches.xInches;
  const faceMinXInches = Math.min(args.wallFace.startPointInches.xInches, args.wallFace.endPointInches.xInches);
  const faceMaxXInches = Math.max(args.wallFace.startPointInches.xInches, args.wallFace.endPointInches.xInches);

  if (!isValueInsideRange({
    valueInches: centerXInches,
    minInches: faceMinXInches,
    maxInches: faceMaxXInches,
    toleranceInches: FACE_SPAN_TOLERANCE_INCHES,
  })) {
    return null;
  }

  const wallYInches = (args.wallFace.startPointInches.yInches + args.wallFace.endPointInches.yInches) / 2;

  if (wallYInches >= args.footprintBounds.maxYInches + MIN_MEASUREMENT_LENGTH_INCHES) {
    const startPointInches = createPlanPoint({
      xInches: centerXInches,
      yInches: args.footprintBounds.maxYInches,
    });
    const endPointInches = createPlanPoint({
      xInches: centerXInches,
      yInches: wallYInches,
    });

    return {
      direction: "top",
      wallFaceId: args.wallFace.id,
      startPointInches,
      endPointInches,
      lengthInches: Math.abs(wallYInches - args.footprintBounds.maxYInches),
      labelRotationDegrees: 90,
    };
  }

  if (wallYInches <= args.footprintBounds.minYInches - MIN_MEASUREMENT_LENGTH_INCHES) {
    const startPointInches = createPlanPoint({
      xInches: centerXInches,
      yInches: args.footprintBounds.minYInches,
    });
    const endPointInches = createPlanPoint({
      xInches: centerXInches,
      yInches: wallYInches,
    });

    return {
      direction: "bottom",
      wallFaceId: args.wallFace.id,
      startPointInches,
      endPointInches,
      lengthInches: Math.abs(args.footprintBounds.minYInches - wallYInches),
      labelRotationDegrees: 90,
    };
  }

  return null;
}

function createHorizontalMeasurementCandidate(args: {
  wallFace: WallSegmentFace;
  footprint: AssemblyPlacementFootprint;
  footprintBounds: PlanBoundsInches;
}): DirectionalMeasurementCandidate | null {
  const centerYInches = args.footprint.centerPointInches.yInches;
  const faceMinYInches = Math.min(args.wallFace.startPointInches.yInches, args.wallFace.endPointInches.yInches);
  const faceMaxYInches = Math.max(args.wallFace.startPointInches.yInches, args.wallFace.endPointInches.yInches);

  if (!isValueInsideRange({
    valueInches: centerYInches,
    minInches: faceMinYInches,
    maxInches: faceMaxYInches,
    toleranceInches: FACE_SPAN_TOLERANCE_INCHES,
  })) {
    return null;
  }

  const wallXInches = (args.wallFace.startPointInches.xInches + args.wallFace.endPointInches.xInches) / 2;

  if (wallXInches >= args.footprintBounds.maxXInches + MIN_MEASUREMENT_LENGTH_INCHES) {
    const startPointInches = createPlanPoint({
      xInches: args.footprintBounds.maxXInches,
      yInches: centerYInches,
    });
    const endPointInches = createPlanPoint({
      xInches: wallXInches,
      yInches: centerYInches,
    });

    return {
      direction: "right",
      wallFaceId: args.wallFace.id,
      startPointInches,
      endPointInches,
      lengthInches: Math.abs(wallXInches - args.footprintBounds.maxXInches),
      labelRotationDegrees: 0,
    };
  }

  if (wallXInches <= args.footprintBounds.minXInches - MIN_MEASUREMENT_LENGTH_INCHES) {
    const startPointInches = createPlanPoint({
      xInches: args.footprintBounds.minXInches,
      yInches: centerYInches,
    });
    const endPointInches = createPlanPoint({
      xInches: wallXInches,
      yInches: centerYInches,
    });

    return {
      direction: "left",
      wallFaceId: args.wallFace.id,
      startPointInches,
      endPointInches,
      lengthInches: Math.abs(args.footprintBounds.minXInches - wallXInches),
      labelRotationDegrees: 0,
    };
  }

  return null;
}

function createAttachmentHighlight(args: {
  wallFace: WallSegmentFace;
  footprintBounds: PlanBoundsInches;
}): AssemblyWallAttachmentHighlight | null {
  if (isHorizontalWallFace(args.wallFace)) {
    return createHorizontalAttachmentHighlight(args);
  }

  if (isVerticalWallFace(args.wallFace)) {
    return createVerticalAttachmentHighlight(args);
  }

  return null;
}

function createHorizontalAttachmentHighlight(args: {
  wallFace: WallSegmentFace;
  footprintBounds: PlanBoundsInches;
}): AssemblyWallAttachmentHighlight | null {
  const wallYInches = (args.wallFace.startPointInches.yInches + args.wallFace.endPointInches.yInches) / 2;
  const isAttachedToObjectTop = Math.abs(wallYInches - args.footprintBounds.maxYInches) <= ATTACHED_FACE_DISTANCE_EPSILON_INCHES;
  const isAttachedToObjectBottom = Math.abs(wallYInches - args.footprintBounds.minYInches) <= ATTACHED_FACE_DISTANCE_EPSILON_INCHES;

  if (!isAttachedToObjectTop && !isAttachedToObjectBottom) {
    return null;
  }

  const faceMinXInches = Math.min(args.wallFace.startPointInches.xInches, args.wallFace.endPointInches.xInches);
  const faceMaxXInches = Math.max(args.wallFace.startPointInches.xInches, args.wallFace.endPointInches.xInches);
  const overlapMinXInches = Math.max(faceMinXInches, args.footprintBounds.minXInches);
  const overlapMaxXInches = Math.min(faceMaxXInches, args.footprintBounds.maxXInches);

  if (overlapMaxXInches - overlapMinXInches < MIN_ATTACHMENT_HIGHLIGHT_LENGTH_INCHES) {
    return null;
  }

  return {
    id: `assembly-wall-attachment-${args.wallFace.id}`,
    startPointInches: createPlanPoint({ xInches: overlapMinXInches, yInches: wallYInches }),
    endPointInches: createPlanPoint({ xInches: overlapMaxXInches, yInches: wallYInches }),
  };
}

function createVerticalAttachmentHighlight(args: {
  wallFace: WallSegmentFace;
  footprintBounds: PlanBoundsInches;
}): AssemblyWallAttachmentHighlight | null {
  const wallXInches = (args.wallFace.startPointInches.xInches + args.wallFace.endPointInches.xInches) / 2;
  const isAttachedToObjectRight = Math.abs(wallXInches - args.footprintBounds.maxXInches) <= ATTACHED_FACE_DISTANCE_EPSILON_INCHES;
  const isAttachedToObjectLeft = Math.abs(wallXInches - args.footprintBounds.minXInches) <= ATTACHED_FACE_DISTANCE_EPSILON_INCHES;

  if (!isAttachedToObjectRight && !isAttachedToObjectLeft) {
    return null;
  }

  const faceMinYInches = Math.min(args.wallFace.startPointInches.yInches, args.wallFace.endPointInches.yInches);
  const faceMaxYInches = Math.max(args.wallFace.startPointInches.yInches, args.wallFace.endPointInches.yInches);
  const overlapMinYInches = Math.max(faceMinYInches, args.footprintBounds.minYInches);
  const overlapMaxYInches = Math.min(faceMaxYInches, args.footprintBounds.maxYInches);

  if (overlapMaxYInches - overlapMinYInches < MIN_ATTACHMENT_HIGHLIGHT_LENGTH_INCHES) {
    return null;
  }

  return {
    id: `assembly-wall-attachment-${args.wallFace.id}`,
    startPointInches: createPlanPoint({ xInches: wallXInches, yInches: overlapMinYInches }),
    endPointInches: createPlanPoint({ xInches: wallXInches, yInches: overlapMaxYInches }),
  };
}

function getAttachedDirection(args: {
  wallFace: WallSegmentFace;
  footprintBounds: PlanBoundsInches;
}): MeasurementDirection | null {
  if (isHorizontalWallFace(args.wallFace)) {
    const wallYInches = (args.wallFace.startPointInches.yInches + args.wallFace.endPointInches.yInches) / 2;
    const faceMinXInches = Math.min(args.wallFace.startPointInches.xInches, args.wallFace.endPointInches.xInches);
    const faceMaxXInches = Math.max(args.wallFace.startPointInches.xInches, args.wallFace.endPointInches.xInches);

    if (!doRangesOverlap({
      firstMinInches: args.footprintBounds.minXInches,
      firstMaxInches: args.footprintBounds.maxXInches,
      secondMinInches: faceMinXInches,
      secondMaxInches: faceMaxXInches,
    })) {
      return null;
    }

    if (Math.abs(wallYInches - args.footprintBounds.maxYInches) <= ATTACHED_FACE_DISTANCE_EPSILON_INCHES) {
      return "top";
    }

    if (Math.abs(wallYInches - args.footprintBounds.minYInches) <= ATTACHED_FACE_DISTANCE_EPSILON_INCHES) {
      return "bottom";
    }
  }

  if (isVerticalWallFace(args.wallFace)) {
    const wallXInches = (args.wallFace.startPointInches.xInches + args.wallFace.endPointInches.xInches) / 2;
    const faceMinYInches = Math.min(args.wallFace.startPointInches.yInches, args.wallFace.endPointInches.yInches);
    const faceMaxYInches = Math.max(args.wallFace.startPointInches.yInches, args.wallFace.endPointInches.yInches);

    if (!doRangesOverlap({
      firstMinInches: args.footprintBounds.minYInches,
      firstMaxInches: args.footprintBounds.maxYInches,
      secondMinInches: faceMinYInches,
      secondMaxInches: faceMaxYInches,
    })) {
      return null;
    }

    if (Math.abs(wallXInches - args.footprintBounds.maxXInches) <= ATTACHED_FACE_DISTANCE_EPSILON_INCHES) {
      return "right";
    }

    if (Math.abs(wallXInches - args.footprintBounds.minXInches) <= ATTACHED_FACE_DISTANCE_EPSILON_INCHES) {
      return "left";
    }
  }

  return null;
}

function getFootprintPlanBounds(footprint: AssemblyPlacementFootprint): PlanBoundsInches {
  return footprint.cornerPointsInches.reduce<PlanBoundsInches>(
    (bounds, cornerPointInches) => ({
      minXInches: Math.min(bounds.minXInches, cornerPointInches.xInches),
      maxXInches: Math.max(bounds.maxXInches, cornerPointInches.xInches),
      minYInches: Math.min(bounds.minYInches, cornerPointInches.yInches),
      maxYInches: Math.max(bounds.maxYInches, cornerPointInches.yInches),
    }),
    {
      minXInches: Number.POSITIVE_INFINITY,
      maxXInches: Number.NEGATIVE_INFINITY,
      minYInches: Number.POSITIVE_INFINITY,
      maxYInches: Number.NEGATIVE_INFINITY,
    },
  );
}

function isValueInsideRange(args: {
  valueInches: number;
  minInches: number;
  maxInches: number;
  toleranceInches: number;
}): boolean {
  return args.valueInches >= args.minInches - args.toleranceInches && args.valueInches <= args.maxInches + args.toleranceInches;
}

function doRangesOverlap(args: {
  firstMinInches: number;
  firstMaxInches: number;
  secondMinInches: number;
  secondMaxInches: number;
}): boolean {
  return args.firstMaxInches >= args.secondMinInches && args.secondMaxInches >= args.firstMinInches;
}

function isHorizontalWallFace(wallFace: WallSegmentFace): boolean {
  return Math.abs(wallFace.endPointInches.yInches - wallFace.startPointInches.yInches) <= AXIS_ALIGNED_FACE_EPSILON_INCHES;
}

function isVerticalWallFace(wallFace: WallSegmentFace): boolean {
  return Math.abs(wallFace.endPointInches.xInches - wallFace.startPointInches.xInches) <= AXIS_ALIGNED_FACE_EPSILON_INCHES;
}

function getMidpoint(firstPointInches: Point3DInches, secondPointInches: Point3DInches): Point3DInches {
  return createPlanPoint({
    xInches: (firstPointInches.xInches + secondPointInches.xInches) / 2,
    yInches: (firstPointInches.yInches + secondPointInches.yInches) / 2,
  });
}

function createPlanPoint(pointInches: Readonly<{ xInches: number; yInches: number }>): Point3DInches {
  return {
    xInches: pointInches.xInches,
    yInches: pointInches.yInches,
    zInches: 0,
  };
}

function isDirectionalMeasurementCandidate(
  candidate: DirectionalMeasurementCandidate | null,
): candidate is DirectionalMeasurementCandidate {
  return candidate !== null;
}

function isAssemblyWallAttachmentHighlight(
  highlight: AssemblyWallAttachmentHighlight | null,
): highlight is AssemblyWallAttachmentHighlight {
  return highlight !== null;
}
