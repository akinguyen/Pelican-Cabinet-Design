import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { PlacedWall } from "@/engine/walls/wallTypes";
import { getClosedPolygonEdges, projectPointToSegment } from "@/engine/walls/footprint/wallFootprintGeometry";
import {
  createAssemblyPlacementFootprint,
  getPlanDistanceInches,
  translateAssemblyPlacement,
  updateAssemblyPlacementWorldPosition,
} from "./assemblyPlacementGeometry";
import { isAssemblyPlacementValid } from "./assemblyWallCollision";
import { createAssemblyWallMeasurementGuides } from "./assemblyWallMeasurementGuides";
import type {
  AssemblyPlacementFeedback,
  AssemblyPlacementResult,
  AssemblyWallSnapTarget,
} from "./assemblyPlacementTypes";

const ASSEMBLY_WALL_SNAP_THRESHOLD_INCHES = 8;
const ASSEMBLY_WALL_CORNER_SNAP_THRESHOLD_INCHES = 8;
const GEOMETRY_EPSILON_INCHES = 0.001;

export function applyAssemblyWallPlacementRules(args: {
  placedAssembly: PlacedAssembly;
  placedWalls: readonly PlacedWall[];
}): AssemblyPlacementResult {
  const snapCandidates = createAssemblyWallSnapCandidates(args);
  const bestSnapCandidate = snapCandidates
    .filter((candidate) => isAssemblyPlacementValid({ placedAssembly: candidate.placedAssembly, placedWalls: args.placedWalls }))
    .sort((firstCandidate, secondCandidate) => firstCandidate.snapTarget.distanceInches - secondCandidate.snapTarget.distanceInches)[0];
  const placedAssembly = bestSnapCandidate?.placedAssembly ?? args.placedAssembly;
  const snapTarget = bestSnapCandidate?.snapTarget ?? null;

  return {
    placedAssembly,
    feedback: createAssemblyPlacementFeedback({
      placedAssembly,
      placedWalls: args.placedWalls,
      snapTarget,
    }),
  };
}

export function createAssemblyPlacementFeedback(args: {
  placedAssembly: PlacedAssembly;
  placedWalls: readonly PlacedWall[];
  snapTarget?: AssemblyWallSnapTarget | null;
}): AssemblyPlacementFeedback {
  const isValid = isAssemblyPlacementValid({
    placedAssembly: args.placedAssembly,
    placedWalls: args.placedWalls,
  });

  return {
    placedAssembly: args.placedAssembly,
    footprint: createAssemblyPlacementFootprint(args.placedAssembly),
    isValid,
    invalidReason: isValid ? null : "overlaps-wall",
    snapTarget: args.snapTarget ?? null,
    wallMeasurementGuides: createAssemblyWallMeasurementGuides({
      placedAssembly: args.placedAssembly,
      placedWalls: args.placedWalls,
    }),
  };
}

type AssemblyWallSnapCandidate = Readonly<{
  placedAssembly: PlacedAssembly;
  snapTarget: AssemblyWallSnapTarget;
}>;

function createAssemblyWallSnapCandidates(args: {
  placedAssembly: PlacedAssembly;
  placedWalls: readonly PlacedWall[];
}): readonly AssemblyWallSnapCandidate[] {
  return [
    ...createAssemblyWallCornerSnapCandidates(args),
    ...createAssemblyWallEdgeSnapCandidates(args),
  ];
}

