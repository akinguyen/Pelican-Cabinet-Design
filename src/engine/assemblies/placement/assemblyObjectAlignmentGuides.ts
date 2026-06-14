import type { Point2DInches, Point3DInches } from "@/core/geometry/pointTypes";
import { degreesToUserFacingZRadians } from "@/core/geometry/rotationTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { createCountertopOpeningRequestedPolygon } from "@/engine/countertops/countertopOpeningGeometry";
import type { CountertopOpening } from "@/engine/countertops/countertopOpeningTypes";
import type { WallOpening } from "@/engine/walls/placedWallSegmentTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { WallSegmentFace } from "@/engine/walls/wallSegmentTopologyTypes";
import { createAssemblyPlacementFootprint, translateAssemblyPlacement } from "./assemblyPlacementGeometry";
import type {
  AssemblyObjectAlignmentGuide,
  AssemblyPlacementElevationFrame,
  AssemblyPlacementFootprint,
  AssemblyPlacementSnapContext,
  AssemblyPlacementSnapTarget,
} from "./assemblyPlacementTypes";
import {
  arePlanDirectionsParallel,
  getPlanDotProduct,
  getPlanPerpendicularVector,
  getPlacementEdgePlanSegment,
  getPlanPointAtProjection,
  getPlanSignedDistanceToLine,
  getPlanVectorLength,
  getProjectedSegmentOverlap,
  getProjectedSegmentSpan,
  normalizePlanVector,
  projectPointOntoPlanDirection,
  translatePlanPoint,
  type PlanLineSegmentInches,
  type PlanVector2DInches,
} from "./assemblyPlacementPlanGeometry";

const OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES = 3;
const WALL_ALIGNMENT_SNAP_DISTANCE_INCHES = 6;
const OBJECT_ALIGNMENT_PARALLEL_ANGLE_TOLERANCE_DEGREES = 2;
const OBJECT_ALIGNMENT_REMAINING_DISTANCE_TOLERANCE_INCHES = 0.125;
const OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES = 8;
const OBJECT_ALIGNMENT_MAX_GUIDES = 2;
const OBJECT_ELEVATION_ALIGNMENT_DEPTH_TOLERANCE_INCHES = 18;
const WALL_ALIGNMENT_PLAN_DEPTH_TOLERANCE_INCHES = 6;
const OBJECT_WALL_OPENING_PLAN_DEPTH_TOLERANCE_INCHES = 6;
const WALL_OPENING_PLAN_TARGET_THICKNESS_INCHES = 2;
const COUNTERTOP_OPENING_ELEVATION_TARGET_THICKNESS_INCHES = 1;

type AlignmentLineKind = "edge" | "center";

type ObjectAlignmentLine = Readonly<{
  id: string;
  lineKind: AlignmentLineKind;
  axisIndex: number;
  pointInches: Point3DInches;
  directionInches: PlanVector2DInches;
  normalInches: PlanVector2DInches;
  segmentInches: PlanLineSegmentInches;
}>;

type ObjectAlignmentTargetKind = "assembly" | "countertop-opening" | "wall-opening" | "wall-face" | "wall-centerline";

type ObjectAlignmentFootprint = Readonly<{
  assemblyId: string;
  targetKind: ObjectAlignmentTargetKind;
  targetPriority: number;
  snapDistanceInches: number;
  footprint: AssemblyPlacementFootprint;
  lines: readonly ObjectAlignmentLine[];
}>;

type ObjectAlignmentDeltaInches = Readonly<{
  xInches: number;
  yInches: number;
  zInches?: number;
}>;

type ObjectAlignmentCandidate = Readonly<{
  targetAssemblyId: string;
  movingLine: ObjectAlignmentLine;
  targetLine: ObjectAlignmentLine;
  deltaInches: ObjectAlignmentDeltaInches;
  distanceInches: number;
  remainingDistanceInches: number;
  priority: number;
  targetPriority: number;
}>;

export type AssemblyObjectAlignmentConstraint = Readonly<{
  lockedNormalInches?: PlanVector2DInches;
}>;

type ElevationAlignmentAxis = "u" | "z";

type ElevationAlignmentAnchorKind = "edge" | "center";

type ElevationAlignmentBox = Readonly<{
  assemblyId: string;
  leftInches: number;
  centerInches: number;
  rightInches: number;
  bottomInches: number;
  middleInches: number;
  topInches: number;
  depthInches: number;
}>;

type ElevationAlignmentAnchor = Readonly<{
  axis: ElevationAlignmentAxis;
  anchorKind: ElevationAlignmentAnchorKind;
  valueInches: number;
}>;

type ElevationAlignmentCandidate = Readonly<{
  targetAssemblyId: string;
  axis: ElevationAlignmentAxis;
  movingAnchor: ElevationAlignmentAnchor;
  targetAnchor: ElevationAlignmentAnchor;
  deltaInches: ObjectAlignmentDeltaInches;
  distanceInches: number;
  priority: number;
}>;

export type AssemblyObjectAlignmentResult = Readonly<{
  placedAssembly: PlacedAssembly;
  objectAlignmentGuides: readonly AssemblyObjectAlignmentGuide[];
  snapTarget: AssemblyPlacementSnapTarget | null;
}>;

export function alignAssemblyPlacementWithNearbyObjects(args: {
  placedAssembly: PlacedAssembly;
  placedAssemblies: readonly PlacedAssembly[];
  placedWallGraphs?: readonly PlacedWallGraph[];
  countertopOpenings?: readonly CountertopOpening[];
  movingAssemblyId?: string;
  snapContext?: AssemblyPlacementSnapContext;
  constraint?: AssemblyObjectAlignmentConstraint;
}): AssemblyObjectAlignmentResult {
  const targetAssemblies = args.placedAssemblies.filter((placedAssembly) => (
    placedAssembly.id !== args.movingAssemblyId && placedAssembly.id !== args.placedAssembly.id
  ));

  if (args.snapContext?.movementSource === "elevation" && args.snapContext.elevationMoveFrame !== undefined) {
    return alignAssemblyPlacementWithElevationObjects({
      placedAssembly: args.placedAssembly,
      targetAssemblies,
      placedWallGraphs: args.placedWallGraphs ?? [],
      countertopOpenings: args.countertopOpenings ?? [],
      allPlacedAssemblies: args.placedAssemblies,
      elevationFrame: args.snapContext.elevationMoveFrame,
    });
  }

  const movingAlignmentFootprint = createObjectAlignmentFootprint({
    assemblyId: args.placedAssembly.id,
    targetKind: "assembly",
    targetPriority: 0,
    snapDistanceInches: OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES,
    footprint: createAssemblyPlacementFootprint(args.placedAssembly),
  });
  const targetAlignmentFootprints = [
    ...createWallFacePlanAlignmentFootprints({
      placedWallGraphs: args.placedWallGraphs ?? [],
      movingAlignmentFootprint,
    }),
    ...createWallCenterlinePlanAlignmentFootprints({
      placedWallGraphs: args.placedWallGraphs ?? [],
      movingAlignmentFootprint,
    }),
    ...targetAssemblies.map((targetAssembly) => createObjectAlignmentFootprint({
      assemblyId: targetAssembly.id,
      targetKind: "assembly",
      targetPriority: 0,
      snapDistanceInches: OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES,
      footprint: createAssemblyPlacementFootprint(targetAssembly),
    })),
    ...createCountertopOpeningAlignmentFootprints({
      placedAssemblies: args.placedAssemblies,
      countertopOpenings: args.countertopOpenings ?? [],
    }),
    ...createWallOpeningPlanAlignmentFootprints({
      placedWallGraphs: args.placedWallGraphs ?? [],
    }),
  ];
  const candidates = findObjectAlignmentCandidates({
    movingAlignmentFootprint,
    targetAlignmentFootprints,
    constraint: args.constraint,
  });

  if (candidates.length === 0) {
    return createEmptyObjectAlignmentResult(args.placedAssembly);
  }

  const selectedCandidates = selectCompatibleAlignmentCandidates(candidates);
  const alignmentDeltaInches = combineAlignmentCandidateDeltas(selectedCandidates);

  if (getPlanVectorLength(alignmentDeltaInches) <= OBJECT_ALIGNMENT_REMAINING_DISTANCE_TOLERANCE_INCHES) {
    return {
      placedAssembly: args.placedAssembly,
      objectAlignmentGuides: buildAlignmentGuides({
        movingAlignmentFootprint,
        targetAlignmentFootprints,
        selectedCandidates,
        finalDeltaInches: alignmentDeltaInches,
      }),
      snapTarget: createAlignmentSnapTarget(selectedCandidates),
    };
  }

  const alignedPlacedAssembly = translateAssemblyPlacement(args.placedAssembly, alignmentDeltaInches);
  const translatedMovingAlignmentFootprint = createObjectAlignmentFootprint({
    assemblyId: alignedPlacedAssembly.id,
    targetKind: "assembly",
    targetPriority: 0,
    snapDistanceInches: OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES,
    footprint: createAssemblyPlacementFootprint(alignedPlacedAssembly),
  });

  return {
    placedAssembly: alignedPlacedAssembly,
    objectAlignmentGuides: buildAlignmentGuides({
      movingAlignmentFootprint: translatedMovingAlignmentFootprint,
      targetAlignmentFootprints,
      selectedCandidates,
      finalDeltaInches: { xInches: 0, yInches: 0 },
    }),
    snapTarget: createAlignmentSnapTarget(selectedCandidates),
  };
}

