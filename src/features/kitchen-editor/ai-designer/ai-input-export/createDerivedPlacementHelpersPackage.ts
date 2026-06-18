import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { DesignScene } from "@/engine/scene/designSceneTypes";
import { createDesignReservationZoneVolumeGeometry } from "@/engine/design-zones/designReservationZoneGeometry";
import type { DesignReservationZone, DesignReservationZonePurpose } from "@/engine/design-zones/designReservationZoneTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import type { WallSegmentFace } from "@/engine/walls/connectedWallGeometryTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { CabinetPlacementRequirement, PlacedWallSegment, WallFaceSide } from "@/engine/walls/placedWallSegmentTypes";

const CORNER_FACE_POINT_TOLERANCE_INCHES = 0.25;
const CORNER_MIN_ANGLE_DEGREES = 75;
const CORNER_MAX_ANGLE_DEGREES = 105;
const CORNER_NORMAL_ALIGNMENT_MIN_DOT = 0.25;

export type AiDerivedPlacementHelpersPackage = Readonly<{
  packageName: "derived-placement-helpers";
  packageIndex: 4;
  description: string;
  wallFacePlacementGuides: readonly AiWallFacePlacementGuide[];
  cabinetCornerPlacementGuides: readonly AiCabinetCornerPlacementGuide[];
  designReservationZoneGuides: readonly AiDesignReservationZoneGuide[];
}>;


export type AiDesignReservationZoneGuide = Readonly<{
  zoneId: string;
  reservedFor: DesignReservationZonePurpose;
  baseCenterPointInches: Point3DInches;
  rotationDegrees: Readonly<{
    zDegrees: number;
  }>;
  sizeInches: Readonly<{
    widthInches: number;
    depthInches: number;
    heightInches: number;
  }>;
  baseCornerPointsInches: readonly Point3DInches[];
  topCornerPointsInches: readonly Point3DInches[];
  localWidthAxis: Point3DInches;
  localDepthAxis: Point3DInches;
  heightRangeInches: Readonly<{
    bottomInches: number;
    topInches: number;
  }>;
}>;

export type AiWallFacePlacementGuide = Readonly<{
  wallGraphId: string;
  wallSegmentId: string;
  faceSide: WallFaceSide;
  placementRequirement: Exclude<CabinetPlacementRequirement, "none">;
  startInches: Point3DInches;
  endInches: Point3DInches;
  lengthInches: number;
  designSideNormal: Point3DInches;
  objectRotationDegrees: Readonly<{
    zDegrees: number;
  }>;
}>;

export type AiCabinetCornerPlacementGuide = Readonly<{
  id: string;
  wallGraphId: string;
  cornerNodeId: string;
  cornerPointInches: Point3DInches;
  cornerFacePointInches: Point3DInches;
  angleDegrees: number;
  cornerRequirement: Exclude<CabinetPlacementRequirement, "none">;
  firstFace: AiCabinetCornerFaceGuide;
  secondFace: AiCabinetCornerFaceGuide;
  defaultCornerStrategy: "blind-cabinet-with-adjacent-perpendicular-cabinet";
  lazySusanStrategyAllowedWhenRequested: boolean;
  blindCabinetPullRule: Readonly<{
    defaultFrontStileWidthInches: 3;
    minimumFrontStileWidthInches: 3;
    maximumFrontStileWidthInches: 6;
    targetPullDistance: "adjacent-perpendicular-cabinet-depth";
    minimumPull: "smallest-distance-that-keeps-blind-cabinet-box-from-crossing-perpendicular-wall-face";
  }>;
}>;

export type AiCabinetCornerFaceGuide = Readonly<{
  wallSegmentId: string;
  faceSide: WallFaceSide;
  placementRequirement: Exclude<CabinetPlacementRequirement, "none">;
  cornerEnd: "start" | "end";
  cornerFacePointInches: Point3DInches;
  awayFromCornerUnit: Point3DInches;
  designSideNormal: Point3DInches;
  objectRotationDegrees: Readonly<{
    zDegrees: number;
  }>;
  runLengthInches: number;
}>;

