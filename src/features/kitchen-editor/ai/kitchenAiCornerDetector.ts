import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getZRotationDegreesForFaceDirection } from "@/engine/design-zones/designReservationZoneGeometry";
import type { KitchenAiRules } from "./kitchenAiTypes";
import type {
  KitchenAiCornerFaceRef,
  KitchenAiCornerResolutionTargets,
  KitchenAiWallCorner,
  KitchenAiWallFace,
} from "./kitchenAiTypes";

const POINT_EPSILON_INCHES = 0.5;
const MIN_CORNER_ANGLE_DEGREES = 75;
const MAX_CORNER_ANGLE_DEGREES = 105;

export function detectKitchenAiWallCorners(args: {
  wallFaces: readonly KitchenAiWallFace[];
  rules: KitchenAiRules;
}): readonly KitchenAiWallCorner[] {
  const cabinetWallFaces = args.wallFaces.filter(
    (wallFace) => wallFace.cabinetPlacementRequirement !== "none",
  );
  const corners: KitchenAiWallCorner[] = [];
  const seenCornerKeys = new Set<string>();

  for (let firstIndex = 0; firstIndex < cabinetWallFaces.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < cabinetWallFaces.length; secondIndex += 1) {
      const firstFace = cabinetWallFaces[firstIndex];
      const secondFace = cabinetWallFaces[secondIndex];

      if (firstFace.wallGraphId !== secondFace.wallGraphId) {
        continue;
      }

      if (firstFace.wallSegmentId === secondFace.wallSegmentId) {
        continue;
      }

      const sharedEndpoint = getSharedEndpoint(firstFace, secondFace);

      if (sharedEndpoint === null) {
        continue;
      }

      const angleDegrees = getAcuteAngleDegrees(
        firstFace.elevationFrame.faceDirectionInches,
        secondFace.elevationFrame.faceDirectionInches,
      );

      if (!isInsideCornerAngle(angleDegrees)) {
        continue;
      }

      const cornerKey = createPhysicalCornerKey({
        wallGraphId: firstFace.wallGraphId,
        pointInches: sharedEndpoint.pointInches,
        faceIds: [firstFace.id, secondFace.id],
      });

      if (seenCornerKeys.has(cornerKey)) {
        continue;
      }

      seenCornerKeys.add(cornerKey);

      const wallFaceA: KitchenAiCornerFaceRef = {
        wallFaceId: firstFace.id,
        wallGraphId: firstFace.wallGraphId,
        wallSegmentId: firstFace.wallSegmentId,
        faceSide: firstFace.faceSide,
        cornerEnd: sharedEndpoint.firstCornerEnd,
      };
      const wallFaceB: KitchenAiCornerFaceRef = {
        wallFaceId: secondFace.id,
        wallGraphId: secondFace.wallGraphId,
        wallSegmentId: secondFace.wallSegmentId,
        faceSide: secondFace.faceSide,
        cornerEnd: sharedEndpoint.secondCornerEnd,
      };
      const id = `corner-${corners.length + 1}`;

      corners.push({
        id,
        cornerType: "inside",
        angleDegrees,
        cornerPointInches: sharedEndpoint.pointInches,
        wallFaceA,
        wallFaceB,
        baseResolution: createCornerWithFillersResolutionTargets({
          cornerId: id,
          layer: "base",
          cornerPointInches: sharedEndpoint.pointInches,
          firstFace,
          secondFace,
          wallFaceA,
          wallFaceB,
          cornerSizeInches: args.rules.baseCornerSizeInches,
          fillerSizeInches: args.rules.baseCornerFillerSizeInches,
          centerVerticalInches: args.rules.baseCornerSizeInches.heightInches / 2,
          allowedFillerWidthsInches: args.rules.cornerFillerAllowedWidthsInches,
        }),
        wallResolution: createCornerWithFillersResolutionTargets({
          cornerId: id,
          layer: "wall",
          cornerPointInches: sharedEndpoint.pointInches,
          firstFace,
          secondFace,
          wallFaceA,
          wallFaceB,
          cornerSizeInches: args.rules.wallCornerSizeInches,
          fillerSizeInches: args.rules.wallCornerFillerSizeInches,
          centerVerticalInches:
            args.rules.wallCabinetBottomInchesFromFloor +
            args.rules.wallCornerSizeInches.heightInches / 2,
          allowedFillerWidthsInches: args.rules.cornerFillerAllowedWidthsInches,
        }),
      });
    }
  }

  cabinetWallFaces.forEach((cabinetFace) => {
    (["left", "right"] as const).forEach((cornerEnd) => {
      if (hasCabinetEligibleNeighborAtFaceEnd({
        face: cabinetFace,
        cornerEnd,
        wallFaces: cabinetWallFaces,
      })) {
        return;
      }

      const endpointNeighbor = findPerpendicularNeighborAtFaceEnd({
        face: cabinetFace,
        cornerEnd,
        wallFaces: args.wallFaces,
      });

      if (endpointNeighbor === null) {
        return;
      }

      const singleSideKey = createPhysicalCornerKey({
        wallGraphId: cabinetFace.wallGraphId,
        pointInches: endpointNeighbor.pointInches,
        faceIds: [cabinetFace.id, `single-side-${cornerEnd}`],
      });

      if (seenCornerKeys.has(singleSideKey)) {
        return;
      }

      seenCornerKeys.add(singleSideKey);

      const wallFaceA: KitchenAiCornerFaceRef = {
        wallFaceId: cabinetFace.id,
        wallGraphId: cabinetFace.wallGraphId,
        wallSegmentId: cabinetFace.wallSegmentId,
        faceSide: cabinetFace.faceSide,
        cornerEnd,
      };
      const wallFaceB: KitchenAiCornerFaceRef = {
        wallFaceId: endpointNeighbor.face.id,
        wallGraphId: endpointNeighbor.face.wallGraphId,
        wallSegmentId: endpointNeighbor.face.wallSegmentId,
        faceSide: endpointNeighbor.face.faceSide,
        cornerEnd: endpointNeighbor.cornerEnd,
      };
      const id = `corner-${corners.length + 1}`;

      corners.push({
        id,
        cornerType: "inside",
        angleDegrees: endpointNeighbor.angleDegrees,
        cornerPointInches: endpointNeighbor.pointInches,
        wallFaceA,
        wallFaceB,
        baseResolution: createSingleSideFillerResolutionTargets({
          cornerId: id,
          layer: "base",
          face: cabinetFace,
          wallFace: wallFaceA,
          fillerSizeInches: args.rules.baseCornerFillerSizeInches,
          centerVerticalInches: args.rules.baseCornerFillerSizeInches.heightInches / 2,
          allowedFillerWidthsInches: args.rules.cornerFillerAllowedWidthsInches,
        }),
        wallResolution: createSingleSideFillerResolutionTargets({
          cornerId: id,
          layer: "wall",
          face: cabinetFace,
          wallFace: wallFaceA,
          fillerSizeInches: args.rules.wallCornerFillerSizeInches,
          centerVerticalInches:
            args.rules.wallCabinetBottomInchesFromFloor +
            args.rules.wallCornerFillerSizeInches.heightInches / 2,
          allowedFillerWidthsInches: args.rules.cornerFillerAllowedWidthsInches,
        }),
      });
    });
  });

  return corners;
}