function createEmptyObjectAlignmentResult(placedAssembly: PlacedAssembly): AssemblyObjectAlignmentResult {
  return {
    placedAssembly,
    objectAlignmentGuides: [],
    snapTarget: null,
  };
}

function alignAssemblyPlacementWithElevationObjects(args: {
  placedAssembly: PlacedAssembly;
  targetAssemblies: readonly PlacedAssembly[];
  placedWallGraphs: readonly PlacedWallGraph[];
  countertopOpenings: readonly CountertopOpening[];
  allPlacedAssemblies: readonly PlacedAssembly[];
  elevationFrame: AssemblyPlacementElevationFrame;
}): AssemblyObjectAlignmentResult {
  const movingBox = createElevationAlignmentBox({
    placedAssembly: args.placedAssembly,
    elevationFrame: args.elevationFrame,
  });

  if (movingBox === null) {
    return createEmptyObjectAlignmentResult(args.placedAssembly);
  }

  const targetBoxes = [
    ...createWallFaceElevationAlignmentBoxes({
      placedWallGraphs: args.placedWallGraphs,
      elevationFrame: args.elevationFrame,
      movingDepthInches: movingBox.depthInches,
    }),
    ...args.targetAssemblies
      .map((targetAssembly) => createElevationAlignmentBox({
        placedAssembly: targetAssembly,
        elevationFrame: args.elevationFrame,
      }))
      .filter(isElevationAlignmentBox)
      .filter((targetBox) => Math.abs(targetBox.depthInches - movingBox.depthInches) <= (
        OBJECT_ELEVATION_ALIGNMENT_DEPTH_TOLERANCE_INCHES
      )),
    ...createWallOpeningElevationAlignmentBoxes({
      placedWallGraphs: args.placedWallGraphs,
      elevationFrame: args.elevationFrame,
    }),
    ...createCountertopOpeningElevationAlignmentBoxes({
      placedAssemblies: args.allPlacedAssemblies,
      countertopOpenings: args.countertopOpenings,
      elevationFrame: args.elevationFrame,
      movingDepthInches: movingBox.depthInches,
    }),
  ];

  if (targetBoxes.length === 0) {
    return createEmptyObjectAlignmentResult(args.placedAssembly);
  }

  const candidates = findElevationAlignmentCandidates({
    movingBox,
    targetBoxes,
    elevationFrame: args.elevationFrame,
  });

  if (candidates.length === 0) {
    return createEmptyObjectAlignmentResult(args.placedAssembly);
  }

  const selectedCandidates = selectCompatibleElevationAlignmentCandidates(candidates);
  const alignmentDeltaInches = combineElevationAlignmentCandidateDeltas(selectedCandidates);
  const alignedPlacedAssembly = translateAssemblyPlacement(args.placedAssembly, alignmentDeltaInches);
  const alignedMovingBox = createElevationAlignmentBox({
    placedAssembly: alignedPlacedAssembly,
    elevationFrame: args.elevationFrame,
  }) ?? movingBox;

  return {
    placedAssembly: alignedPlacedAssembly,
    objectAlignmentGuides: buildElevationAlignmentGuides({
      movingBox: alignedMovingBox,
      targetBoxes,
      selectedCandidates,
      elevationFrame: args.elevationFrame,
    }),
    snapTarget: createElevationAlignmentSnapTarget(selectedCandidates),
  };
}

function createElevationAlignmentBox(args: {
  placedAssembly: PlacedAssembly;
  elevationFrame: AssemblyPlacementElevationFrame;
}): ElevationAlignmentBox | null {
  const faceDirectionInches = normalizePlanVector({
    xInches: args.elevationFrame.faceDirectionInches.xInches,
    yInches: args.elevationFrame.faceDirectionInches.yInches,
  });
  const outwardDirectionInches = normalizePlanVector({
    xInches: args.elevationFrame.outwardDirectionInches.xInches,
    yInches: args.elevationFrame.outwardDirectionInches.yInches,
  });

  if (faceDirectionInches === null || outwardDirectionInches === null) {
    return null;
  }

  const footprint = createAssemblyPlacementFootprint(args.placedAssembly);
  const projectedUValuesInches = footprint.cornerPointsInches.map((cornerPointInches) => getElevationUInches({
    pointInches: cornerPointInches,
    elevationFrame: args.elevationFrame,
    faceDirectionInches,
  }));
  const depthInches = getPlanDotProduct(
    {
      xInches: args.placedAssembly.worldPositionInches.xInches - args.elevationFrame.planeOriginInches.xInches,
      yInches: args.placedAssembly.worldPositionInches.yInches - args.elevationFrame.planeOriginInches.yInches,
    },
    outwardDirectionInches,
  );
  const halfHeightInches = args.placedAssembly.configuration.sizeInches.heightInches / 2;
  const leftInches = Math.min(...projectedUValuesInches);
  const rightInches = Math.max(...projectedUValuesInches);
  const bottomInches = args.placedAssembly.worldPositionInches.zInches - halfHeightInches;
  const topInches = args.placedAssembly.worldPositionInches.zInches + halfHeightInches;

  return {
    assemblyId: args.placedAssembly.id,
    leftInches,
    centerInches: (leftInches + rightInches) / 2,
    rightInches,
    bottomInches,
    middleInches: (bottomInches + topInches) / 2,
    topInches,
    depthInches,
  };
}

function getElevationUInches(args: {
  pointInches: Point3DInches;
  elevationFrame: AssemblyPlacementElevationFrame;
  faceDirectionInches: PlanVector2DInches;
}): number {
  return getPlanDotProduct(
    {
      xInches: args.pointInches.xInches - args.elevationFrame.planeOriginInches.xInches,
      yInches: args.pointInches.yInches - args.elevationFrame.planeOriginInches.yInches,
    },
    args.faceDirectionInches,
  );
}

function findElevationAlignmentCandidates(args: {
  movingBox: ElevationAlignmentBox;
  targetBoxes: readonly ElevationAlignmentBox[];
  elevationFrame: AssemblyPlacementElevationFrame;
}): readonly ElevationAlignmentCandidate[] {
  return args.targetBoxes.flatMap((targetBox) => (
    getElevationAlignmentAnchors(args.movingBox).flatMap((movingAnchor) => (
      getElevationAlignmentAnchors(targetBox)
        .map((targetAnchor) => createElevationAlignmentCandidate({
          movingAnchor,
          targetAnchor,
          targetAssemblyId: targetBox.assemblyId,
          elevationFrame: args.elevationFrame,
        }))
        .filter(isElevationAlignmentCandidate)
    ))
  )).sort(compareElevationAlignmentCandidates);
}

function getElevationAlignmentAnchors(box: ElevationAlignmentBox): readonly ElevationAlignmentAnchor[] {
  return [
    { axis: "u", anchorKind: "edge", valueInches: box.leftInches },
    { axis: "u", anchorKind: "center", valueInches: box.centerInches },
    { axis: "u", anchorKind: "edge", valueInches: box.rightInches },
    { axis: "z", anchorKind: "edge", valueInches: box.bottomInches },
    { axis: "z", anchorKind: "center", valueInches: box.middleInches },
    { axis: "z", anchorKind: "edge", valueInches: box.topInches },
  ];
}

function createElevationAlignmentCandidate(args: {
  movingAnchor: ElevationAlignmentAnchor;
  targetAnchor: ElevationAlignmentAnchor;
  targetAssemblyId: string;
  elevationFrame: AssemblyPlacementElevationFrame;
}): ElevationAlignmentCandidate | null {
  if (args.movingAnchor.axis !== args.targetAnchor.axis) {
    return null;
  }

  const deltaValueInches = args.targetAnchor.valueInches - args.movingAnchor.valueInches;
  const distanceInches = Math.abs(deltaValueInches);

  if (distanceInches > OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES) {
    return null;
  }

  const deltaInches = args.movingAnchor.axis === "u"
    ? {
        xInches: args.elevationFrame.faceDirectionInches.xInches * deltaValueInches,
        yInches: args.elevationFrame.faceDirectionInches.yInches * deltaValueInches,
        zInches: 0,
      }
    : {
        xInches: 0,
        yInches: 0,
        zInches: deltaValueInches,
      };

  return {
    targetAssemblyId: args.targetAssemblyId,
    axis: args.movingAnchor.axis,
    movingAnchor: args.movingAnchor,
    targetAnchor: args.targetAnchor,
    deltaInches,
    distanceInches,
    priority: getElevationAlignmentPriority(args.movingAnchor, args.targetAnchor),
  };
}

