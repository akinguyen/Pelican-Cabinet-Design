import { getAssemblyDefinition, type AssemblyDefinitionRegistry } from "@/engine/assemblies/assemblyRegistry";
import { createAssemblyPlacementFootprint } from "@/engine/assemblies/placement/assemblyPlacementGeometry";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { PlacedWallGraph } from "../placedWallGraphTypes";
import type { WallFaceSide, WallOpening } from "../placedWallSegmentTypes";
import { buildConnectedWallGeometry } from "../buildConnectedWallGeometry";
import type { BuiltWallSegmentBody } from "../wallSegmentTopologyTypes";
import { createWallOpeningFaceAxes, type WallOpeningFaceAxesInches } from "./wallOpeningFaceAxes";

const WALL_CUTOUT_DEPTH_TOLERANCE_INCHES = 2;
const MIN_DERIVED_WALL_OPENING_SIZE_INCHES = 0.5;

type CandidateWallOpening = Readonly<{
  opening: WallOpening;
  faceDistanceInches: number;
}>;

type WallCutoutSource = Readonly<{
  sourceAssembly: PlacedAssembly;
  insetInches: number;
}>;

export function deriveWallOpeningsFromAssemblies(args: {
  placedAssemblies: readonly PlacedAssembly[];
  placedWallGraphs: readonly PlacedWallGraph[];
  registry: AssemblyDefinitionRegistry;
  segmentBodies?: readonly BuiltWallSegmentBody[];
}): readonly WallOpening[] {
  const wallCutters = getWallCutoutSources(args.placedAssemblies, args.registry);

  if (wallCutters.length === 0) {
    return [];
  }

  const segmentBodies = args.segmentBodies ?? args.placedWallGraphs.flatMap((wallGraph) => (
    buildConnectedWallGeometry(wallGraph).segmentBodies
  ));

  if (segmentBodies.length === 0) {
    return [];
  }

  return wallCutters.flatMap(({ sourceAssembly, insetInches }) => (
    segmentBodies.flatMap((segmentBody) => {
      const candidate = findBestDerivedWallOpeningForSegment({
        sourceAssembly,
        segmentBody,
        insetInches,
      });

      return candidate === null ? [] : [candidate.opening];
    })
  ));
}

function getWallCutoutSources(
  placedAssemblies: readonly PlacedAssembly[],
  registry: AssemblyDefinitionRegistry,
): readonly WallCutoutSource[] {
  const wallCutoutSources: WallCutoutSource[] = [];

  for (const placedAssembly of placedAssemblies) {
    const cutoutBehavior = getAssemblyDefinition(
      registry,
      placedAssembly.definitionId,
    ).cutoutBehavior?.wall;

    if (cutoutBehavior?.source === "elevation-projection") {
      wallCutoutSources.push({
        sourceAssembly: placedAssembly,
        insetInches: cutoutBehavior.insetInches ?? 0,
      });
    }
  }

  return wallCutoutSources;
}

function findBestDerivedWallOpeningForSegment(args: {
  sourceAssembly: PlacedAssembly;
  segmentBody: BuiltWallSegmentBody;
  insetInches: number;
}): CandidateWallOpening | null {
  const candidates = (["side-a", "side-b"] as const)
    .map((faceSide) => createDerivedWallOpeningForFace({ ...args, faceSide }))
    .filter(isCandidateWallOpening)
    .sort((firstCandidate, secondCandidate) => (
      firstCandidate.faceDistanceInches - secondCandidate.faceDistanceInches
    ));

  return candidates[0] ?? null;
}

