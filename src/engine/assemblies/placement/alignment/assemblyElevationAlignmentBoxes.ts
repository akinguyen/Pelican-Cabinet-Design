import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { createCountertopOpeningRequestedPolygon } from "@/engine/countertops/countertopOpeningGeometry";
import type { DerivedCountertopOpening } from "@/engine/countertops/countertopOpeningTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { WallSegmentFace } from "@/engine/walls/wallSegmentTopologyTypes";
import { createAssemblyPlacementFootprint } from "../assemblyPlacementGeometry";
import type {
  AssemblyPlacementElevationFrame,
  AssemblyPlacementFootprint,
} from "../assemblyPlacementTypes";
import {
  arePlanDirectionsParallel,
  getPlanDotProduct,
  normalizePlanVector,
  type PlanVector2DInches,
} from "../assemblyPlacementPlanGeometry";
import { createCountertopWorldPoint } from "./assemblyCountertopAlignmentGeometry";
import {
  COUNTERTOP_OPENING_ELEVATION_TARGET_THICKNESS_INCHES,
  ELEVATION_FLOOR_ALIGNMENT_SNAP_DISTANCE_INCHES,
  ELEVATION_FLOOR_ALIGNMENT_TARGET_ID,
  ELEVATION_FLOOR_ALIGNMENT_TARGET_PRIORITY,
  OBJECT_ALIGNMENT_PARALLEL_ANGLE_TOLERANCE_DEGREES,
  OBJECT_ELEVATION_ALIGNMENT_DEPTH_TOLERANCE_INCHES,
  OBJECT_ELEVATION_ALIGNMENT_SNAP_DISTANCE_INCHES,
  WALL_ALIGNMENT_SNAP_DISTANCE_INCHES,
} from "./assemblyObjectAlignmentConstants";
import type {
  ElevationAlignmentBox,
  ProjectedElevationBounds,
} from "./assemblyObjectAlignmentTypes";