function getElevationAlignmentPriority(
  movingAnchor: ElevationAlignmentAnchor,
  targetAnchor: ElevationAlignmentAnchor,
): number {
  if (movingAnchor.anchorKind === "center" && targetAnchor.anchorKind === "center") {
    return 0;
  }

  if (movingAnchor.anchorKind === "edge" && targetAnchor.anchorKind === "edge") {
    return 1;
  }

  return 2;
}

function compareElevationAlignmentCandidates(
  firstCandidate: ElevationAlignmentCandidate,
  secondCandidate: ElevationAlignmentCandidate,
): number {
  if (firstCandidate.priority !== secondCandidate.priority) {
    return firstCandidate.priority - secondCandidate.priority;
  }

  return firstCandidate.distanceInches - secondCandidate.distanceInches;
}

function selectCompatibleElevationAlignmentCandidates(
  candidates: readonly ElevationAlignmentCandidate[],
): readonly ElevationAlignmentCandidate[] {
  const firstCandidate = candidates[0];

  if (firstCandidate === undefined) {
    return [];
  }

  const secondAxisCandidate = candidates.find((candidate) => (
    candidate !== firstCandidate && candidate.axis !== firstCandidate.axis
  ));

  return secondAxisCandidate === undefined
    ? [firstCandidate]
    : [firstCandidate, secondAxisCandidate].slice(0, OBJECT_ALIGNMENT_MAX_GUIDES);
}

function combineElevationAlignmentCandidateDeltas(
  candidates: readonly ElevationAlignmentCandidate[],
): ObjectAlignmentDeltaInches {
  return candidates.reduce<ObjectAlignmentDeltaInches>((combinedDeltaInches, candidate) => ({
    xInches: combinedDeltaInches.xInches + candidate.deltaInches.xInches,
    yInches: combinedDeltaInches.yInches + candidate.deltaInches.yInches,
    zInches: (combinedDeltaInches.zInches ?? 0) + (candidate.deltaInches.zInches ?? 0),
  }), { xInches: 0, yInches: 0, zInches: 0 });
}

function buildElevationAlignmentGuides(args: {
  movingBox: ElevationAlignmentBox;
  targetBoxes: readonly ElevationAlignmentBox[];
  selectedCandidates: readonly ElevationAlignmentCandidate[];
  elevationFrame: AssemblyPlacementElevationFrame;
}): readonly AssemblyObjectAlignmentGuide[] {
  return args.selectedCandidates.map((candidate) => {
    const targetBox = args.targetBoxes.find((box) => box.assemblyId === candidate.targetAssemblyId) ?? args.movingBox;

    return candidate.axis === "u"
      ? createElevationVerticalGuide({
          movingBox: args.movingBox,
          targetBox,
          candidate,
          elevationFrame: args.elevationFrame,
        })
      : createElevationHorizontalGuide({
          movingBox: args.movingBox,
          targetBox,
          candidate,
          elevationFrame: args.elevationFrame,
        });
  });
}

function createElevationVerticalGuide(args: {
  movingBox: ElevationAlignmentBox;
  targetBox: ElevationAlignmentBox;
  candidate: ElevationAlignmentCandidate;
  elevationFrame: AssemblyPlacementElevationFrame;
}): AssemblyObjectAlignmentGuide {
  const minZInches = Math.min(args.movingBox.bottomInches, args.targetBox.bottomInches) - OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES;
  const maxZInches = Math.max(args.movingBox.topInches, args.targetBox.topInches) + OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES;

  return {
    id: `object-elevation-alignment-${args.candidate.targetAssemblyId}-${args.candidate.axis}-${args.candidate.targetAnchor.valueInches}`,
    guideKind: getElevationGuideKind(args.candidate),
    guidePlane: "elevation",
    startPointInches: createElevationGuidePoint({
      elevationFrame: args.elevationFrame,
      uInches: args.candidate.targetAnchor.valueInches,
      zInches: minZInches,
      depthInches: args.movingBox.depthInches,
    }),
    endPointInches: createElevationGuidePoint({
      elevationFrame: args.elevationFrame,
      uInches: args.candidate.targetAnchor.valueInches,
      zInches: maxZInches,
      depthInches: args.movingBox.depthInches,
    }),
  };
}

function createElevationHorizontalGuide(args: {
  movingBox: ElevationAlignmentBox;
  targetBox: ElevationAlignmentBox;
  candidate: ElevationAlignmentCandidate;
  elevationFrame: AssemblyPlacementElevationFrame;
}): AssemblyObjectAlignmentGuide {
  const minUInches = Math.min(args.movingBox.leftInches, args.targetBox.leftInches) - OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES;
  const maxUInches = Math.max(args.movingBox.rightInches, args.targetBox.rightInches) + OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES;

  return {
    id: `object-elevation-alignment-${args.candidate.targetAssemblyId}-${args.candidate.axis}-${args.candidate.targetAnchor.valueInches}`,
    guideKind: getElevationGuideKind(args.candidate),
    guidePlane: "elevation",
    startPointInches: createElevationGuidePoint({
      elevationFrame: args.elevationFrame,
      uInches: minUInches,
      zInches: args.candidate.targetAnchor.valueInches,
      depthInches: args.movingBox.depthInches,
    }),
    endPointInches: createElevationGuidePoint({
      elevationFrame: args.elevationFrame,
      uInches: maxUInches,
      zInches: args.candidate.targetAnchor.valueInches,
      depthInches: args.movingBox.depthInches,
    }),
  };
}

function createElevationGuidePoint(args: {
  elevationFrame: AssemblyPlacementElevationFrame;
  uInches: number;
  zInches: number;
  depthInches: number;
}): Point3DInches {
  return {
    xInches:
      args.elevationFrame.planeOriginInches.xInches +
      args.elevationFrame.faceDirectionInches.xInches * args.uInches +
      args.elevationFrame.outwardDirectionInches.xInches * args.depthInches,
    yInches:
      args.elevationFrame.planeOriginInches.yInches +
      args.elevationFrame.faceDirectionInches.yInches * args.uInches +
      args.elevationFrame.outwardDirectionInches.yInches * args.depthInches,
    zInches: args.zInches,
  };
}

function getElevationGuideKind(candidate: ElevationAlignmentCandidate): AssemblyObjectAlignmentGuide["guideKind"] {
  return candidate.movingAnchor.anchorKind === "center" || candidate.targetAnchor.anchorKind === "center"
    ? "center-line"
    : "edge-line";
}

function createElevationAlignmentSnapTarget(
  selectedCandidates: readonly ElevationAlignmentCandidate[],
): AssemblyPlacementSnapTarget | null {
  const firstCandidate = selectedCandidates[0];

  if (firstCandidate === undefined) {
    return null;
  }

  return {
    kind: "object-alignment",
    alignmentKind: selectedCandidates.length > 1 ? "corner" : getElevationGuideKind(firstCandidate),
    targetAssemblyId: firstCandidate.targetAssemblyId,
    distanceInches: firstCandidate.distanceInches,
  };
}

function isElevationAlignmentBox(box: ElevationAlignmentBox | null): box is ElevationAlignmentBox {
  return box !== null;
}

function isElevationAlignmentCandidate(
  candidate: ElevationAlignmentCandidate | null,
): candidate is ElevationAlignmentCandidate {
  return candidate !== null;
}



function createWallFacePlanAlignmentFootprints(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  movingAlignmentFootprint: ObjectAlignmentFootprint;
}): readonly ObjectAlignmentFootprint[] {
  return args.placedWallGraphs.flatMap((wallGraph) => {
    const wallGeometry = buildConnectedWallGeometry(wallGraph);

    return wallGeometry.faces
      .map((face) => createWallFacePlanAlignmentFootprint({
        face,
        movingAlignmentFootprint: args.movingAlignmentFootprint,
      }))
      .filter(isObjectAlignmentFootprint);
  });
}