export function createDerivedPlacementHelpersPackage(
  designScene: DesignScene,
): AiDerivedPlacementHelpersPackage {
  const placedWallGraphs = designScene.placedWallGraphs;
  const wallFacePlacementGuides = placedWallGraphs.flatMap(createWallFacePlacementGuides);

  return {
    packageName: "derived-placement-helpers",
    packageIndex: 4,
    description: "Engine-generated placement geometry derived from the scene. Wall face guides are generated only for wall segment faces whose cabinetPlacementFacePolicies value is optional or required. Cabinet corner guides are generated only when two non-none cabinet placement faces meet as a usable inside L corner. Design reservation zone guides describe user-authored 3D reserved build volumes for islands, peninsulas, and tall pantry areas.",
    wallFacePlacementGuides,
    cabinetCornerPlacementGuides: placedWallGraphs.flatMap((wallGraph) => createCabinetCornerPlacementGuides(
      wallGraph,
      wallFacePlacementGuides.filter((guide) => guide.wallGraphId === wallGraph.id),
    )),
    designReservationZoneGuides: designScene.designReservationZones.map(createDesignReservationZoneGuide),
  };
}


function createDesignReservationZoneGuide(zone: DesignReservationZone): AiDesignReservationZoneGuide {
  const volumeGeometry = createDesignReservationZoneVolumeGeometry(zone);
  const angleRadians = (-zone.rotationDegrees.zDegrees * Math.PI) / 180;

  return {
    zoneId: zone.id,
    reservedFor: zone.reservedFor,
    baseCenterPointInches: {
      xInches: zone.baseCenterPointInches.xInches,
      yInches: zone.baseCenterPointInches.yInches,
      zInches: zone.baseCenterPointInches.zInches,
    },
    rotationDegrees: {
      zDegrees: zone.rotationDegrees.zDegrees,
    },
    sizeInches: {
      widthInches: zone.sizeInches.widthInches,
      depthInches: zone.sizeInches.depthInches,
      heightInches: zone.sizeInches.heightInches,
    },
    baseCornerPointsInches: volumeGeometry.baseCornerPointsInches,
    topCornerPointsInches: volumeGeometry.topCornerPointsInches,
    localWidthAxis: {
      xInches: Math.cos(angleRadians),
      yInches: Math.sin(angleRadians),
      zInches: 0,
    },
    localDepthAxis: {
      xInches: -Math.sin(angleRadians),
      yInches: Math.cos(angleRadians),
      zInches: 0,
    },
    heightRangeInches: {
      bottomInches: zone.baseCenterPointInches.zInches,
      topInches: zone.baseCenterPointInches.zInches + zone.sizeInches.heightInches,
    },
  };
}

function createWallFacePlacementGuides(wallGraph: PlacedWallGraph): readonly AiWallFacePlacementGuide[] {
  const wallSegmentsById = new Map(wallGraph.segments.map((wallSegment) => [wallSegment.id, wallSegment]));

  return buildConnectedWallGeometry(wallGraph).faces.flatMap((face) => {
    const wallSegment = wallSegmentsById.get(face.wallSegmentId);

    const placementRequirement = wallSegment?.cabinetPlacementFacePolicies[face.side] ?? "none";

    if (placementRequirement === "none") {
      return [];
    }

    return [createWallFacePlacementGuide(face, placementRequirement)];
  });
}