export function createElevationAlignmentBox(args: {
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
  const viewZoneBoundsInches = createProjectedElevationViewZoneBounds({
    footprint,
    bottomInches,
    topInches,
    elevationFrame: args.elevationFrame,
    faceDirectionInches,
    outwardDirectionInches,
  });

  return {
    assemblyId: args.placedAssembly.id,
    targetPriority: 0,
    snapDistanceInches: OBJECT_ELEVATION_ALIGNMENT_SNAP_DISTANCE_INCHES,
    leftInches,
    centerInches: (leftInches + rightInches) / 2,
    rightInches,
    bottomInches,
    middleInches: (bottomInches + topInches) / 2,
    topInches,
    depthInches,
    ...(viewZoneBoundsInches === undefined ? {} : { viewZoneBoundsInches }),
  };
}

export function createFloorElevationAlignmentBox(args: {
  movingBox: ElevationAlignmentBox;
  elevationFrame: AssemblyPlacementElevationFrame;
}): ElevationAlignmentBox {
  const viewZoneInches = args.elevationFrame.viewZoneInches;
  const uOffsetInches = viewZoneInches === undefined
    ? 0
    : getPlanDotProduct({
        xInches: viewZoneInches.originInches.xInches - args.elevationFrame.planeOriginInches.xInches,
        yInches: viewZoneInches.originInches.yInches - args.elevationFrame.planeOriginInches.yInches,
      }, {
        xInches: args.elevationFrame.faceDirectionInches.xInches,
        yInches: args.elevationFrame.faceDirectionInches.yInches,
      });
  const leftInches = viewZoneInches === undefined
    ? args.movingBox.leftInches
    : viewZoneInches.leftInches + uOffsetInches;
  const rightInches = viewZoneInches === undefined
    ? args.movingBox.rightInches
    : viewZoneInches.rightInches + uOffsetInches;

  return {
    assemblyId: ELEVATION_FLOOR_ALIGNMENT_TARGET_ID,
    targetPriority: ELEVATION_FLOOR_ALIGNMENT_TARGET_PRIORITY,
    snapDistanceInches: ELEVATION_FLOOR_ALIGNMENT_SNAP_DISTANCE_INCHES,
    leftInches,
    centerInches: (leftInches + rightInches) / 2,
    rightInches,
    bottomInches: 0,
    middleInches: 0,
    topInches: 0,
    depthInches: args.movingBox.depthInches,
  };
}

export function isElevationAlignmentTargetRelevant(args: {
  movingBox: ElevationAlignmentBox;
  targetBox: ElevationAlignmentBox;
  elevationFrame: AssemblyPlacementElevationFrame;
}): boolean {
  const viewZoneInches = args.elevationFrame.viewZoneInches;

  if (viewZoneInches === undefined || args.targetBox.viewZoneBoundsInches === undefined) {
    return Math.abs(args.targetBox.depthInches - args.movingBox.depthInches) <= (
      OBJECT_ELEVATION_ALIGNMENT_DEPTH_TOLERANCE_INCHES
    );
  }

  return doElevationBoundsIntersect(
    args.targetBox.viewZoneBoundsInches,
    {
      leftInches: viewZoneInches.leftInches,
      rightInches: viewZoneInches.rightInches,
      bottomInches: viewZoneInches.bottomInches,
      topInches: viewZoneInches.topInches,
      nearDepthInches: viewZoneInches.nearDepthInches,
      farDepthInches: viewZoneInches.farDepthInches,
    },
  );
}

export function createWallFaceElevationAlignmentBoxes(args: {
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

export function createDerivedWallOpeningElevationAlignmentBoxes(_args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  elevationFrame: AssemblyPlacementElevationFrame;
}): readonly ElevationAlignmentBox[] {
  return [];
}

export function createCountertopOpeningElevationAlignmentBoxes(args: {
  placedAssemblies: readonly PlacedAssembly[];
  countertopOpenings: readonly DerivedCountertopOpening[];
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

export function isElevationAlignmentBox(
  box: ElevationAlignmentBox | null | undefined,
): box is ElevationAlignmentBox {
  return box !== null && box !== undefined;
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

function createProjectedElevationViewZoneBounds(args: {
  footprint: AssemblyPlacementFootprint;
  bottomInches: number;
  topInches: number;
  elevationFrame: AssemblyPlacementElevationFrame;
  faceDirectionInches: PlanVector2DInches;
  outwardDirectionInches: PlanVector2DInches;
}): ProjectedElevationBounds | undefined {
  const viewZoneInches = args.elevationFrame.viewZoneInches;

  if (viewZoneInches === undefined) {
    return undefined;
  }

  const projectedUValuesInches = args.footprint.cornerPointsInches.map((cornerPointInches) => getPlanDotProduct({
    xInches: cornerPointInches.xInches - viewZoneInches.originInches.xInches,
    yInches: cornerPointInches.yInches - viewZoneInches.originInches.yInches,
  }, args.faceDirectionInches));
  const projectedDepthValuesInches = args.footprint.cornerPointsInches.map((cornerPointInches) => getPlanDotProduct({
    xInches: cornerPointInches.xInches - viewZoneInches.originInches.xInches,
    yInches: cornerPointInches.yInches - viewZoneInches.originInches.yInches,
  }, args.outwardDirectionInches));

  return {
    leftInches: Math.min(...projectedUValuesInches),
    rightInches: Math.max(...projectedUValuesInches),
    bottomInches: args.bottomInches,
    topInches: args.topInches,
    nearDepthInches: Math.min(...projectedDepthValuesInches),
    farDepthInches: Math.max(...projectedDepthValuesInches),
  };
}

function doElevationBoundsIntersect(
  firstBoundsInches: ProjectedElevationBounds,
  secondBoundsInches: ProjectedElevationBounds,
): boolean {
  return (
    firstBoundsInches.rightInches >= secondBoundsInches.leftInches &&
    firstBoundsInches.leftInches <= secondBoundsInches.rightInches &&
    firstBoundsInches.topInches >= secondBoundsInches.bottomInches &&
    firstBoundsInches.bottomInches <= secondBoundsInches.topInches &&
    firstBoundsInches.farDepthInches >= secondBoundsInches.nearDepthInches &&
    firstBoundsInches.nearDepthInches <= secondBoundsInches.farDepthInches
  );
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
    targetPriority: -2,
    snapDistanceInches: WALL_ALIGNMENT_SNAP_DISTANCE_INCHES,
    leftInches,
    centerInches: (leftInches + rightInches) / 2,
    rightInches,
    bottomInches: 0,
    middleInches: args.face.heightInches / 2,
    topInches: args.face.heightInches,
    depthInches: faceDepthInches,
  };
}

function createCountertopOpeningElevationAlignmentBox(args: {
  opening: DerivedCountertopOpening;
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
    targetPriority: 0,
    snapDistanceInches: OBJECT_ELEVATION_ALIGNMENT_SNAP_DISTANCE_INCHES,
    leftInches,
    centerInches: (leftInches + rightInches) / 2,
    rightInches,
    bottomInches: topZInches - halfTargetThicknessInches,
    middleInches: topZInches,
    topInches: topZInches + halfTargetThicknessInches,
    depthInches,
  };
}