function createDerivedWallOpeningForFace(args: {
  sourceAssembly: PlacedAssembly;
  segmentBody: BuiltWallSegmentBody;
  faceSide: WallFaceSide;
  insetInches: number;
}): CandidateWallOpening | null {
  const faceAxes = createWallOpeningFaceAxes({
    segmentBody: args.segmentBody,
    faceSide: args.faceSide,
  });

  if (faceAxes === null) {
    return null;
  }

  const footprint = createAssemblyPlacementFootprint(args.sourceAssembly);
  const footprintUCoordinatesInches = footprint.cornerPointsInches.map((pointInches) => (
    projectPointOntoFaceDirection(pointInches, faceAxes)
  ));
  const footprintOutwardCoordinatesInches = footprint.cornerPointsInches.map((pointInches) => (
    projectPointOntoOutwardDirection(pointInches, faceAxes)
  ));
  const minUInches = Math.min(...footprintUCoordinatesInches) + args.insetInches;
  const maxUInches = Math.max(...footprintUCoordinatesInches) - args.insetInches;
  const minOutwardInches = Math.min(...footprintOutwardCoordinatesInches);
  const maxOutwardInches = Math.max(...footprintOutwardCoordinatesInches);

  if (
    maxOutwardInches < -args.segmentBody.thicknessInches - WALL_CUTOUT_DEPTH_TOLERANCE_INCHES ||
    minOutwardInches > WALL_CUTOUT_DEPTH_TOLERANCE_INCHES
  ) {
    return null;
  }

  const clippedLeftInchesAlongFace = clamp(minUInches, 0, faceAxes.faceLengthInches);
  const clippedRightInchesAlongFace = clamp(maxUInches, 0, faceAxes.faceLengthInches);
  const sourceBottomInches = args.sourceAssembly.worldPositionInches.zInches -
    args.sourceAssembly.configuration.sizeInches.heightInches / 2 + args.insetInches;
  const sourceTopInches = args.sourceAssembly.worldPositionInches.zInches +
    args.sourceAssembly.configuration.sizeInches.heightInches / 2 - args.insetInches;
  const clippedBottomInches = clamp(sourceBottomInches, 0, args.segmentBody.heightInches);
  const clippedTopInches = clamp(sourceTopInches, 0, args.segmentBody.heightInches);
  const widthInches = clippedRightInchesAlongFace - clippedLeftInchesAlongFace;
  const heightInches = clippedTopInches - clippedBottomInches;

  if (
    widthInches < MIN_DERIVED_WALL_OPENING_SIZE_INCHES ||
    heightInches < MIN_DERIVED_WALL_OPENING_SIZE_INCHES
  ) {
    return null;
  }

  return {
    opening: {
      id: `derived-wall-opening:${args.segmentBody.wallGraphId}:${args.segmentBody.wallSegmentId}:${args.sourceAssembly.id}`,
      wallSegmentId: args.segmentBody.wallSegmentId,
      faceSide: args.faceSide,
      leftInchesAlongFace: clippedLeftInchesAlongFace,
      bottomInchesFromFloor: clippedBottomInches,
      widthInches,
      heightInches,
    },
    faceDistanceInches: Math.min(Math.abs(minOutwardInches), Math.abs(maxOutwardInches)),
  };
}

function isCandidateWallOpening(
  candidate: CandidateWallOpening | null,
): candidate is CandidateWallOpening {
  return candidate !== null;
}

function projectPointOntoFaceDirection(
  pointInches: Readonly<{ xInches: number; yInches: number }>,
  faceAxes: WallOpeningFaceAxesInches,
): number {
  return (
    (pointInches.xInches - faceAxes.sideStartPointInches.xInches) *
      faceAxes.faceDirectionInches.xInches +
    (pointInches.yInches - faceAxes.sideStartPointInches.yInches) *
      faceAxes.faceDirectionInches.yInches
  );
}

function projectPointOntoOutwardDirection(
  pointInches: Readonly<{ xInches: number; yInches: number }>,
  faceAxes: WallOpeningFaceAxesInches,
): number {
  return (
    (pointInches.xInches - faceAxes.sideStartPointInches.xInches) *
      faceAxes.outwardDirectionInches.xInches +
    (pointInches.yInches - faceAxes.sideStartPointInches.yInches) *
      faceAxes.outwardDirectionInches.yInches
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
