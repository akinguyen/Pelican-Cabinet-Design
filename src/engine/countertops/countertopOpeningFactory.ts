import type { Size3DInches } from "@/core/geometry/sizeTypes";
import { createId } from "@/core/ids/createId";
import type { Point2DInches } from "@/core/geometry/pointTypes";
import type {
  CountertopCutoutDraftShapeKind,
  CountertopOpening,
  CountertopOpeningShape,
} from "./countertopOpeningTypes";
import {
  clipCountertopOpeningPolygonToHost,
  createCountertopOpeningShapePolygon,
  getCountertopOpeningPolygonBounds,
} from "./countertopOpeningGeometry";

export const MIN_COUNTERTOP_OPENING_SIZE_INCHES = 2;

export function createCountertopOpening(args: {
  hostCountertopId: string;
  localCenterInches: Point2DInches;
  localRotationDegrees?: number;
  shape: CountertopOpeningShape;
}): CountertopOpening {
  return {
    id: createId(),
    hostCountertopId: args.hostCountertopId,
    localCenterInches: args.localCenterInches,
    localRotationDegrees: args.localRotationDegrees ?? 0,
    shape: sanitizeCountertopOpeningShape(args.shape),
  };
}

export function createCountertopOpeningFromDraft(args: {
  hostCountertopId: string;
  shapeKind: CountertopCutoutDraftShapeKind;
  startLocalInches: Point2DInches;
  currentLocalInches: Point2DInches;
  hostSizeInches: Size3DInches;
}): CountertopOpening | null {
  const draftOpening = createRequestedCountertopOpeningFromDraft(args);

  if (draftOpening === null) {
    return null;
  }

  const clippedPolygonInches = clipCountertopOpeningPolygonToHost(
    createCountertopOpeningShapePolygon({
      localCenterInches: draftOpening.localCenterInches,
      localRotationDegrees: draftOpening.localRotationDegrees,
      shape: draftOpening.shape,
    }),
    args.hostSizeInches,
  );
  const bounds = getCountertopOpeningPolygonBounds(clippedPolygonInches);

  if (bounds === null) {
    return null;
  }

  const widthInches = bounds.rightInches - bounds.leftInches;
  const depthInches = bounds.frontInches - bounds.backInches;

  if (
    widthInches < MIN_COUNTERTOP_OPENING_SIZE_INCHES ||
    depthInches < MIN_COUNTERTOP_OPENING_SIZE_INCHES
  ) {
    return null;
  }

  return createCountertopOpening({
    hostCountertopId: args.hostCountertopId,
    localCenterInches: {
      xInches: (bounds.leftInches + bounds.rightInches) / 2,
      yInches: (bounds.backInches + bounds.frontInches) / 2,
    },
    shape: {
      kind: "rectangle",
      widthInches,
      depthInches,
    },
  });
}

export function createRequestedCountertopOpeningFromDraft(args: {
  hostCountertopId: string;
  shapeKind: CountertopCutoutDraftShapeKind;
  startLocalInches: Point2DInches;
  currentLocalInches: Point2DInches;
}): CountertopOpening | null {
  const leftInches = Math.min(args.startLocalInches.xInches, args.currentLocalInches.xInches);
  const rightInches = Math.max(args.startLocalInches.xInches, args.currentLocalInches.xInches);
  const backInches = Math.min(args.startLocalInches.yInches, args.currentLocalInches.yInches);
  const frontInches = Math.max(args.startLocalInches.yInches, args.currentLocalInches.yInches);
  const widthInches = rightInches - leftInches;
  const depthInches = frontInches - backInches;

  if (
    widthInches < MIN_COUNTERTOP_OPENING_SIZE_INCHES ||
    depthInches < MIN_COUNTERTOP_OPENING_SIZE_INCHES
  ) {
    return null;
  }

  return createCountertopOpening({
    hostCountertopId: args.hostCountertopId,
    localCenterInches: {
      xInches: (leftInches + rightInches) / 2,
      yInches: (backInches + frontInches) / 2,
    },
    shape: {
      kind: args.shapeKind,
      widthInches,
      depthInches,
    },
  });
}

export function sanitizeCountertopOpeningShape(
  shape: CountertopOpeningShape,
): CountertopOpeningShape {
  return {
    kind: "rectangle",
    widthInches: Math.max(MIN_COUNTERTOP_OPENING_SIZE_INCHES, shape.widthInches),
    depthInches: Math.max(MIN_COUNTERTOP_OPENING_SIZE_INCHES, shape.depthInches),
  };
}