function createAssemblyWallCornerSnapCandidates(args: {
  placedAssembly: PlacedAssembly;
  placedWalls: readonly PlacedWall[];
}): readonly AssemblyWallSnapCandidate[] {
  const footprint = createAssemblyPlacementFootprint(args.placedAssembly);
  const snapCandidates: AssemblyWallSnapCandidate[] = [];

  args.placedWalls.forEach((placedWall) => {
    placedWall.footprint.boundaryPointsInches.forEach((wallPointInches, cornerIndex) => {
      footprint.cornerPointsInches.forEach((assemblyCornerPointInches) => {
        const distanceInches = getPlanDistanceInches(wallPointInches, assemblyCornerPointInches);

        if (distanceInches > ASSEMBLY_WALL_CORNER_SNAP_THRESHOLD_INCHES) {
          return;
        }

        const placedAssembly = translateAssemblyPlacement(args.placedAssembly, {
          xInches: wallPointInches.xInches - assemblyCornerPointInches.xInches,
          yInches: wallPointInches.yInches - assemblyCornerPointInches.yInches,
        });

        snapCandidates.push({
          placedAssembly,
          snapTarget: {
            kind: "wall-corner",
            placedWallId: placedWall.id,
            cornerIndex,
            snappedPointInches: wallPointInches,
            distanceInches,
          },
        });
      });
    });
  });

  return snapCandidates;
}

function createAssemblyWallEdgeSnapCandidates(args: {
  placedAssembly: PlacedAssembly;
  placedWalls: readonly PlacedWall[];
}): readonly AssemblyWallSnapCandidate[] {
  const snapCandidates: AssemblyWallSnapCandidate[] = [];
  const footprint = createAssemblyPlacementFootprint(args.placedAssembly);

  args.placedWalls.forEach((placedWall) => {
    getClosedPolygonEdges(placedWall.footprint.boundaryPointsInches).forEach((edge, edgeIndex) => {
      const edgeVector = {
        xInches: edge.endPointInches.xInches - edge.startPointInches.xInches,
        yInches: edge.endPointInches.yInches - edge.startPointInches.yInches,
      };
      const edgeLengthInches = Math.hypot(edgeVector.xInches, edgeVector.yInches);

      if (edgeLengthInches <= GEOMETRY_EPSILON_INCHES) {
        return;
      }

      const edgeNormal = {
        xInches: -edgeVector.yInches / edgeLengthInches,
        yInches: edgeVector.xInches / edgeLengthInches,
      };
      const projectedCenterPoint = projectPointToSegment({
        pointInches: args.placedAssembly.worldPositionInches,
        segmentStartInches: edge.startPointInches,
        segmentEndInches: edge.endPointInches,
      }).pointInches;
      const assemblySupportInches = measureAssemblySupportInDirection(footprint.cornerPointsInches, {
        centerPointInches: args.placedAssembly.worldPositionInches,
        directionInches: edgeNormal,
      });

      [-1, 1].forEach((sideSign) => {
        const nextCenterPointInches: Point3DInches = {
          xInches: projectedCenterPoint.xInches + edgeNormal.xInches * assemblySupportInches * sideSign,
          yInches: projectedCenterPoint.yInches + edgeNormal.yInches * assemblySupportInches * sideSign,
          zInches: args.placedAssembly.worldPositionInches.zInches,
        };
        const translationDistanceInches = getPlanDistanceInches(
          args.placedAssembly.worldPositionInches,
          nextCenterPointInches,
        );

        if (translationDistanceInches > ASSEMBLY_WALL_SNAP_THRESHOLD_INCHES) {
          return;
        }

        snapCandidates.push({
          placedAssembly: updateAssemblyPlacementWorldPosition(args.placedAssembly, nextCenterPointInches),
          snapTarget: {
            kind: "wall-edge",
            placedWallId: placedWall.id,
            edgeIndex,
            snappedPointInches: projectedCenterPoint,
            distanceInches: translationDistanceInches,
          },
        });
      });
    });
  });

  return snapCandidates;
}

function measureAssemblySupportInDirection(
  cornerPointsInches: readonly Point3DInches[],
  args: Readonly<{
    centerPointInches: Point3DInches;
    directionInches: Readonly<{ xInches: number; yInches: number }>;
  }>,
): number {
  return Math.max(
    ...cornerPointsInches.map((cornerPointInches) =>
      Math.abs(
        (cornerPointInches.xInches - args.centerPointInches.xInches) * args.directionInches.xInches +
          (cornerPointInches.yInches - args.centerPointInches.yInches) * args.directionInches.yInches,
      ),
    ),
  );
}
