import type { Point3DInches } from "@/core/geometry/pointTypes";
import { rotatePointAroundZInches } from "@/core/geometry/pointTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { AssemblyPlacementFootprint } from "./assemblyPlacementTypes";
import { getPlanDistanceInches } from "@/core/geometry/planPointGeometry";

export function createAssemblyPlacementFootprint(
  placedAssembly: PlacedAssembly,
): AssemblyPlacementFootprint {
  const halfWidthInches = placedAssembly.configuration.sizeInches.widthInches / 2;
  const halfDepthInches = placedAssembly.configuration.sizeInches.depthInches / 2;
  const localCornerPointsInches: readonly Point3DInches[] = [
    { xInches: -halfWidthInches, yInches: -halfDepthInches, zInches: 0 },
    { xInches: halfWidthInches, yInches: -halfDepthInches, zInches: 0 },
    { xInches: halfWidthInches, yInches: halfDepthInches, zInches: 0 },
    { xInches: -halfWidthInches, yInches: halfDepthInches, zInches: 0 },
  ];
  const cornerPointsInches = localCornerPointsInches.map((localCornerPointInches) => {
    const rotatedCornerPointInches = rotatePointAroundZInches(
      localCornerPointInches,
      placedAssembly.rotationDegrees.zDegrees,
    );

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
      const lengthInches = getPlanDistanceInches(cornerPointInches, nextCornerPointInches);

      return {
        index: cornerIndex,
        startPointInches: cornerPointInches,
        endPointInches: nextCornerPointInches,
        midpointInches: {
          xInches: (cornerPointInches.xInches + nextCornerPointInches.xInches) / 2,
          yInches: (cornerPointInches.yInches + nextCornerPointInches.yInches) / 2,
          zInches: placedAssembly.worldPositionInches.zInches,
        },
        lengthInches,
      };
    }),
  };
}

export function updateAssemblyPlacementWorldPosition(
  placedAssembly: PlacedAssembly,
  worldPositionInches: Point3DInches,
): PlacedAssembly {
  return {
    ...placedAssembly,
    worldPositionInches,
  };
}

export function updateAssemblyPlacementRotationDegrees(
  placedAssembly: PlacedAssembly,
  zDegrees: number,
): PlacedAssembly {
  return {
    ...placedAssembly,
    rotationDegrees: {
      zDegrees,
    },
  };
}

export function translateAssemblyPlacement(
  placedAssembly: PlacedAssembly,
  deltaInches: Readonly<{ xInches: number; yInches: number; zInches?: number }>,
): PlacedAssembly {
  return updateAssemblyPlacementWorldPosition(placedAssembly, {
    ...placedAssembly.worldPositionInches,
    xInches: placedAssembly.worldPositionInches.xInches + deltaInches.xInches,
    yInches: placedAssembly.worldPositionInches.yInches + deltaInches.yInches,
    zInches: placedAssembly.worldPositionInches.zInches + (deltaInches.zInches ?? 0),
  });
}