type CornerWithFillersResolutionArgs = Readonly<{
  cornerId: string;
  layer: "base" | "wall";
  cornerPointInches: Point3DInches;
  firstFace: KitchenAiWallFace;
  secondFace: KitchenAiWallFace;
  wallFaceA: KitchenAiCornerFaceRef;
  wallFaceB: KitchenAiCornerFaceRef;
  cornerSizeInches: KitchenAiRules["baseCornerSizeInches"];
  fillerSizeInches: KitchenAiRules["baseCornerFillerSizeInches"];
  centerVerticalInches: number;
  allowedFillerWidthsInches: readonly number[];
}>;

function createCornerWithFillersResolutionTargets(args: CornerWithFillersResolutionArgs): KitchenAiCornerResolutionTargets | null {
  const firstFaceHasRoom = doesFaceHaveCornerResolutionRoom(args.firstFace, args.cornerSizeInches.widthInches, args.fillerSizeInches.widthInches);
  const secondFaceHasRoom = doesFaceHaveCornerResolutionRoom(args.secondFace, args.cornerSizeInches.widthInches, args.fillerSizeInches.widthInches);

  if (!firstFaceHasRoom || !secondFaceHasRoom) {
    return null;
  }

  const cornerWorldPositionInches = {
    xInches:
      args.cornerPointInches.xInches +
      args.firstFace.elevationFrame.outwardDirectionInches.xInches * (args.cornerSizeInches.depthInches / 2) +
      args.secondFace.elevationFrame.outwardDirectionInches.xInches * (args.cornerSizeInches.depthInches / 2),
    yInches:
      args.cornerPointInches.yInches +
      args.firstFace.elevationFrame.outwardDirectionInches.yInches * (args.cornerSizeInches.depthInches / 2) +
      args.secondFace.elevationFrame.outwardDirectionInches.yInches * (args.cornerSizeInches.depthInches / 2),
    zInches: args.centerVerticalInches,
  };

  return {
    layer: args.layer,
    resolutionKind: "corner-with-fillers",
    cornerZone: {
      reservedFor: "corner",
      sizeInches: args.cornerSizeInches,
      worldPositionInches: cornerWorldPositionInches,
      rotationDegrees: {
        zDegrees: getZRotationDegreesForFaceDirection(args.firstFace.elevationFrame.faceDirectionInches),
      },
      cornerAttachment: {
        cornerId: args.cornerId,
        layer: args.layer,
      },
    },
    fillerZones: [
      createCornerFillerTarget({
        cornerId: args.cornerId,
        layer: args.layer,
        resolutionKind: "corner-with-fillers",
        face: args.firstFace,
        cornerFaceRef: args.wallFaceA,
        cornerSizeInches: args.cornerSizeInches.widthInches,
        fillerSizeInches: args.fillerSizeInches,
        centerVerticalInches: args.centerVerticalInches,
        allowedFillerWidthsInches: args.allowedFillerWidthsInches,
      }),
      createCornerFillerTarget({
        cornerId: args.cornerId,
        layer: args.layer,
        resolutionKind: "corner-with-fillers",
        face: args.secondFace,
        cornerFaceRef: args.wallFaceB,
        cornerSizeInches: args.cornerSizeInches.widthInches,
        fillerSizeInches: args.fillerSizeInches,
        centerVerticalInches: args.centerVerticalInches,
        allowedFillerWidthsInches: args.allowedFillerWidthsInches,
      }),
    ],
  };
}