function createWallCenterlinePlanAlignmentFootprints(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  movingAlignmentFootprint: ObjectAlignmentFootprint;
}): readonly ObjectAlignmentFootprint[] {
  return args.placedWallGraphs.flatMap((wallGraph) => {
    const wallGeometry = buildConnectedWallGeometry(wallGraph);

    return wallGeometry.segmentBodies
      .map((segmentBody) => {
        const centerlineDirectionInches = normalizePlanVector({
          xInches: segmentBody.end.centerPointInches.xInches - segmentBody.start.centerPointInches.xInches,
          yInches: segmentBody.end.centerPointInches.yInches - segmentBody.start.centerPointInches.yInches,
        });

        if (
          centerlineDirectionInches === null ||
          !isWallSegmentCenterlineRelevantToMovingFootprint({
            centerlineStartInches: segmentBody.start.centerPointInches,
            centerlineEndInches: segmentBody.end.centerPointInches,
            centerlineDirectionInches,
            wallThicknessInches: segmentBody.thicknessInches,
            movingAlignmentFootprint: args.movingAlignmentFootprint,
          })
        ) {
          return null;
        }

        return createWallCenterlinePlanAlignmentFootprint({
          segmentId: segmentBody.wallSegmentId,
          startPointInches: segmentBody.start.centerPointInches,
          endPointInches: segmentBody.end.centerPointInches,
          directionInches: centerlineDirectionInches,
        });
      })
      .filter(isObjectAlignmentFootprint);
  });
}

function createWallCenterlinePlanAlignmentFootprint(args: {
  segmentId: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  directionInches: PlanVector2DInches;
}): ObjectAlignmentFootprint {
  const centerPointInches = {
    xInches: (args.startPointInches.xInches + args.endPointInches.xInches) / 2,
    yInches: (args.startPointInches.yInches + args.endPointInches.yInches) / 2,
    zInches: 0,
  };
  const segmentInches = {
    startPointInches: { ...args.startPointInches, zInches: 0 },
    endPointInches: { ...args.endPointInches, zInches: 0 },
  };
  const normalInches = normalizePlanVector(getPlanPerpendicularVector(args.directionInches)) ?? {
    xInches: -args.directionInches.yInches,
    yInches: args.directionInches.xInches,
  };

  return {
    assemblyId: `wall-centerline-${args.segmentId}`,
    targetKind: "wall-centerline",
    targetPriority: -2,
    snapDistanceInches: WALL_ALIGNMENT_SNAP_DISTANCE_INCHES,
    footprint: {
      centerPointInches,
      cornerPointsInches: [segmentInches.startPointInches, segmentInches.endPointInches],
      edges: [{
        index: 0,
        startPointInches: segmentInches.startPointInches,
        endPointInches: segmentInches.endPointInches,
        midpointInches: centerPointInches,
        lengthInches: Math.hypot(
          segmentInches.endPointInches.xInches - segmentInches.startPointInches.xInches,
          segmentInches.endPointInches.yInches - segmentInches.startPointInches.yInches,
        ),
      }],
    },
    lines: [{
      id: `wall-centerline-${args.segmentId}-center`,
      lineKind: "center",
      axisIndex: 0,
      pointInches: centerPointInches,
      directionInches: args.directionInches,
      normalInches,
      segmentInches,
    }],
  };
}

function createWallFacePlanAlignmentFootprint(args: {
  face: WallSegmentFace;
  movingAlignmentFootprint: ObjectAlignmentFootprint;
}): ObjectAlignmentFootprint | null {
  const faceDirectionInches = normalizePlanVector({
    xInches: args.face.endPointInches.xInches - args.face.startPointInches.xInches,
    yInches: args.face.endPointInches.yInches - args.face.startPointInches.yInches,
  });
  const faceNormalInches = normalizePlanVector(args.face.normalInches);

  if (
    faceDirectionInches === null ||
    faceNormalInches === null ||
    !isWallFaceRelevantToMovingFootprint({
      face: args.face,
      faceDirectionInches,
      movingAlignmentFootprint: args.movingAlignmentFootprint,
      distanceToleranceInches: WALL_ALIGNMENT_PLAN_DEPTH_TOLERANCE_INCHES,
    })
  ) {
    return null;
  }

  const halfTargetThicknessInches = 0.01;
  const frontStartPointInches = offsetPlanPoint({
    pointInches: args.face.startPointInches,
    directionInches: faceNormalInches,
    distanceInches: halfTargetThicknessInches,
  });
  const frontEndPointInches = offsetPlanPoint({
    pointInches: args.face.endPointInches,
    directionInches: faceNormalInches,
    distanceInches: halfTargetThicknessInches,
  });
  const backEndPointInches = offsetPlanPoint({
    pointInches: args.face.endPointInches,
    directionInches: faceNormalInches,
    distanceInches: -halfTargetThicknessInches,
  });
  const backStartPointInches = offsetPlanPoint({
    pointInches: args.face.startPointInches,
    directionInches: faceNormalInches,
    distanceInches: -halfTargetThicknessInches,
  });
  const centerPointInches = {
    xInches: (args.face.startPointInches.xInches + args.face.endPointInches.xInches) / 2,
    yInches: (args.face.startPointInches.yInches + args.face.endPointInches.yInches) / 2,
    zInches: 0,
  };

  return createObjectAlignmentFootprintFromPlanPoints({
    assemblyId: `wall-face-${args.face.id}`,
    targetKind: "wall-face",
    targetPriority: -2,
    snapDistanceInches: WALL_ALIGNMENT_SNAP_DISTANCE_INCHES,
    centerPointInches,
    cornerPointsInches: [frontStartPointInches, frontEndPointInches, backEndPointInches, backStartPointInches],
  });
}

function createCountertopOpeningAlignmentFootprints(args: {
  placedAssemblies: readonly PlacedAssembly[];
  countertopOpenings: readonly CountertopOpening[];
}): readonly ObjectAlignmentFootprint[] {
  return args.countertopOpenings
    .map((opening) => {
      const hostCountertop = args.placedAssemblies.find((assembly) => assembly.id === opening.hostCountertopId);

      return hostCountertop === undefined
        ? null
        : createCountertopOpeningAlignmentFootprint({ opening, hostCountertop });
    })
    .filter(isObjectAlignmentFootprint);
}

function createCountertopOpeningAlignmentFootprint(args: {
  opening: CountertopOpening;
  hostCountertop: PlacedAssembly;
}): ObjectAlignmentFootprint | null {
  const polygonInches = createCountertopOpeningRequestedPolygon(args.opening);

  if (polygonInches.length < 3) {
    return null;
  }

  const topZInches = args.hostCountertop.worldPositionInches.zInches +
    args.hostCountertop.configuration.sizeInches.heightInches / 2;
  const cornerPointsInches = polygonInches.map((localPointInches) => createCountertopWorldPoint({
    hostCountertop: args.hostCountertop,
    localPointInches,
    zInches: topZInches,
  }));
  const centerPointInches = createCountertopWorldPoint({
    hostCountertop: args.hostCountertop,
    localPointInches: args.opening.localCenterInches,
    zInches: topZInches,
  });

  return createObjectAlignmentFootprintFromPlanPoints({
    assemblyId: `countertop-opening-${args.opening.id}`,
    targetKind: "countertop-opening",
    targetPriority: 0,
    snapDistanceInches: OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES,
    centerPointInches,
    cornerPointsInches,
  });
}

function createCountertopWorldPoint(args: {
  hostCountertop: PlacedAssembly;
  localPointInches: Point2DInches;
  zInches: number;
}): Point3DInches {
  const radians = degreesToUserFacingZRadians(args.hostCountertop.rotationDegrees.zDegrees ?? 0);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    xInches:
      args.hostCountertop.worldPositionInches.xInches +
      args.localPointInches.xInches * cos -
      args.localPointInches.yInches * sin,
    yInches:
      args.hostCountertop.worldPositionInches.yInches +
      args.localPointInches.xInches * sin +
      args.localPointInches.yInches * cos,
    zInches: args.zInches,
  };
}


function createWallFaceElevationAlignmentBoxes(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  elevationFrame: AssemblyPlacementElevationFrame;
  movingDepthInches: number;
}): readonly ElevationAlignmentBox[] {
  const frameDirectionInches = normalizePlanVector({
    xInches: args.elevationFrame.faceDirectionInches.xInches,
    yInches: args.elevationFrame.faceDirectionInches.yInches,
  });
  const frameOutwardInches = normalizePlanVector({
    xInches: args.elevationFrame.outwardDirectionInches.xInches,
    yInches: args.elevationFrame.outwardDirectionInches.yInches,
  });

  if (frameDirectionInches === null || frameOutwardInches === null) {
    return [];
  }

  return args.placedWallGraphs.flatMap((wallGraph) => {
    const wallGeometry = buildConnectedWallGeometry(wallGraph);

    return wallGeometry.faces
      .map((face) => createWallFaceElevationAlignmentBox({
        face,
        elevationFrame: args.elevationFrame,
        frameDirectionInches,
        frameOutwardInches,
        movingDepthInches: args.movingDepthInches,
      }))
      .filter(isElevationAlignmentBox);
  });
}

