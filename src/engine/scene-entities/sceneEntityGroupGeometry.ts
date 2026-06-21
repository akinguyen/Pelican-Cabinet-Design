import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneEntityPlanFootprint } from "@/engine/scene-entities/sceneEntityPlanGeometryTypes";
import type { SceneEntityBounds } from "./sceneEntityBoundsTypes";

export type SceneEntityBoundsPlanFrame = Readonly<{
  minXInches: number;
  maxXInches: number;
  minYInches: number;
  maxYInches: number;
  centerXInches: number;
  centerYInches: number;
}>;

export function createSceneEntityBoundsPlanFrame(
  bounds: readonly SceneEntityBounds[],
): SceneEntityBoundsPlanFrame | null {
  if (bounds.length === 0) {
    return null;
  }

  const points = bounds.flatMap((item) => item.footprintCornersInches);

  if (points.length === 0) {
    return null;
  }

  const planFrame = points.reduce((currentFrame, pointInches) => ({
    minXInches: Math.min(currentFrame.minXInches, pointInches.xInches),
    maxXInches: Math.max(currentFrame.maxXInches, pointInches.xInches),
    minYInches: Math.min(currentFrame.minYInches, pointInches.yInches),
    maxYInches: Math.max(currentFrame.maxYInches, pointInches.yInches),
  }), {
    minXInches: Number.POSITIVE_INFINITY,
    maxXInches: Number.NEGATIVE_INFINITY,
    minYInches: Number.POSITIVE_INFINITY,
    maxYInches: Number.NEGATIVE_INFINITY,
  });

  return {
    ...planFrame,
    centerXInches: (planFrame.minXInches + planFrame.maxXInches) / 2,
    centerYInches: (planFrame.minYInches + planFrame.maxYInches) / 2,
  };
}

export function createSceneEntityGroupFootprint(
  bounds: readonly SceneEntityBounds[],
): SceneEntityPlanFootprint | null {
  if (bounds.length <= 1) {
    return null;
  }

  const planFrame = createSceneEntityBoundsPlanFrame(bounds);

  if (planFrame === null) {
    return null;
  }

  const centerPointInches = createPoint(planFrame.centerXInches, planFrame.centerYInches);
  const cornerPointsInches = [
    createPoint(planFrame.minXInches, planFrame.minYInches),
    createPoint(planFrame.maxXInches, planFrame.minYInches),
    createPoint(planFrame.maxXInches, planFrame.maxYInches),
    createPoint(planFrame.minXInches, planFrame.maxYInches),
  ];

  return {
    centerPointInches,
    cornerPointsInches,
    edges: cornerPointsInches.map((cornerPointInches, cornerIndex) => {
      const nextCornerPointInches = cornerPointsInches[(cornerIndex + 1) % cornerPointsInches.length];

      return {
        index: cornerIndex,
        startPointInches: cornerPointInches,
        endPointInches: nextCornerPointInches,
        midpointInches: createPoint(
          (cornerPointInches.xInches + nextCornerPointInches.xInches) / 2,
          (cornerPointInches.yInches + nextCornerPointInches.yInches) / 2,
        ),
        lengthInches: Math.hypot(
          nextCornerPointInches.xInches - cornerPointInches.xInches,
          nextCornerPointInches.yInches - cornerPointInches.yInches,
        ),
      };
    }),
  };
}

function createPoint(xInches: number, yInches: number): Point3DInches {
  return { xInches, yInches, zInches: 0 };
}