function createSingleSideFillerResolutionTargets(args: {
  cornerId: string;
  layer: "base" | "wall";
  face: KitchenAiWallFace;
  wallFace: KitchenAiCornerFaceRef;
  fillerSizeInches: KitchenAiRules["baseCornerFillerSizeInches"];
  centerVerticalInches: number;
  allowedFillerWidthsInches: readonly number[];
}): KitchenAiCornerResolutionTargets | null {
  if (!doesFaceHaveSingleSideFillerRoom(args.face, args.fillerSizeInches.widthInches)) {
    return null;
  }

  return {
    layer: args.layer,
    resolutionKind: "single-side-filler",
    cornerZone: null,
    fillerZones: [
      createCornerFillerTarget({
        cornerId: args.cornerId,
        layer: args.layer,
        resolutionKind: "single-side-filler",
        face: args.face,
        cornerFaceRef: args.wallFace,
        cornerSizeInches: 0,
        fillerSizeInches: args.fillerSizeInches,
        centerVerticalInches: args.centerVerticalInches,
        allowedFillerWidthsInches: args.allowedFillerWidthsInches,
      }),
    ],
  };
}

function createCornerFillerTarget(args: {
  cornerId: string;
  layer: "base" | "wall";
  resolutionKind: "corner-with-fillers" | "single-side-filler";
  face: KitchenAiWallFace;
  cornerFaceRef: KitchenAiCornerFaceRef;
  cornerSizeInches: number;
  fillerSizeInches: KitchenAiRules["baseCornerFillerSizeInches"];
  centerVerticalInches: number;
  allowedFillerWidthsInches: readonly number[];
}): KitchenAiCornerResolutionTargets["fillerZones"][number] {
  const leftBound = args.face.elevationFrame.horizontalBoundsInches.leftInches;
  const rightBound = args.face.elevationFrame.horizontalBoundsInches.rightInches;
  const centerHorizontalInches = getCornerFillerCenterHorizontalInches({
    leftBound,
    rightBound,
    cornerEnd: args.cornerFaceRef.cornerEnd,
    cornerSizeInches: args.cornerSizeInches,
    fillerWidthInches: args.fillerSizeInches.widthInches,
  });

  return {
    reservedFor: "filler",
    sizeInches: args.fillerSizeInches,
    wallElevationAttachment: {
      wallGraphId: args.face.wallGraphId,
      wallSegmentId: args.face.wallSegmentId,
      faceSide: args.face.faceSide,
      centerHorizontalInches,
      centerVerticalInches: args.centerVerticalInches,
      distanceFromWallFaceInches: 0,
    },
    anchor: {
      kind: "corner-filler-anchor",
      sourceCornerId: args.cornerId,
      layer: args.layer,
      resolutionKind: args.resolutionKind,
      cornerEnd: args.cornerFaceRef.cornerEnd,
      defaultWidthInches: args.fillerSizeInches.widthInches,
      allowedWidthsInches: args.allowedFillerWidthsInches,
    },
  };
}