function createWallFaceElevationAlignmentBox(args: {
  face: WallSegmentFace;
  elevationFrame: AssemblyPlacementElevationFrame;
  frameDirectionInches: PlanVector2DInches;
  frameOutwardInches: PlanVector2DInches;
  movingDepthInches: number;
}): ElevationAlignmentBox | null {
  const faceDirectionInches = normalizePlanVector({
    xInches: args.face.endPointInches.xInches - args.face.startPointInches.xInches,
    yInches: args.face.endPointInches.yInches - args.face.startPointInches.yInches,
  });

  if (
    faceDirectionInches === null ||
    !arePlanDirectionsParallel({
      firstDirectionInches: faceDirectionInches,
      secondDirectionInches: args.frameDirectionInches,
      angleToleranceDegrees: OBJECT_ALIGNMENT_PARALLEL_ANGLE_TOLERANCE_DEGREES,
    }) ||
    getPlanDotProduct(args.face.normalInches, args.frameOutwardInches) < 0.99
  ) {
    return null;
  }

  const faceDepthInches = getPlanDotProduct({
    xInches: args.face.startPointInches.xInches - args.elevationFrame.planeOriginInches.xInches,
    yInches: args.face.startPointInches.yInches - args.elevationFrame.planeOriginInches.yInches,
  }, args.frameOutwardInches);

  if (Math.abs(faceDepthInches - args.movingDepthInches) > OBJECT_ELEVATION_ALIGNMENT_DEPTH_TOLERANCE_INCHES) {
    return null;
  }

  const startUInches = getElevationUInches({
    pointInches: args.face.startPointInches,
    elevationFrame: args.elevationFrame,
    faceDirectionInches: args.frameDirectionInches,
  });
  const endUInches = getElevationUInches({
    pointInches: args.face.endPointInches,
    elevationFrame: args.elevationFrame,
    faceDirectionInches: args.frameDirectionInches,
  });
  const leftInches = Math.min(startUInches, endUInches);
  const rightInches = Math.max(startUInches, endUInches);

  return {
    assemblyId: `wall-face-${args.face.id}`,
    leftInches,
    centerInches: (leftInches + rightInches) / 2,
    rightInches,
    bottomInches: 0,
    middleInches: args.face.heightInches / 2,
    topInches: args.face.heightInches,
    depthInches: faceDepthInches,
  };
}

function createWallOpeningElevationAlignmentBoxes(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  elevationFrame: AssemblyPlacementElevationFrame;
}): readonly ElevationAlignmentBox[] {
  const frameDirectionInches = normalizePlanVector({
    xInches: args.elevationFrame.faceDirectionInches.xInches,
    yInches: args.elevationFrame.faceDirectionInches.yInches,
  });
  const frameOutwardInches = normalizePlanVector({
    xInches: args.elevationFrame.outwardDirectionInches.xInches,
    yInches: args.elevationFrame.outwardDirectionInches.yInches,
  });

  if (frameDirectionInches === null || frameOutwardInches === null) {
    return [];
  }

  return args.placedWallGraphs.flatMap((wallGraph) => {
    const wallGeometry = buildConnectedWallGeometry(wallGraph);

    return wallGeometry.faces.flatMap((face) => {
      const faceDirectionInches = normalizePlanVector({
        xInches: face.endPointInches.xInches - face.startPointInches.xInches,
        yInches: face.endPointInches.yInches - face.startPointInches.yInches,
      });

      if (
        faceDirectionInches === null ||
        !arePlanDirectionsParallel({
          firstDirectionInches: faceDirectionInches,
          secondDirectionInches: frameDirectionInches,
          angleToleranceDegrees: OBJECT_ALIGNMENT_PARALLEL_ANGLE_TOLERANCE_DEGREES,
        }) ||
        getPlanDotProduct(face.normalInches, frameOutwardInches) < 0.99
      ) {
        return [];
      }

      const faceDepthInches = getPlanDotProduct({
        xInches: face.startPointInches.xInches - args.elevationFrame.planeOriginInches.xInches,
        yInches: face.startPointInches.yInches - args.elevationFrame.planeOriginInches.yInches,
      }, frameOutwardInches);


      const wallSegment = wallGraph.segments.find((segment) => segment.id === face.wallSegmentId);

      return (wallSegment?.openings ?? [])
        .filter((opening) => opening.faceSide === face.side)
        .map((opening) => createWallOpeningElevationAlignmentBox({
          opening,
          faceStartInches: face.startPointInches,
          faceDirectionInches,
          frameDirectionInches,
          elevationFrame: args.elevationFrame,
          depthInches: faceDepthInches,
        }));
    });
  });
}

function createWallOpeningElevationAlignmentBox(args: {
  opening: WallOpening;
  faceStartInches: Point3DInches;
  faceDirectionInches: PlanVector2DInches;
  frameDirectionInches: PlanVector2DInches;
  elevationFrame: AssemblyPlacementElevationFrame;
  depthInches: number;
}): ElevationAlignmentBox {
  const leftWorldPointInches = {
    xInches: args.faceStartInches.xInches + args.faceDirectionInches.xInches * args.opening.leftInchesAlongFace,
    yInches: args.faceStartInches.yInches + args.faceDirectionInches.yInches * args.opening.leftInchesAlongFace,
    zInches: 0,
  };
  const rightWorldPointInches = {
    xInches:
      args.faceStartInches.xInches +
      args.faceDirectionInches.xInches * (args.opening.leftInchesAlongFace + args.opening.widthInches),
    yInches:
      args.faceStartInches.yInches +
      args.faceDirectionInches.yInches * (args.opening.leftInchesAlongFace + args.opening.widthInches),
    zInches: 0,
  };
  const leftUInches = getElevationUInches({
    pointInches: leftWorldPointInches,
    elevationFrame: args.elevationFrame,
    faceDirectionInches: args.frameDirectionInches,
  });
  const rightUInches = getElevationUInches({
    pointInches: rightWorldPointInches,
    elevationFrame: args.elevationFrame,
    faceDirectionInches: args.frameDirectionInches,
  });
  const leftInches = Math.min(leftUInches, rightUInches);
  const rightInches = Math.max(leftUInches, rightUInches);
  const bottomInches = args.opening.bottomInchesFromFloor;
  const topInches = args.opening.bottomInchesFromFloor + args.opening.heightInches;

  return {
    assemblyId: `wall-opening-${args.opening.id}`,
    leftInches,
    centerInches: (leftInches + rightInches) / 2,
    rightInches,
    bottomInches,
    middleInches: (bottomInches + topInches) / 2,
    topInches,
    depthInches: args.depthInches,
  };
}


function createCountertopOpeningElevationAlignmentBoxes(args: {
  placedAssemblies: readonly PlacedAssembly[];
  countertopOpenings: readonly CountertopOpening[];
  elevationFrame: AssemblyPlacementElevationFrame;
  movingDepthInches: number;
}): readonly ElevationAlignmentBox[] {
  const frameDirectionInches = normalizePlanVector({
    xInches: args.elevationFrame.faceDirectionInches.xInches,
    yInches: args.elevationFrame.faceDirectionInches.yInches,
  });
  const frameOutwardInches = normalizePlanVector({
    xInches: args.elevationFrame.outwardDirectionInches.xInches,
    yInches: args.elevationFrame.outwardDirectionInches.yInches,
  });

  if (frameDirectionInches === null || frameOutwardInches === null) {
    return [];
  }

  return args.countertopOpenings
    .map((opening) => {
      const hostCountertop = args.placedAssemblies.find((assembly) => assembly.id === opening.hostCountertopId);

      return hostCountertop === undefined
        ? null
        : createCountertopOpeningElevationAlignmentBox({
            opening,
            hostCountertop,
            elevationFrame: args.elevationFrame,
            frameDirectionInches,
            frameOutwardInches,
            movingDepthInches: args.movingDepthInches,
          });
    })
    .filter(isElevationAlignmentBox);
}

