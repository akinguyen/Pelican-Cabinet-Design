import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { SceneEntityElevationFrame } from "./sceneEntityPlanGeometryTypes";

export type SceneEntityMovementFrameKind = "floor-plane" | "wall-face-plane";

export type SceneEntityWallContact = Readonly<{
  distanceFromWallFaceInches: number;
}>;

export type SceneEntityMovementFrame = Readonly<{
  kind: SceneEntityMovementFrameKind;
  originInches: Point3DInches;
  horizontalAxisInches: Point3DInches;
  verticalAxisInches: Point3DInches;
  lockedNormalInches: Point3DInches;
  elevationFrame?: SceneEntityElevationFrame;
  wallContact?: SceneEntityWallContact;
}>;

export type SceneEntityMovementFrameCoordinates = Readonly<{
  horizontalInches: number;
  verticalInches: number;
  normalInches: number;
}>;

const WORLD_X_AXIS: Point3DInches = { xInches: 1, yInches: 0, zInches: 0 };
const WORLD_Y_AXIS: Point3DInches = { xInches: 0, yInches: 1, zInches: 0 };
const WORLD_Z_AXIS: Point3DInches = { xInches: 0, yInches: 0, zInches: 1 };
const ZERO_POINT: Point3DInches = { xInches: 0, yInches: 0, zInches: 0 };

export function createSceneEntityMovementFrame(args: {
  sceneViewMode: SceneViewMode;
  elevationMoveFrame?: SceneEntityElevationFrame;
}): SceneEntityMovementFrame {
  if (args.sceneViewMode === "elevation" && args.elevationMoveFrame !== undefined) {
    return createWallFaceSceneEntityMovementFrame(args.elevationMoveFrame);
  }

  return createFloorPlaneSceneEntityMovementFrame();
}

export function createFloorPlaneSceneEntityMovementFrame(): SceneEntityMovementFrame {
  return {
    kind: "floor-plane",
    originInches: ZERO_POINT,
    horizontalAxisInches: WORLD_X_AXIS,
    verticalAxisInches: WORLD_Y_AXIS,
    lockedNormalInches: WORLD_Z_AXIS,
  };
}

export function createWallFaceSceneEntityMovementFrame(elevationFrame: SceneEntityElevationFrame): SceneEntityMovementFrame {
  return {
    kind: "wall-face-plane",
    originInches: elevationFrame.planeOriginInches,
    horizontalAxisInches: normalizeVector(elevationFrame.faceDirectionInches) ?? WORLD_X_AXIS,
    verticalAxisInches: WORLD_Z_AXIS,
    lockedNormalInches: normalizeVector(elevationFrame.outwardDirectionInches) ?? WORLD_Y_AXIS,
    elevationFrame,
    wallContact: { distanceFromWallFaceInches: 0 },
  };
}

export function projectPointToSceneEntityMovementFrame(args: {
  pointInches: Point3DInches;
  movementFrame: SceneEntityMovementFrame;
}): SceneEntityMovementFrameCoordinates {
  const relativePointInches = subtractPoint(args.pointInches, args.movementFrame.originInches);
  return {
    horizontalInches: dotPoint(relativePointInches, args.movementFrame.horizontalAxisInches),
    verticalInches: dotPoint(relativePointInches, args.movementFrame.verticalAxisInches),
    normalInches: dotPoint(relativePointInches, args.movementFrame.lockedNormalInches),
  };
}

export function createPointInSceneEntityMovementFrame(args: {
  movementFrame: SceneEntityMovementFrame;
  horizontalInches: number;
  verticalInches: number;
  normalInches: number;
}): Point3DInches {
  return addPoint(
    args.movementFrame.originInches,
    addPoint(
      multiplyPoint(args.movementFrame.horizontalAxisInches, args.horizontalInches),
      addPoint(
        multiplyPoint(args.movementFrame.verticalAxisInches, args.verticalInches),
        multiplyPoint(args.movementFrame.lockedNormalInches, args.normalInches),
      ),
    ),
  );
}

export function translatePointInSceneEntityMovementFrame(args: {
  pointInches: Point3DInches;
  movementFrame: SceneEntityMovementFrame;
  deltaHorizontalInches: number;
  deltaVerticalInches: number;
}): Point3DInches {
  return addPoint(
    args.pointInches,
    addPoint(
      multiplyPoint(args.movementFrame.horizontalAxisInches, args.deltaHorizontalInches),
      multiplyPoint(args.movementFrame.verticalAxisInches, args.deltaVerticalInches),
    ),
  );
}

export function createSceneEntityMovementFramePointFromPointerDelta(args: {
  dragStartPointerWorldInches: Point3DInches;
  pointerWorldInches: Point3DInches;
  dragStartWorldPositionInches: Point3DInches;
  movementFrame: SceneEntityMovementFrame;
  minWorldZInches: number;
}): Point3DInches {
  const pointerDeltaInches = subtractPoint(args.pointerWorldInches, args.dragStartPointerWorldInches);
  const deltaHorizontalInches = dotPoint(pointerDeltaInches, args.movementFrame.horizontalAxisInches);
  const deltaVerticalInches = dotPoint(pointerDeltaInches, args.movementFrame.verticalAxisInches);
  const movedPoint = translatePointInSceneEntityMovementFrame({
    pointInches: args.dragStartWorldPositionInches,
    movementFrame: args.movementFrame,
    deltaHorizontalInches,
    deltaVerticalInches,
  });

  return {
    ...movedPoint,
    zInches: Math.max(args.minWorldZInches, movedPoint.zInches),
  };
}

function normalizeVector(pointInches: Point3DInches): Point3DInches | null {
  const lengthInches = Math.hypot(pointInches.xInches, pointInches.yInches, pointInches.zInches);
  if (lengthInches <= 0.000001) {
    return null;
  }
  return {
    xInches: pointInches.xInches / lengthInches,
    yInches: pointInches.yInches / lengthInches,
    zInches: pointInches.zInches / lengthInches,
  };
}

function addPoint(firstPointInches: Point3DInches, secondPointInches: Point3DInches): Point3DInches {
  return {
    xInches: firstPointInches.xInches + secondPointInches.xInches,
    yInches: firstPointInches.yInches + secondPointInches.yInches,
    zInches: firstPointInches.zInches + secondPointInches.zInches,
  };
}

function subtractPoint(firstPointInches: Point3DInches, secondPointInches: Point3DInches): Point3DInches {
  return {
    xInches: firstPointInches.xInches - secondPointInches.xInches,
    yInches: firstPointInches.yInches - secondPointInches.yInches,
    zInches: firstPointInches.zInches - secondPointInches.zInches,
  };
}

function multiplyPoint(pointInches: Point3DInches, scalar: number): Point3DInches {
  return {
    xInches: pointInches.xInches * scalar,
    yInches: pointInches.yInches * scalar,
    zInches: pointInches.zInches * scalar,
  };
}

function dotPoint(firstPointInches: Point3DInches, secondPointInches: Point3DInches): number {
  return firstPointInches.xInches * secondPointInches.xInches +
    firstPointInches.yInches * secondPointInches.yInches +
    firstPointInches.zInches * secondPointInches.zInches;
}