function getCornerFillerCenterHorizontalInches(args: {
  leftBound: number;
  rightBound: number;
  cornerEnd: "left" | "right";
  cornerSizeInches: number;
  fillerWidthInches: number;
}): number {
  return args.cornerEnd === "right"
    ? args.rightBound - args.cornerSizeInches - args.fillerWidthInches / 2
    : args.leftBound + args.cornerSizeInches + args.fillerWidthInches / 2;
}

function doesFaceHaveCornerResolutionRoom(
  face: KitchenAiWallFace,
  cornerWidthInches: number,
  fillerWidthInches: number,
): boolean {
  return getFaceHorizontalLengthInches(face) >= cornerWidthInches + fillerWidthInches;
}

function doesFaceHaveSingleSideFillerRoom(
  face: KitchenAiWallFace,
  fillerWidthInches: number,
): boolean {
  return getFaceHorizontalLengthInches(face) >= fillerWidthInches;
}

function getFaceHorizontalLengthInches(face: KitchenAiWallFace): number {
  return (
    face.elevationFrame.horizontalBoundsInches.rightInches -
    face.elevationFrame.horizontalBoundsInches.leftInches
  );
}

type SharedEndpoint = Readonly<{
  pointInches: Point3DInches;
  firstCornerEnd: "left" | "right";
  secondCornerEnd: "left" | "right";
}>;

type EndpointNeighbor = Readonly<{
  face: KitchenAiWallFace;
  cornerEnd: "left" | "right";
  pointInches: Point3DInches;
  angleDegrees: number;
}>;

function hasCabinetEligibleNeighborAtFaceEnd(args: {
  face: KitchenAiWallFace;
  cornerEnd: "left" | "right";
  wallFaces: readonly KitchenAiWallFace[];
}): boolean {
  return findPerpendicularNeighborAtFaceEnd(args) !== null;
}

function findPerpendicularNeighborAtFaceEnd(args: {
  face: KitchenAiWallFace;
  cornerEnd: "left" | "right";
  wallFaces: readonly KitchenAiWallFace[];
}): EndpointNeighbor | null {
  const endpoint = getFaceEndpoint(args.face, args.cornerEnd);

  for (const candidate of args.wallFaces) {
    if (candidate.wallGraphId !== args.face.wallGraphId) {
      continue;
    }

    if (candidate.wallSegmentId === args.face.wallSegmentId) {
      continue;
    }

    const angleDegrees = getAcuteAngleDegrees(
      args.face.elevationFrame.faceDirectionInches,
      candidate.elevationFrame.faceDirectionInches,
    );

    if (!isInsideCornerAngle(angleDegrees)) {
      continue;
    }

    const candidateEnds = (["left", "right"] as const).map((candidateEnd) => ({
      cornerEnd: candidateEnd,
      pointInches: getFaceEndpoint(candidate, candidateEnd),
    }));
    const matchingEnd = candidateEnds.find(
      (candidateEnd) => getPlanDistanceInches(endpoint, candidateEnd.pointInches) <= POINT_EPSILON_INCHES,
    );

    if (matchingEnd === undefined) {
      continue;
    }

    return {
      face: candidate,
      cornerEnd: matchingEnd.cornerEnd,
      pointInches: {
        xInches: (endpoint.xInches + matchingEnd.pointInches.xInches) / 2,
        yInches: (endpoint.yInches + matchingEnd.pointInches.yInches) / 2,
        zInches: 0,
      },
      angleDegrees,
    };
  }

  return null;
}