function createCountertopOpeningElevationAlignmentBox(args: {
  opening: CountertopOpening;
  hostCountertop: PlacedAssembly;
  elevationFrame: AssemblyPlacementElevationFrame;
  frameDirectionInches: PlanVector2DInches;
  frameOutwardInches: PlanVector2DInches;
  movingDepthInches: number;
}): ElevationAlignmentBox | null {
  const polygonInches = createCountertopOpeningRequestedPolygon(args.opening);

  if (polygonInches.length < 3) {
    return null;
  }

  const topZInches = args.hostCountertop.worldPositionInches.zInches +
    args.hostCountertop.configuration.sizeInches.heightInches / 2;
  const worldPointsInches = polygonInches.map((localPointInches) => createCountertopWorldPoint({
    hostCountertop: args.hostCountertop,
    localPointInches,
    zInches: topZInches,
  }));
  const projectedUValuesInches = worldPointsInches.map((pointInches) => getElevationUInches({
    pointInches,
    elevationFrame: args.elevationFrame,
    faceDirectionInches: args.frameDirectionInches,
  }));
  const depthValuesInches = worldPointsInches.map((pointInches) => getPlanDotProduct({
    xInches: pointInches.xInches - args.elevationFrame.planeOriginInches.xInches,
    yInches: pointInches.yInches - args.elevationFrame.planeOriginInches.yInches,
  }, args.frameOutwardInches));
  const depthInches = depthValuesInches.reduce((sumInches, valueInches) => sumInches + valueInches, 0) /
    depthValuesInches.length;

  if (Math.abs(depthInches - args.movingDepthInches) > OBJECT_ELEVATION_ALIGNMENT_DEPTH_TOLERANCE_INCHES) {
    return null;
  }

  const leftInches = Math.min(...projectedUValuesInches);
  const rightInches = Math.max(...projectedUValuesInches);
  const halfTargetThicknessInches = COUNTERTOP_OPENING_ELEVATION_TARGET_THICKNESS_INCHES / 2;

  return {
    assemblyId: `countertop-opening-${args.opening.id}`,
    leftInches,
    centerInches: (leftInches + rightInches) / 2,
    rightInches,
    bottomInches: topZInches - halfTargetThicknessInches,
    middleInches: topZInches,
    topInches: topZInches + halfTargetThicknessInches,
    depthInches,
  };
}

function createWallOpeningPlanAlignmentFootprints(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
}): readonly ObjectAlignmentFootprint[] {
  return args.placedWallGraphs.flatMap((wallGraph) => {
    const wallGeometry = buildConnectedWallGeometry(wallGraph);

    return wallGeometry.faces.flatMap((face) => {
      const faceDirectionInches = normalizePlanVector({
        xInches: face.endPointInches.xInches - face.startPointInches.xInches,
        yInches: face.endPointInches.yInches - face.startPointInches.yInches,
      });
      const faceNormalInches = normalizePlanVector(face.normalInches);

      if (faceDirectionInches === null || faceNormalInches === null) {
        return [];
      }

      const wallSegment = wallGraph.segments.find((segment) => segment.id === face.wallSegmentId);

      return (wallSegment?.openings ?? [])
        .filter((opening) => opening.faceSide === face.side)
        .map((opening) => createWallOpeningPlanAlignmentFootprint({
          opening,
          faceStartInches: face.startPointInches,
          faceDirectionInches,
          faceNormalInches,
        }))
        .filter(isObjectAlignmentFootprint);
    });
  });
}

function isWallSegmentCenterlineRelevantToMovingFootprint(args: {
  centerlineStartInches: Point3DInches;
  centerlineEndInches: Point3DInches;
  centerlineDirectionInches: PlanVector2DInches;
  wallThicknessInches: number;
  movingAlignmentFootprint: ObjectAlignmentFootprint;
}): boolean {
  const centerlineNormalInches = normalizePlanVector(getPlanPerpendicularVector(args.centerlineDirectionInches));

  if (centerlineNormalInches === null) {
    return false;
  }

  const centerlineSpanInches = getProjectedSegmentSpan({
    segment: {
      startPointInches: args.centerlineStartInches,
      endPointInches: args.centerlineEndInches,
    },
    originInches: args.centerlineStartInches,
    directionInches: args.centerlineDirectionInches,
  });

  return args.movingAlignmentFootprint.footprint.edges.some((edge) => {
    const edgeDirectionInches = normalizePlanVector({
      xInches: edge.endPointInches.xInches - edge.startPointInches.xInches,
      yInches: edge.endPointInches.yInches - edge.startPointInches.yInches,
    });

    if (
      edgeDirectionInches === null ||
      !arePlanDirectionsParallel({
        firstDirectionInches: edgeDirectionInches,
        secondDirectionInches: args.centerlineDirectionInches,
        angleToleranceDegrees: OBJECT_ALIGNMENT_PARALLEL_ANGLE_TOLERANCE_DEGREES,
      })
    ) {
      return false;
    }

    const distanceInches = Math.abs(getPlanSignedDistanceToLine({
      pointInches: edge.midpointInches,
      linePointInches: args.centerlineStartInches,
      lineNormalInches: centerlineNormalInches,
    }));

    if (distanceInches > args.wallThicknessInches / 2 + WALL_ALIGNMENT_PLAN_DEPTH_TOLERANCE_INCHES) {
      return false;
    }

    const edgeSpanInches = getProjectedSegmentSpan({
      segment: getPlacementEdgePlanSegment(edge),
      originInches: args.centerlineStartInches,
      directionInches: args.centerlineDirectionInches,
    });

    return getProjectedSegmentOverlap({
      firstSpanInches: centerlineSpanInches,
      secondSpanInches: edgeSpanInches,
      toleranceInches: OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES,
    }) !== null;
  });
}

function isWallFaceRelevantToMovingFootprint(args: {
  face: WallSegmentFace;
  faceDirectionInches: PlanVector2DInches;
  movingAlignmentFootprint: ObjectAlignmentFootprint;
  distanceToleranceInches?: number;
}): boolean {
  const wallSpanInches = getProjectedSegmentSpan({
    segment: {
      startPointInches: args.face.startPointInches,
      endPointInches: args.face.endPointInches,
    },
    originInches: args.face.startPointInches,
    directionInches: args.faceDirectionInches,
  });

  return args.movingAlignmentFootprint.footprint.edges.some((edge) => {
    const edgeDirectionInches = normalizePlanVector({
      xInches: edge.endPointInches.xInches - edge.startPointInches.xInches,
      yInches: edge.endPointInches.yInches - edge.startPointInches.yInches,
    });

    if (
      edgeDirectionInches === null ||
      !arePlanDirectionsParallel({
        firstDirectionInches: edgeDirectionInches,
        secondDirectionInches: args.faceDirectionInches,
        angleToleranceDegrees: OBJECT_ALIGNMENT_PARALLEL_ANGLE_TOLERANCE_DEGREES,
      })
    ) {
      return false;
    }

    const distanceInches = Math.abs(getPlanSignedDistanceToLine({
      pointInches: edge.midpointInches,
      linePointInches: args.face.startPointInches,
      lineNormalInches: args.face.normalInches,
    }));

    if (distanceInches > (args.distanceToleranceInches ?? OBJECT_WALL_OPENING_PLAN_DEPTH_TOLERANCE_INCHES)) {
      return false;
    }

    const edgeSpanInches = getProjectedSegmentSpan({
      segment: getPlacementEdgePlanSegment(edge),
      originInches: args.face.startPointInches,
      directionInches: args.faceDirectionInches,
    });

    return getProjectedSegmentOverlap({
      firstSpanInches: wallSpanInches,
      secondSpanInches: edgeSpanInches,
      toleranceInches: OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES,
    }) !== null;
  });
}

function createWallOpeningPlanAlignmentFootprint(args: {
  opening: WallOpening;
  faceStartInches: Point3DInches;
  faceDirectionInches: PlanVector2DInches;
  faceNormalInches: PlanVector2DInches;
}): ObjectAlignmentFootprint | null {
  const leftPointInches = {
    xInches: args.faceStartInches.xInches + args.faceDirectionInches.xInches * args.opening.leftInchesAlongFace,
    yInches: args.faceStartInches.yInches + args.faceDirectionInches.yInches * args.opening.leftInchesAlongFace,
    zInches: 0,
  };
  const rightPointInches = {
    xInches:
      args.faceStartInches.xInches +
      args.faceDirectionInches.xInches * (args.opening.leftInchesAlongFace + args.opening.widthInches),
    yInches:
      args.faceStartInches.yInches +
      args.faceDirectionInches.yInches * (args.opening.leftInchesAlongFace + args.opening.widthInches),
    zInches: 0,
  };
  const halfThicknessInches = WALL_OPENING_PLAN_TARGET_THICKNESS_INCHES / 2;
  const frontLeftPointInches = offsetPlanPoint({
    pointInches: leftPointInches,
    directionInches: args.faceNormalInches,
    distanceInches: halfThicknessInches,
  });
  const frontRightPointInches = offsetPlanPoint({
    pointInches: rightPointInches,
    directionInches: args.faceNormalInches,
    distanceInches: halfThicknessInches,
  });
  const backRightPointInches = offsetPlanPoint({
    pointInches: rightPointInches,
    directionInches: args.faceNormalInches,
    distanceInches: -halfThicknessInches,
  });
  const backLeftPointInches = offsetPlanPoint({
    pointInches: leftPointInches,
    directionInches: args.faceNormalInches,
    distanceInches: -halfThicknessInches,
  });
  const centerPointInches = {
    xInches: (leftPointInches.xInches + rightPointInches.xInches) / 2,
    yInches: (leftPointInches.yInches + rightPointInches.yInches) / 2,
    zInches: 0,
  };

  return createObjectAlignmentFootprintFromPlanPoints({
    assemblyId: `wall-opening-${args.opening.id}`,
    targetKind: "wall-opening",
    targetPriority: -1,
    snapDistanceInches: OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES,
    centerPointInches,
    cornerPointsInches: [frontLeftPointInches, frontRightPointInches, backRightPointInches, backLeftPointInches],
  });
}

