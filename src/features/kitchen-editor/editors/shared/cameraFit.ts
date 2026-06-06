import type { Bounds3DInches } from "@/core/geometry/boxBounds";
import type { Point3DInches } from "@/core/geometry/pointTypes";

export type SceneFitFrame = Readonly<{
  centerInches: Point3DInches;
  sizeInches: number;
}>;

export function createSceneFitFrame(boundsInches: Bounds3DInches | null): SceneFitFrame {
  if (boundsInches === null) {
    return {
      centerInches: {
        xInches: 0,
        yInches: 0,
        zInches: 24,
      },
      sizeInches: 120,
    };
  }

  const widthInches = boundsInches.maxInches.xInches - boundsInches.minInches.xInches;
  const depthInches = boundsInches.maxInches.yInches - boundsInches.minInches.yInches;
  const heightInches = boundsInches.maxInches.zInches - boundsInches.minInches.zInches;

  return {
    centerInches: {
      xInches: (boundsInches.minInches.xInches + boundsInches.maxInches.xInches) / 2,
      yInches: (boundsInches.minInches.yInches + boundsInches.maxInches.yInches) / 2,
      zInches: (boundsInches.minInches.zInches + boundsInches.maxInches.zInches) / 2,
    },
    sizeInches: Math.max(widthInches, depthInches, heightInches, 96),
  };
}
