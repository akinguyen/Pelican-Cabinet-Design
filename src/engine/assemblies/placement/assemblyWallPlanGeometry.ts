import type { Point3DInches } from "@/core/geometry/pointTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { WallSegmentFace } from "@/engine/walls/wallSegmentTopologyTypes";
import type { PlanLineSegmentInches } from "./assemblyPlacementPlanGeometry";

export function getPlacedWallFaces(placedWallGraphs: readonly PlacedWallGraph[]): readonly WallSegmentFace[] {
  return placedWallGraphs.flatMap((placedWallGraph) => buildConnectedWallGeometry(placedWallGraph).faces);
}

export function getWallFacePlanSegment(wallFace: WallSegmentFace): PlanLineSegmentInches {
  return {
    startPointInches: wallFace.startPointInches as Point3DInches,
    endPointInches: wallFace.endPointInches as Point3DInches,
  };
}
