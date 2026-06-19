import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { DesignScene } from "@/engine/scene/designSceneTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import type { WallFaceSide, CabinetPlacementRequirement } from "@/engine/walls/placedWallSegmentTypes";
import { getWallElevationViewZoneForTarget } from "@/engine/walls/wallElevationViewZone";
import type { WallElevationViewZone } from "@/engine/walls/wallElevationViewZone";

export type SelectedWallAiContext = Readonly<{
  kind: "selected-wall";
  wallGraphId: string;
  wallSegmentId: string;
  wallName: string;
  faceSide: WallFaceSide;
  placementRequirement: Exclude<CabinetPlacementRequirement, "none">;
  lengthInches: number;
  heightInches: number;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  faceStartPointInches: Point3DInches;
  faceEndPointInches: Point3DInches;
  faceDirectionInches: Readonly<{
    xInches: number;
    yInches: number;
  }>;
  outwardNormalInches: Readonly<{
    xInches: number;
    yInches: number;
  }>;
  objectRotationZDegrees: number;
}>;

export type SelectedWallAiContextResult =
  | Readonly<{
      ok: true;
      context: SelectedWallAiContext;
    }>
  | Readonly<{
      ok: false;
      reason: "NO_SELECTED_WALL" | "NO_VALID_CABINET_FACE";
      message: string;
    }>;

export function buildSelectedWallAiContext(
  designScene: DesignScene,
): SelectedWallAiContextResult {
  const activeSelection = designScene.activeSelection;

  if (activeSelection?.kind !== "placed-wall-segment") {
    return {
      ok: false,
      reason: "NO_SELECTED_WALL",
      message: "Select a wall segment first, then ask me to place a cabinet on it.",
    };
  }

  const wallGraph = designScene.placedWallGraphs.find(
    (candidate) => candidate.id === activeSelection.wallGraphId,
  );
  const wallSegment = wallGraph?.segments.find(
    (candidate) => candidate.id === activeSelection.wallSegmentId,
  );

  if (wallGraph === undefined || wallSegment === undefined) {
    return {
      ok: false,
      reason: "NO_SELECTED_WALL",
      message: "The selected wall segment could not be found in the current scene.",
    };
  }

  const faceChoice = chooseCabinetPlacementFaceSide(wallSegment.preferredViewFaceSide, wallSegment.cabinetPlacementFacePolicies);

  if (faceChoice === null) {
    return {
      ok: false,
      reason: "NO_VALID_CABINET_FACE",
      message: "The selected wall does not allow cabinet placement on either side.",
    };
  }

  const viewZone = getWallElevationViewZoneForTarget({
    placedWallGraphs: designScene.placedWallGraphs,
    activeWallElevationTarget: {
      wallGraphId: wallGraph.id,
      wallSegmentId: wallSegment.id,
      faceSide: faceChoice.faceSide,
    },
  });

  if (viewZone === null) {
    return {
      ok: false,
      reason: "NO_VALID_CABINET_FACE",
      message: "The selected wall face view zone could not be built for cabinet placement.",
    };
  }

  if (
    viewZone.wallGraphId !== wallGraph.id ||
    viewZone.wallSegmentId !== wallSegment.id ||
    viewZone.faceSide !== faceChoice.faceSide
  ) {
    return {
      ok: false,
      reason: "NO_VALID_CABINET_FACE",
      message: "The selected wall face view zone did not match the selected wall face.",
    };
  }

  const topology = buildConnectedWallGeometry(wallGraph);
  const wallSegmentBody = topology.segmentBodies.find(
    (candidate) => candidate.wallSegmentId === wallSegment.id,
  );

  if (wallSegmentBody === undefined) {
    return {
      ok: false,
      reason: "NO_SELECTED_WALL",
      message: "The selected wall segment has invalid geometry and cannot receive a cabinet.",
    };
  }

  const visualWallFace = getElevationVisualWallFace(viewZone);

  return {
    ok: true,
    context: {
      kind: "selected-wall",
      wallGraphId: wallGraph.id,
      wallSegmentId: wallSegment.id,
      wallName: wallSegment.name,
      faceSide: faceChoice.faceSide,
      placementRequirement: faceChoice.requirement,
      lengthInches: viewZone.faceLengthInches,
      heightInches: viewZone.wallHeightInches,
      startPointInches: wallSegmentBody.start.centerPointInches,
      endPointInches: wallSegmentBody.end.centerPointInches,
      faceStartPointInches: visualWallFace.faceStartPointInches,
      faceEndPointInches: visualWallFace.faceEndPointInches,
      faceDirectionInches: visualWallFace.faceDirectionInches,
      outwardNormalInches: viewZone.outwardDirectionInches,
      objectRotationZDegrees: getObjectRotationZDegreesForWallNormal(viewZone.outwardDirectionInches),
    },
  };
}

