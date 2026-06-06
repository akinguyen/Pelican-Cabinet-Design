import type { Point3DInches } from "@/core/geometry/pointTypes";
import type {
  WallFootprintDraft,
  WallFootprintDraftPoint,
  WallFootprintSnapTarget,
} from "./wallFootprintDraftTypes";

export function getWallFootprintSnapTargetPoint(
  snapTarget: WallFootprintSnapTarget,
): Point3DInches {
  return snapTarget.pointInches;
}

export function getActiveWallFootprintDraftPoint(
  draft: WallFootprintDraft,
): WallFootprintDraftPoint | null {
  if (draft.activePointId === null) {
    return null;
  }

  return draft.points.find((point) => point.id === draft.activePointId) ?? null;
}

export function getWallFootprintDraftOrderedPoints(
  draft: WallFootprintDraft,
): readonly WallFootprintDraftPoint[] {
  return draft.points;
}