function offsetPlanPoint(args: {
  pointInches: Point3DInches;
  directionInches: PlanVector2DInches;
  distanceInches: number;
}): Point3DInches {
  return {
    ...args.pointInches,
    xInches: args.pointInches.xInches + args.directionInches.xInches * args.distanceInches,
    yInches: args.pointInches.yInches + args.directionInches.yInches * args.distanceInches,
  };
}

function createObjectAlignmentFootprintFromPlanPoints(args: {
  assemblyId: string;
  targetKind: ObjectAlignmentTargetKind;
  targetPriority: number;
  snapDistanceInches: number;
  centerPointInches: Point3DInches;
  cornerPointsInches: readonly Point3DInches[];
}): ObjectAlignmentFootprint | null {
  if (args.cornerPointsInches.length < 3) {
    return null;
  }

  return createObjectAlignmentFootprint({
    assemblyId: args.assemblyId,
    targetKind: args.targetKind,
    targetPriority: args.targetPriority,
    snapDistanceInches: args.snapDistanceInches,
    footprint: {
      centerPointInches: args.centerPointInches,
      cornerPointsInches: args.cornerPointsInches,
      edges: args.cornerPointsInches.map((cornerPointInches, cornerIndex) => {
        const nextCornerPointInches = args.cornerPointsInches[(cornerIndex + 1) % args.cornerPointsInches.length];

        return {
          index: cornerIndex,
          startPointInches: cornerPointInches,
          endPointInches: nextCornerPointInches,
          midpointInches: {
            xInches: (cornerPointInches.xInches + nextCornerPointInches.xInches) / 2,
            yInches: (cornerPointInches.yInches + nextCornerPointInches.yInches) / 2,
            zInches: args.centerPointInches.zInches,
          },
          lengthInches: Math.hypot(
            nextCornerPointInches.xInches - cornerPointInches.xInches,
            nextCornerPointInches.yInches - cornerPointInches.yInches,
          ),
        };
      }),
    },
  });
}

function isObjectAlignmentFootprint(footprint: ObjectAlignmentFootprint | null): footprint is ObjectAlignmentFootprint {
  return footprint !== null;
}

function createObjectAlignmentFootprint(args: {
  assemblyId: string;
  targetKind: ObjectAlignmentTargetKind;
  targetPriority: number;
  snapDistanceInches: number;
  footprint: AssemblyPlacementFootprint;
}): ObjectAlignmentFootprint {
  const edgeLines = args.footprint.edges.map<ObjectAlignmentLine | null>((edge) => {
    const directionInches = normalizePlanVector({
      xInches: edge.endPointInches.xInches - edge.startPointInches.xInches,
      yInches: edge.endPointInches.yInches - edge.startPointInches.yInches,
    });

    if (directionInches === null) {
      return null;
    }

    const normalInches = normalizePlanVector(getPlanPerpendicularVector(directionInches));

    if (normalInches === null) {
      return null;
    }

    return {
      id: `${args.assemblyId}-edge-${edge.index}`,
      lineKind: "edge",
      axisIndex: edge.index % 2,
      pointInches: edge.midpointInches,
      directionInches,
      normalInches,
      segmentInches: {
        startPointInches: edge.startPointInches,
        endPointInches: edge.endPointInches,
      },
    };
  }).filter(isObjectAlignmentLine);
  const centerLines = edgeLines.slice(0, 2).map<ObjectAlignmentLine>((edgeLine, axisIndex) => {
    const halfGuideLengthInches = getFootprintProjectedLength({
      footprint: args.footprint,
      originInches: args.footprint.centerPointInches,
      directionInches: edgeLine.directionInches,
    }) / 2;

    return {
      id: `${args.assemblyId}-center-${axisIndex}`,
      lineKind: "center",
      axisIndex,
      pointInches: args.footprint.centerPointInches,
      directionInches: edgeLine.directionInches,
      normalInches: edgeLine.normalInches,
      segmentInches: {
        startPointInches: getPlanPointAtProjection({
          originInches: args.footprint.centerPointInches,
          directionInches: edgeLine.directionInches,
          projectionInches: -halfGuideLengthInches,
        }),
        endPointInches: getPlanPointAtProjection({
          originInches: args.footprint.centerPointInches,
          directionInches: edgeLine.directionInches,
          projectionInches: halfGuideLengthInches,
        }),
      },
    };
  });

  return {
    assemblyId: args.assemblyId,
    targetKind: args.targetKind,
    targetPriority: args.targetPriority,
    snapDistanceInches: args.snapDistanceInches,
    footprint: args.footprint,
    lines: [...edgeLines, ...centerLines],
  };
}

function getFootprintProjectedLength(args: {
  footprint: AssemblyPlacementFootprint;
  originInches: Point3DInches;
  directionInches: PlanVector2DInches;
}): number {
  const projectionsInches = args.footprint.cornerPointsInches.map((cornerPointInches) => projectPointOntoPlanDirection({
    pointInches: cornerPointInches,
    originInches: args.originInches,
    directionInches: args.directionInches,
  }));

  return Math.max(...projectionsInches) - Math.min(...projectionsInches);
}

function findObjectAlignmentCandidates(args: {
  movingAlignmentFootprint: ObjectAlignmentFootprint;
  targetAlignmentFootprints: readonly ObjectAlignmentFootprint[];
  constraint?: AssemblyObjectAlignmentConstraint;
}): readonly ObjectAlignmentCandidate[] {
  return args.targetAlignmentFootprints.flatMap((targetAlignmentFootprint) => (
    args.movingAlignmentFootprint.lines.flatMap((movingLine) => (
      targetAlignmentFootprint.lines
        .map((targetLine) => createObjectAlignmentCandidate({
          movingLine,
          targetLine,
          targetAlignmentFootprint,
          constraint: args.constraint,
        }))
        .filter(isObjectAlignmentCandidate)
    ))
  )).sort(compareObjectAlignmentCandidates);
}

function createObjectAlignmentCandidate(args: {
  movingLine: ObjectAlignmentLine;
  targetLine: ObjectAlignmentLine;
  targetAlignmentFootprint: ObjectAlignmentFootprint;
  constraint?: AssemblyObjectAlignmentConstraint;
}): ObjectAlignmentCandidate | null {
  if (!arePlanDirectionsParallel({
    firstDirectionInches: args.movingLine.directionInches,
    secondDirectionInches: args.targetLine.directionInches,
    angleToleranceDegrees: OBJECT_ALIGNMENT_PARALLEL_ANGLE_TOLERANCE_DEGREES,
  })) {
    return null;
  }

  const signedDistanceInches = getPlanSignedDistanceToLine({
    pointInches: args.movingLine.pointInches,
    linePointInches: args.targetLine.pointInches,
    lineNormalInches: args.targetLine.normalInches,
  });
  const requestedDeltaInches = {
    xInches: -args.targetLine.normalInches.xInches * signedDistanceInches,
    yInches: -args.targetLine.normalInches.yInches * signedDistanceInches,
  };
  const constrainedDeltaInches = applyAlignmentConstraint({
    deltaInches: requestedDeltaInches,
    constraint: args.constraint,
  });
  const remainingDistanceInches = Math.abs(getPlanSignedDistanceToLine({
    pointInches: translatePlanPoint({
      pointInches: args.movingLine.pointInches,
      deltaInches: constrainedDeltaInches,
    }),
    linePointInches: args.targetLine.pointInches,
    lineNormalInches: args.targetLine.normalInches,
  }));

  if (remainingDistanceInches > OBJECT_ALIGNMENT_REMAINING_DISTANCE_TOLERANCE_INCHES) {
    return null;
  }

  const distanceInches = getPlanVectorLength(constrainedDeltaInches);

  if (distanceInches > args.targetAlignmentFootprint.snapDistanceInches) {
    return null;
  }

  return {
    targetAssemblyId: args.targetAlignmentFootprint.assemblyId,
    movingLine: args.movingLine,
    targetLine: args.targetLine,
    deltaInches: constrainedDeltaInches,
    distanceInches,
    remainingDistanceInches,
    priority: getAlignmentPriority(args.movingLine, args.targetLine),
    targetPriority: args.targetAlignmentFootprint.targetPriority,
  };
}

function applyAlignmentConstraint(args: {
  deltaInches: ObjectAlignmentDeltaInches;
  constraint?: AssemblyObjectAlignmentConstraint;
}): PlanVector2DInches {
  const lockedNormalInches = args.constraint?.lockedNormalInches === undefined
    ? null
    : normalizePlanVector(args.constraint.lockedNormalInches);

  if (lockedNormalInches === null) {
    return args.deltaInches;
  }

  const lockedNormalComponentInches = getPlanDotProduct(args.deltaInches, lockedNormalInches);

  return {
    xInches: args.deltaInches.xInches - lockedNormalInches.xInches * lockedNormalComponentInches,
    yInches: args.deltaInches.yInches - lockedNormalInches.yInches * lockedNormalComponentInches,
  };
}

