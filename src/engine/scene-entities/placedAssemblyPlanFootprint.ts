import type { Point3DInches } from "@/core/geometry/pointTypes";
import { rotatePointAroundZInches } from "@/core/geometry/pointTypes";
import { getPlanDistanceInches } from "@/core/geometry/planPointGeometry";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { SceneEntityPlanFootprint } from "./sceneEntityPlanGeometryTypes";

export function createPlacedAssemblyPlanFootprint(placedAssembly: PlacedAssembly): SceneEntityPlanFootprint {
  const halfWidthInches = placedAssembly.configuration.sizeInches.widthInches / 2;
  const halfDepthInches = placedAssembly.configuration.sizeInches.depthInches / 2;
  const localCornerPointsInches: readonly Point3DInches[] = [
    { xInches: -halfWidthInches, yInches: -halfDepthInches, zInches: 0 },
    { xInches: halfWidthInches, yInches: -halfDepthInches, zInches: 0 },
    { xInches: halfWidthInches, yInches: halfDepthInches, zInches: 0 },
    { xInches: -halfWidthInches, yInches: halfDepthInches, zInches: 0 },
  ];
  const cornerPointsInches = localCornerPointsInches.map((localCornerPointInches) => {
    const rotatedCornerPointInches = rotatePointAroundZInches(localCornerPointInches, placedAssembly.rotationDegrees.zDegrees);
    return {
      xInches: placedAssembly.worldPositionInches.xInches + rotatedCornerPointInches.xInches,
      yInches: placedAssembly.worldPositionInches.yInches + rotatedCornerPointInches.yInches,
      zInches: placedAssembly.worldPositionInches.zInches,
    };
  });

  return {
    centerPointInches: placedAssembly.worldPositionInches,
    cornerPointsInches,
    edges: cornerPointsInches.map((cornerPointInches, cornerIndex) => {
      const nextCornerPointInches = cornerPointsInches[(cornerIndex + 1) % cornerPointsInches.length];
      return {
        index: cornerIndex,
        startPointInches: cornerPointInches,
        endPointInches: nextCornerPointInches,
        midpointInches: {
          xInches: (cornerPointInches.xInches + nextCornerPointInches.xInches) / 2,
          yInches: (cornerPointInches.yInches + nextCornerPointInches.yInches) / 2,
          zInches: placedAssembly.worldPositionInches.zInches,
        },
        lengthInches: getPlanDistanceInches(cornerPointInches, nextCornerPointInches),
      };
    }),
  };
}