function createWallFacePlacementGuide(
  face: WallSegmentFace,
  placementRequirement: Exclude<CabinetPlacementRequirement, "none">,
): AiWallFacePlacementGuide {
  return {
    wallGraphId: face.wallGraphId,
    wallSegmentId: face.wallSegmentId,
    faceSide: face.side,
    placementRequirement,
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

function createCabinetCornerPlacementGuides(
  wallGraph: PlacedWallGraph,
  wallFacePlacementGuides: readonly AiWallFacePlacementGuide[],
): readonly AiCabinetCornerPlacementGuide[] {
  const wallSegmentsById = new Map(wallGraph.segments.map((wallSegment) => [wallSegment.id, wallSegment]));
  const wallNodesById = new Map(wallGraph.nodes.map((wallNode) => [wallNode.id, wallNode]));
  const cornerGuides: AiCabinetCornerPlacementGuide[] = [];

  wallFacePlacementGuides.forEach((firstGuide, firstIndex) => {
    const firstWallSegment = wallSegmentsById.get(firstGuide.wallSegmentId);

    if (firstWallSegment === undefined) {
      return;
    }

    wallFacePlacementGuides.slice(firstIndex + 1).forEach((secondGuide) => {
      const secondWallSegment = wallSegmentsById.get(secondGuide.wallSegmentId);

      if (secondWallSegment === undefined) {
        return;
      }

      const cornerGuide = createCabinetCornerPlacementGuide({
        wallGraph,
        wallNodesById,
        firstWallSegment,
        firstGuide,
        secondWallSegment,
        secondGuide,
      });

      if (cornerGuide !== null) {
        cornerGuides.push(cornerGuide);
      }
    });
  });

  return cornerGuides;
}

function createCabinetCornerPlacementGuide(args: {
  wallGraph: PlacedWallGraph;
  wallNodesById: ReadonlyMap<string, PlacedWallGraph["nodes"][number]>;
  firstWallSegment: PlacedWallSegment;
  firstGuide: AiWallFacePlacementGuide;
  secondWallSegment: PlacedWallSegment;
  secondGuide: AiWallFacePlacementGuide;
}): AiCabinetCornerPlacementGuide | null {
  if (args.firstWallSegment.id === args.secondWallSegment.id) {
    return null;
  }

  const cornerNodeId = getSharedWallNodeId(args.firstWallSegment, args.secondWallSegment);

  if (cornerNodeId === null) {
    return null;
  }

  const cornerPointInches = args.wallNodesById.get(cornerNodeId)?.positionInches;

  if (cornerPointInches === undefined) {
    return null;
  }

  const firstCornerEnd = getWallSegmentEndAtNode(args.firstWallSegment, cornerNodeId);
  const secondCornerEnd = getWallSegmentEndAtNode(args.secondWallSegment, cornerNodeId);

  if (firstCornerEnd === null || secondCornerEnd === null) {
    return null;
  }

  const firstCornerFacePointInches = getGuideEndpointPoint(args.firstGuide, firstCornerEnd);
  const secondCornerFacePointInches = getGuideEndpointPoint(args.secondGuide, secondCornerEnd);

  if (getPlanDistanceInches(firstCornerFacePointInches, secondCornerFacePointInches) > CORNER_FACE_POINT_TOLERANCE_INCHES) {
    return null;
  }

  const firstAwayFromCornerUnit = getGuideAwayFromCornerUnit(args.firstGuide, firstCornerEnd);
  const secondAwayFromCornerUnit = getGuideAwayFromCornerUnit(args.secondGuide, secondCornerEnd);
  const angleDegrees = getPlanAngleDegrees(firstAwayFromCornerUnit, secondAwayFromCornerUnit);

  if (angleDegrees < CORNER_MIN_ANGLE_DEGREES || angleDegrees > CORNER_MAX_ANGLE_DEGREES) {
    return null;
  }

  const firstNormal = normalizePlanVector(args.firstGuide.designSideNormal);
  const secondNormal = normalizePlanVector(args.secondGuide.designSideNormal);

  if (
    dotPlanVectors(firstNormal, secondAwayFromCornerUnit) <= CORNER_NORMAL_ALIGNMENT_MIN_DOT ||
    dotPlanVectors(secondNormal, firstAwayFromCornerUnit) <= CORNER_NORMAL_ALIGNMENT_MIN_DOT
  ) {
    return null;
  }

  return {
    id: `${args.wallGraph.id}-${cornerNodeId}-${args.firstGuide.wallSegmentId}-${args.firstGuide.faceSide}-${args.secondGuide.wallSegmentId}-${args.secondGuide.faceSide}-cabinet-corner`,
    wallGraphId: args.wallGraph.id,
    cornerNodeId,
    cornerPointInches: toFloorPoint(cornerPointInches),
    cornerFacePointInches: averagePlanPoints(firstCornerFacePointInches, secondCornerFacePointInches),
    angleDegrees,
    cornerRequirement: getCabinetCornerRequirement(args.firstGuide, args.secondGuide),
    firstFace: createCabinetCornerFaceGuide({
      guide: args.firstGuide,
      cornerEnd: firstCornerEnd,
      cornerFacePointInches: firstCornerFacePointInches,
      awayFromCornerUnit: firstAwayFromCornerUnit,
    }),
    secondFace: createCabinetCornerFaceGuide({
      guide: args.secondGuide,
      cornerEnd: secondCornerEnd,
      cornerFacePointInches: secondCornerFacePointInches,
      awayFromCornerUnit: secondAwayFromCornerUnit,
    }),
    defaultCornerStrategy: "blind-cabinet-with-adjacent-perpendicular-cabinet",
    lazySusanStrategyAllowedWhenRequested: true,
    blindCabinetPullRule: {
      defaultFrontStileWidthInches: 3,
      minimumFrontStileWidthInches: 3,
      maximumFrontStileWidthInches: 6,
      targetPullDistance: "adjacent-perpendicular-cabinet-depth",
      minimumPull: "smallest-distance-that-keeps-blind-cabinet-box-from-crossing-perpendicular-wall-face",
    },
  };
}

function getCabinetCornerRequirement(
  firstGuide: AiWallFacePlacementGuide,
  secondGuide: AiWallFacePlacementGuide,
): Exclude<CabinetPlacementRequirement, "none"> {
  return firstGuide.placementRequirement === "required" && secondGuide.placementRequirement === "required"
    ? "required"
    : "optional";
}

function createCabinetCornerFaceGuide(args: {
  guide: AiWallFacePlacementGuide;
  cornerEnd: "start" | "end";
  cornerFacePointInches: Point3DInches;
  awayFromCornerUnit: Point3DInches;
}): AiCabinetCornerFaceGuide {
  return {
    wallSegmentId: args.guide.wallSegmentId,
    faceSide: args.guide.faceSide,
    placementRequirement: args.guide.placementRequirement,
    cornerEnd: args.cornerEnd,
    cornerFacePointInches: toFloorPoint(args.cornerFacePointInches),
    awayFromCornerUnit: toFloorPoint(args.awayFromCornerUnit),
    designSideNormal: args.guide.designSideNormal,
    objectRotationDegrees: args.guide.objectRotationDegrees,
    runLengthInches: args.guide.lengthInches,
  };
}

function getSharedWallNodeId(
  firstWallSegment: PlacedWallSegment,
  secondWallSegment: PlacedWallSegment,
): string | null {
  const firstNodeIds = [firstWallSegment.startNodeId, firstWallSegment.endNodeId];
  const secondNodeIds = [secondWallSegment.startNodeId, secondWallSegment.endNodeId];

  return firstNodeIds.find((nodeId) => secondNodeIds.includes(nodeId)) ?? null;
}

function getWallSegmentEndAtNode(
  wallSegment: PlacedWallSegment,
  wallNodeId: string,
): "start" | "end" | null {
  if (wallSegment.startNodeId === wallNodeId) {
    return "start";
  }

  if (wallSegment.endNodeId === wallNodeId) {
    return "end";
  }

  return null;
}

function getGuideEndpointPoint(
  guide: AiWallFacePlacementGuide,
  cornerEnd: "start" | "end",
): Point3DInches {
  return cornerEnd === "start" ? guide.startInches : guide.endInches;
}

function getGuideAwayFromCornerUnit(
  guide: AiWallFacePlacementGuide,
  cornerEnd: "start" | "end",
): Point3DInches {
  const startPointInches = cornerEnd === "start" ? guide.startInches : guide.endInches;
  const endPointInches = cornerEnd === "start" ? guide.endInches : guide.startInches;

  return normalizePlanVector({
    xInches: endPointInches.xInches - startPointInches.xInches,
    yInches: endPointInches.yInches - startPointInches.yInches,
  });
}

function getPlanAngleDegrees(
  firstVector: Point3DInches,
  secondVector: Point3DInches,
): number {
  const dot = Math.max(-1, Math.min(1, dotPlanVectors(firstVector, secondVector)));

  return Math.acos(dot) * 180 / Math.PI;
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

function normalizePlanVector(vector: Readonly<{
  xInches: number;
  yInches: number;
}>): Point3DInches {
  const lengthInches = Math.hypot(vector.xInches, vector.yInches);

  if (lengthInches <= 0.000001) {
    return { xInches: 1, yInches: 0, zInches: 0 };
  }

  return {
    xInches: vector.xInches / lengthInches,
    yInches: vector.yInches / lengthInches,
    zInches: 0,
  };
}

function dotPlanVectors(
  firstVector: Readonly<{ xInches: number; yInches: number }>,
  secondVector: Readonly<{ xInches: number; yInches: number }>,
): number {
  return firstVector.xInches * secondVector.xInches + firstVector.yInches * secondVector.yInches;
}

function getPlanDistanceInches(firstPointInches: Point3DInches, secondPointInches: Point3DInches): number {
  return Math.hypot(
    secondPointInches.xInches - firstPointInches.xInches,
    secondPointInches.yInches - firstPointInches.yInches,
  );
}

function averagePlanPoints(firstPointInches: Point3DInches, secondPointInches: Point3DInches): Point3DInches {
  return {
    xInches: (firstPointInches.xInches + secondPointInches.xInches) / 2,
    yInches: (firstPointInches.yInches + secondPointInches.yInches) / 2,
    zInches: 0,
  };
}

function toFloorPoint(pointInches: Readonly<{
  xInches: number;
  yInches: number;
}>): Point3DInches {
  return {
    xInches: pointInches.xInches,
    yInches: pointInches.yInches,
    zInches: 0,
  };
}
