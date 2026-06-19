import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SelectedWallAiContext } from "../context/buildSelectedWallAiContext";

export function createWallFacePlacedAssemblyPosition(args: {
  selectedWallContext: SelectedWallAiContext;
  widthInches: number;
  depthInches: number;
  heightInches: number;
  defaultDistanceFromFloorInches: number;
  uStartInches: number;
}): Readonly<{
  worldPositionInches: Point3DInches;
  rotationDegrees: Readonly<{ zDegrees: number }>;
}> {
  const uCenterInches = args.uStartInches + args.widthInches / 2;
  const dCenterInches = args.depthInches / 2;
  const selectedWallContext = args.selectedWallContext;

  return {
    worldPositionInches: {
      xInches:
        selectedWallContext.faceStartPointInches.xInches +
        selectedWallContext.faceDirectionInches.xInches * uCenterInches +
        selectedWallContext.outwardNormalInches.xInches * dCenterInches,
      yInches:
        selectedWallContext.faceStartPointInches.yInches +
        selectedWallContext.faceDirectionInches.yInches * uCenterInches +
        selectedWallContext.outwardNormalInches.yInches * dCenterInches,
      zInches: args.defaultDistanceFromFloorInches + args.heightInches / 2,
    },
    rotationDegrees: {
      zDegrees: selectedWallContext.objectRotationZDegrees,
    },
  };
}
