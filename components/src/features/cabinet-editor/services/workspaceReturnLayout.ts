import type { GeneratedKitchenLayout } from "../../../../../lib/ai/types";
import { normalizeSpecialCabinetState } from "../data/placementCatalog";
import { withPlacementElementType } from "../engine/placementClassification";
import { dot, normalize, sub, vectorLength } from "../engine/geometry";
import type { PlacementElement } from "../types/editorTypes";

function getWorkspaceReturnEditorWallFace(
  layout: GeneratedKitchenLayout,
  placement: PlacementElement
): PlacementElement["wallFace"] {
  if (!placement.wallFace || !placement.wallId) return placement.wallFace;

  const wall = layout.room.walls.find((candidateWall) => candidateWall.id === placement.wallId);
  if (!wall) return placement.wallFace;

  const wallDirection = normalize(sub(wall.end, wall.start));
  if (!vectorLength(wallDirection)) return placement.wallFace;

  const isMostlyHorizontal =
    Math.abs(wall.end.x - wall.start.x) >= Math.abs(wall.end.y - wall.start.y);
  const shouldFlip = isMostlyHorizontal
    ? wall.start.x > wall.end.x
    : wall.start.y > wall.end.y;
  const displayStart = shouldFlip ? wall.end : wall.start;
  const displayEnd = shouldFlip ? wall.start : wall.end;
  const displayDirection = normalize(sub(displayEnd, displayStart));

  if (!vectorLength(displayDirection)) return placement.wallFace;

  return dot(wallDirection, displayDirection) < 0
    ? placement.wallFace === "left"
      ? "right"
      : "left"
    : placement.wallFace;
}

function getWorkspaceReturnMirroredCenter(
  layout: GeneratedKitchenLayout,
  placement: PlacementElement
): PlacementElement["center"] {
  if (!placement.wallFace || !placement.wallId) return placement.center;

  const wall = layout.room.walls.find((candidateWall) => candidateWall.id === placement.wallId);
  if (!wall) return placement.center;

  const wallDirection = normalize(sub(wall.end, wall.start));
  if (!vectorLength(wallDirection)) return placement.center;

  const editorWallFace = getWorkspaceReturnEditorWallFace(layout, placement);
  if (editorWallFace === placement.wallFace) return placement.center;

  const wallNormal = { x: -wallDirection.y, y: wallDirection.x };
  const signedDistance = dot(sub(placement.center, wall.start), wallNormal);

  return {
    x: placement.center.x - 2 * signedDistance * wallNormal.x,
    y: placement.center.y - 2 * signedDistance * wallNormal.y,
  };
}

export function buildWorkspaceReturnPlacements(
  layout: GeneratedKitchenLayout,
): PlacementElement[] {
  return layout.cabinets.map((placement) =>
    normalizeSpecialCabinetState(
      withPlacementElementType({
        ...placement,
        wallFace: getWorkspaceReturnEditorWallFace(layout, placement as PlacementElement),
        center: getWorkspaceReturnMirroredCenter(layout, placement as PlacementElement),
      } as PlacementElement),
    ),
  );
}