function chooseCabinetPlacementFaceSide(
  preferredViewFaceSide: WallFaceSide,
  facePolicies: Readonly<Record<WallFaceSide, CabinetPlacementRequirement>>,
): Readonly<{
  faceSide: WallFaceSide;
  requirement: Exclude<CabinetPlacementRequirement, "none">;
}> | null {
  if (facePolicies[preferredViewFaceSide] === "required") {
    return { faceSide: preferredViewFaceSide, requirement: "required" };
  }

  const requiredFaceSide = (["side-a", "side-b"] as const).find(
    (faceSide) => facePolicies[faceSide] === "required",
  );

  if (requiredFaceSide !== undefined) {
    return { faceSide: requiredFaceSide, requirement: "required" };
  }

  if (facePolicies[preferredViewFaceSide] === "optional") {
    return { faceSide: preferredViewFaceSide, requirement: "optional" };
  }

  const optionalFaceSide = (["side-a", "side-b"] as const).find(
    (faceSide) => facePolicies[faceSide] === "optional",
  );

  if (optionalFaceSide !== undefined) {
    return { faceSide: optionalFaceSide, requirement: "optional" };
  }

  return null;
}

type ElevationVisualWallFace = Readonly<{
  faceStartPointInches: Point3DInches;
  faceEndPointInches: Point3DInches;
  faceDirectionInches: Readonly<{
    xInches: number;
    yInches: number;
  }>;
}>;

function getElevationVisualWallFace(viewZone: WallElevationViewZone): ElevationVisualWallFace {
  const cameraRightDirectionInches = getElevationCameraRightDirectionInches(viewZone);
  const faceStartScreenXInches = projectPlanPointOntoDirection({
    pointInches: viewZone.faceStartInches,
    originInches: viewZone.faceCenterInches,
    directionInches: cameraRightDirectionInches,
  });
  const faceEndScreenXInches = projectPlanPointOntoDirection({
    pointInches: viewZone.faceEndInches,
    originInches: viewZone.faceCenterInches,
    directionInches: cameraRightDirectionInches,
  });
  const viewZoneStartIsElevationLeft = faceStartScreenXInches <= faceEndScreenXInches;

  if (viewZoneStartIsElevationLeft) {
    return {
      faceStartPointInches: viewZone.faceStartInches,
      faceEndPointInches: viewZone.faceEndInches,
      faceDirectionInches: viewZone.faceDirectionInches,
    };
  }

  return {
    faceStartPointInches: viewZone.faceEndInches,
    faceEndPointInches: viewZone.faceStartInches,
    faceDirectionInches: {
      xInches: -viewZone.faceDirectionInches.xInches,
      yInches: -viewZone.faceDirectionInches.yInches,
    },
  };
}

function getElevationCameraRightDirectionInches(
  viewZone: WallElevationViewZone,
): Readonly<{ xInches: number; yInches: number }> {
  // The locked wall elevation camera sits on the wall face normal and looks back
  // toward the wall face center with +Z as camera up. In that camera, horizontal
  // screen-right is forward x up. Therefore AI u=0 is the endpoint with the
  // smaller projection on this screen-right axis: the left side of elevation view.
  return normalizePlanDirection({
    xInches: -viewZone.outwardDirectionInches.yInches,
    yInches: viewZone.outwardDirectionInches.xInches,
  });
}

function projectPlanPointOntoDirection(args: {
  pointInches: Point3DInches;
  originInches: Point3DInches;
  directionInches: Readonly<{ xInches: number; yInches: number }>;
}): number {
  return (
    (args.pointInches.xInches - args.originInches.xInches) * args.directionInches.xInches +
    (args.pointInches.yInches - args.originInches.yInches) * args.directionInches.yInches
  );
}

function normalizePlanDirection(
  directionInches: Readonly<{ xInches: number; yInches: number }>,
): Readonly<{ xInches: number; yInches: number }> {
  const lengthInches = Math.hypot(directionInches.xInches, directionInches.yInches);

  if (lengthInches <= 0) {
    return { xInches: 1, yInches: 0 };
  }

  return {
    xInches: directionInches.xInches / lengthInches,
    yInches: directionInches.yInches / lengthInches,
  };
}

function getObjectRotationZDegreesForWallNormal(
  normalInches: Readonly<{ xInches: number; yInches: number }>,
): number {
  // Assembly local +Y is the cabinet front, but this editor stores positive
  // zDegrees as a user-facing clockwise rotation. Convert the wall-face normal
  // into that rotation convention so the cabinet front points away from the wall.
  const standardNormalAngleDegrees =
    (Math.atan2(normalInches.yInches, normalInches.xInches) * 180) / Math.PI;

  return normalizeDegrees(90 - standardNormalAngleDegrees);
}

function normalizeDegrees(degrees: number): number {
  let normalizedDegrees = degrees % 360;

  if (normalizedDegrees < 0) {
    normalizedDegrees += 360;
  }

  return normalizedDegrees;
}
