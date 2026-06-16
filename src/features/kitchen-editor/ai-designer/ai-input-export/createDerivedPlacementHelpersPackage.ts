import type { Point3DInches } from "@/core/geometry/pointTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import type { WallSegmentFace } from "@/engine/walls/connectedWallGeometryTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { WallFaceSide } from "@/engine/walls/placedWallSegmentTypes";

export type AiDerivedPlacementHelpersPackage = Readonly<{
  packageName: "derived-placement-helpers";
  packageIndex: 4;
  description: string;
  wallFacePlacementGuides: readonly AiWallFacePlacementGuide[];
}>;

export type AiWallFacePlacementGuide = Readonly<{
  wallGraphId: string;
  wallSegmentId: string;
  faceSide: WallFaceSide;
  startInches: Point3DInches;
  endInches: Point3DInches;
  lengthInches: number;
  designSideNormal: Point3DInches;
  objectRotationDegrees: Readonly<{
    zDegrees: number;
  }>;
}>;

export function createDerivedPlacementHelpersPackage(
  placedWallGraphs: readonly PlacedWallGraph[],
): AiDerivedPlacementHelpersPackage {
  return {
    packageName: "derived-placement-helpers",
    packageIndex: 4,
    description: "Placement math derived from the scene. Guides are generated only for wall segment faces listed in cabinetPlacementFaceSides.",
    wallFacePlacementGuides: placedWallGraphs.flatMap(createWallFacePlacementGuides),
  };
}

function createWallFacePlacementGuides(wallGraph: PlacedWallGraph): readonly AiWallFacePlacementGuide[] {
  const wallSegmentsById = new Map(wallGraph.segments.map((wallSegment) => [wallSegment.id, wallSegment]));

  return buildConnectedWallGeometry(wallGraph).faces.flatMap((face) => {
    const wallSegment = wallSegmentsById.get(face.wallSegmentId);

    if (wallSegment === undefined || !wallSegment.cabinetPlacementFaceSides.includes(face.side)) {
      return [];
    }

    return [createWallFacePlacementGuide(face)];
  });
}

function createWallFacePlacementGuide(face: WallSegmentFace): AiWallFacePlacementGuide {
  return {
    wallGraphId: face.wallGraphId,
    wallSegmentId: face.wallSegmentId,
    faceSide: face.side,
    startInches: {
      xInches: face.startPointInches.xInches,
      yInches: face.startPointInches.yInches,
      zInches: 0,
    },
    endInches: {
      xInches: face.endPointInches.xInches,
      yInches: face.endPointInches.yInches,
      zInches: 0,
    },
    lengthInches: face.lengthInches,
    designSideNormal: {
      xInches: face.normalInches.xInches,
      yInches: face.normalInches.yInches,
      zInches: 0,
    },
    objectRotationDegrees: {
      zDegrees: getObjectRotationDegreesForFaceNormal(face.normalInches),
    },
  };
}

function getObjectRotationDegreesForFaceNormal(normalInches: Readonly<{
  xInches: number;
  yInches: number;
}>): number {
  const degrees = Math.atan2(normalInches.xInches, normalInches.yInches) * 180 / Math.PI;

  return normalizeDegrees(degrees);
}

function normalizeDegrees(degrees: number): number {
  const normalizedDegrees = ((degrees % 360) + 360) % 360;

  return normalizedDegrees > 180 ? normalizedDegrees - 360 : normalizedDegrees;
}