function getSharedEndpoint(firstFace: KitchenAiWallFace, secondFace: KitchenAiWallFace): SharedEndpoint | null {
  const firstStart = getFaceEndpoint(firstFace, "left");
  const firstEnd = getFaceEndpoint(firstFace, "right");
  const secondStart = getFaceEndpoint(secondFace, "left");
  const secondEnd = getFaceEndpoint(secondFace, "right");
  const candidates = [
    { first: firstStart, firstCornerEnd: "left" as const, second: secondStart, secondCornerEnd: "left" as const },
    { first: firstStart, firstCornerEnd: "left" as const, second: secondEnd, secondCornerEnd: "right" as const },
    { first: firstEnd, firstCornerEnd: "right" as const, second: secondStart, secondCornerEnd: "left" as const },
    { first: firstEnd, firstCornerEnd: "right" as const, second: secondEnd, secondCornerEnd: "right" as const },
  ];

  const match = candidates.find((candidate) => getPlanDistanceInches(candidate.first, candidate.second) <= POINT_EPSILON_INCHES);

  if (match === undefined) {
    return null;
  }

  return {
    pointInches: {
      xInches: (match.first.xInches + match.second.xInches) / 2,
      yInches: (match.first.yInches + match.second.yInches) / 2,
      zInches: 0,
    },
    firstCornerEnd: match.firstCornerEnd,
    secondCornerEnd: match.secondCornerEnd,
  };
}

function getFaceEndpoint(face: KitchenAiWallFace, cornerEnd: "left" | "right"): Point3DInches {
  const horizontalInches = cornerEnd === "left"
    ? face.elevationFrame.horizontalBoundsInches.leftInches
    : face.elevationFrame.horizontalBoundsInches.rightInches;

  return {
    xInches:
      face.elevationFrame.planeOriginInches.xInches +
      face.elevationFrame.faceDirectionInches.xInches * horizontalInches,
    yInches:
      face.elevationFrame.planeOriginInches.yInches +
      face.elevationFrame.faceDirectionInches.yInches * horizontalInches,
    zInches: 0,
  };
}

function getAcuteAngleDegrees(firstDirection: Point3DInches, secondDirection: Point3DInches): number {
  const dot = Math.abs(
    firstDirection.xInches * secondDirection.xInches +
    firstDirection.yInches * secondDirection.yInches,
  );
  const clampedDot = Math.min(1, Math.max(0, dot));

  return (Math.acos(clampedDot) * 180) / Math.PI;
}

function isInsideCornerAngle(angleDegrees: number): boolean {
  return angleDegrees >= MIN_CORNER_ANGLE_DEGREES && angleDegrees <= MAX_CORNER_ANGLE_DEGREES;
}

function getPlanDistanceInches(firstPoint: Point3DInches, secondPoint: Point3DInches): number {
  return Math.hypot(
    firstPoint.xInches - secondPoint.xInches,
    firstPoint.yInches - secondPoint.yInches,
  );
}

function createPhysicalCornerKey(args: {
  wallGraphId: string;
  pointInches: Point3DInches;
  faceIds: readonly string[];
}): string {
  return [
    args.wallGraphId,
    roundForKey(args.pointInches.xInches),
    roundForKey(args.pointInches.yInches),
    ...[...args.faceIds].sort(),
  ].join("|");
}

function roundForKey(value: number): number {
  return Math.round(value * 100) / 100;
}
