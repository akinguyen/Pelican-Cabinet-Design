import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { AssemblyElevationMoveFrame } from "@/engine/scene/sceneDragTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import { getWallElevationViewZoneForTarget } from "@/engine/walls/wallElevationViewZone";
import type { WallElevationTarget } from "@/engine/walls/wallSegmentElevationTypes";

export function createDesignReservationZoneElevationMoveFrame(args: {
  planeOriginInches?: Point3DInches;
  placedWallGraphs: readonly PlacedWallGraph[];
  activeWallElevationTarget: WallElevationTarget | null;
}): AssemblyElevationMoveFrame | undefined {
  const viewZone = getWallElevationViewZoneForTarget({
    placedWallGraphs: args.placedWallGraphs,
    activeWallElevationTarget: args.activeWallElevationTarget,
  });

  if (viewZone === null) {
    return undefined;
  }

  const faceLengthInches = Math.max(viewZone.faceLengthInches, 0.000001);

  return {
    faceDirectionInches: {
      xInches: (viewZone.faceEndInches.xInches - viewZone.faceStartInches.xInches) / faceLengthInches,
      yInches: (viewZone.faceEndInches.yInches - viewZone.faceStartInches.yInches) / faceLengthInches,
      zInches: 0,
    },
    outwardDirectionInches: {
      xInches: viewZone.outwardDirectionInches.xInches,
      yInches: viewZone.outwardDirectionInches.yInches,
      zInches: 0,
    },
    planeOriginInches: args.planeOriginInches ?? viewZone.faceCenterInches,
    viewZoneInches: {
      originInches: viewZone.faceCenterInches,
      leftInches: viewZone.viewFrameLeftInches,
      rightInches: viewZone.viewFrameRightInches,
      nearDepthInches: -viewZone.behindFaceDepthInches,
      farDepthInches: viewZone.depthInches,
      bottomInches: 0,
      topInches: viewZone.wallHeightInches,
    },
  };
}