function getAlignmentPriority(
  movingLine: ObjectAlignmentLine,
  targetLine: ObjectAlignmentLine,
): number {
  if (movingLine.lineKind === "center" && targetLine.lineKind === "center") {
    return 0;
  }

  if (movingLine.lineKind === "edge" && targetLine.lineKind === "edge") {
    return 1;
  }

  return 2;
}

function compareObjectAlignmentCandidates(
  firstCandidate: ObjectAlignmentCandidate,
  secondCandidate: ObjectAlignmentCandidate,
): number {
  if (firstCandidate.targetPriority !== secondCandidate.targetPriority) {
    return firstCandidate.targetPriority - secondCandidate.targetPriority;
  }

  const firstScore = getObjectAlignmentCandidateScore(firstCandidate);
  const secondScore = getObjectAlignmentCandidateScore(secondCandidate);

  if (firstScore !== secondScore) {
    return firstScore - secondScore;
  }

  return firstCandidate.priority - secondCandidate.priority;
}

function getObjectAlignmentCandidateScore(candidate: ObjectAlignmentCandidate): number {
  return candidate.distanceInches + candidate.priority * 0.25;
}

function selectCompatibleAlignmentCandidates(
  candidates: readonly ObjectAlignmentCandidate[],
): readonly ObjectAlignmentCandidate[] {
  const firstCandidate = candidates[0];

  if (firstCandidate === undefined) {
    return [];
  }

  const secondAxisCandidate = candidates.find((candidate) => (
    candidate !== firstCandidate &&
    !arePlanDirectionsParallel({
      firstDirectionInches: firstCandidate.targetLine.normalInches,
      secondDirectionInches: candidate.targetLine.normalInches,
      angleToleranceDegrees: OBJECT_ALIGNMENT_PARALLEL_ANGLE_TOLERANCE_DEGREES,
    }) &&
    getPlanVectorLength(candidate.deltaInches) <= OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES
  ));

  return secondAxisCandidate === undefined
    ? [firstCandidate]
    : [firstCandidate, secondAxisCandidate].slice(0, OBJECT_ALIGNMENT_MAX_GUIDES);
}

function combineAlignmentCandidateDeltas(
  candidates: readonly ObjectAlignmentCandidate[],
): ObjectAlignmentDeltaInches {
  return candidates.reduce<ObjectAlignmentDeltaInches>((combinedDeltaInches, candidate) => ({
    xInches: combinedDeltaInches.xInches + candidate.deltaInches.xInches,
    yInches: combinedDeltaInches.yInches + candidate.deltaInches.yInches,
    zInches: (combinedDeltaInches.zInches ?? 0) + (candidate.deltaInches.zInches ?? 0),
  }), { xInches: 0, yInches: 0, zInches: 0 });
}

function buildAlignmentGuides(args: {
  movingAlignmentFootprint: ObjectAlignmentFootprint;
  targetAlignmentFootprints: readonly ObjectAlignmentFootprint[];
  selectedCandidates: readonly ObjectAlignmentCandidate[];
  finalDeltaInches: ObjectAlignmentDeltaInches;
}): readonly AssemblyObjectAlignmentGuide[] {
  return args.selectedCandidates.map((candidate) => {
    const targetAlignmentFootprint = args.targetAlignmentFootprints.find((targetFootprint) => (
      targetFootprint.assemblyId === candidate.targetAssemblyId
    ));
    const movingFootprint = getTranslatedFootprint({
      footprint: args.movingAlignmentFootprint.footprint,
      deltaInches: args.finalDeltaInches,
    });
    const targetFootprint = targetAlignmentFootprint?.footprint ?? args.movingAlignmentFootprint.footprint;
    const guideSpanInches = getCombinedGuideSpan({
      movingFootprint,
      targetFootprint,
      originInches: candidate.targetLine.pointInches,
      directionInches: candidate.targetLine.directionInches,
    });

    return {
      id: `object-alignment-${candidate.targetAssemblyId}-${candidate.targetLine.id}-${candidate.movingLine.id}`,
      guideKind: candidate.movingLine.lineKind === "center" || candidate.targetLine.lineKind === "center"
        ? "center-line"
        : "edge-line",
      guidePlane: "plan",
      startPointInches: getPlanPointAtProjection({
        originInches: candidate.targetLine.pointInches,
        directionInches: candidate.targetLine.directionInches,
        projectionInches: guideSpanInches.minInches,
      }),
      endPointInches: getPlanPointAtProjection({
        originInches: candidate.targetLine.pointInches,
        directionInches: candidate.targetLine.directionInches,
        projectionInches: guideSpanInches.maxInches,
      }),
    };
  });
}

function getTranslatedFootprint(args: {
  footprint: AssemblyPlacementFootprint;
  deltaInches: ObjectAlignmentDeltaInches;
}): AssemblyPlacementFootprint {
  const cornerPointsInches = args.footprint.cornerPointsInches.map((cornerPointInches) => translatePlanPoint({
    pointInches: cornerPointInches,
    deltaInches: args.deltaInches,
  }));
  const centerPointInches = translatePlanPoint({
    pointInches: args.footprint.centerPointInches,
    deltaInches: args.deltaInches,
  });

  return {
    centerPointInches,
    cornerPointsInches,
    edges: args.footprint.edges.map((edge, edgeIndex) => {
      const startPointInches = cornerPointsInches[edgeIndex];
      const endPointInches = cornerPointsInches[(edgeIndex + 1) % cornerPointsInches.length];

      return {
        ...edge,
        startPointInches,
        endPointInches,
        midpointInches: {
          xInches: (startPointInches.xInches + endPointInches.xInches) / 2,
          yInches: (startPointInches.yInches + endPointInches.yInches) / 2,
          zInches: edge.midpointInches.zInches,
        },
      };
    }),
  };
}

function getCombinedGuideSpan(args: {
  movingFootprint: AssemblyPlacementFootprint;
  targetFootprint: AssemblyPlacementFootprint;
  originInches: Point3DInches;
  directionInches: PlanVector2DInches;
}): Readonly<{ minInches: number; maxInches: number }> {
  const movingSpanInches = getFootprintProjectionSpan({
    footprint: args.movingFootprint,
    originInches: args.originInches,
    directionInches: args.directionInches,
  });
  const targetSpanInches = getFootprintProjectionSpan({
    footprint: args.targetFootprint,
    originInches: args.originInches,
    directionInches: args.directionInches,
  });

  return {
    minInches: Math.min(movingSpanInches.minInches, targetSpanInches.minInches) - OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES,
    maxInches: Math.max(movingSpanInches.maxInches, targetSpanInches.maxInches) + OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES,
  };
}

function getFootprintProjectionSpan(args: {
  footprint: AssemblyPlacementFootprint;
  originInches: Point3DInches;
  directionInches: PlanVector2DInches;
}): Readonly<{ minInches: number; maxInches: number }> {
  return args.footprint.edges.reduce((spanInches, edge) => {
    const edgeSpanInches = getProjectedSegmentSpan({
      segment: {
        startPointInches: edge.startPointInches,
        endPointInches: edge.endPointInches,
      },
      originInches: args.originInches,
      directionInches: args.directionInches,
    });

    return {
      minInches: Math.min(spanInches.minInches, edgeSpanInches.minInches),
      maxInches: Math.max(spanInches.maxInches, edgeSpanInches.maxInches),
    };
  }, {
    minInches: Number.POSITIVE_INFINITY,
    maxInches: Number.NEGATIVE_INFINITY,
  });
}

function createAlignmentSnapTarget(
  selectedCandidates: readonly ObjectAlignmentCandidate[],
): AssemblyPlacementSnapTarget | null {
  const firstCandidate = selectedCandidates[0];

  if (firstCandidate === undefined) {
    return null;
  }

  return {
    kind: "object-alignment",
    alignmentKind: selectedCandidates.length > 1
      ? "corner"
      : firstCandidate.movingLine.lineKind === "center" || firstCandidate.targetLine.lineKind === "center"
        ? "center-line"
        : "edge-line",
    targetAssemblyId: firstCandidate.targetAssemblyId,
    distanceInches: firstCandidate.distanceInches,
  };
}

function isObjectAlignmentLine(line: ObjectAlignmentLine | null): line is ObjectAlignmentLine {
  return line !== null;
}

function isObjectAlignmentCandidate(candidate: ObjectAlignmentCandidate | null): candidate is ObjectAlignmentCandidate {
  return candidate !== null;
}
