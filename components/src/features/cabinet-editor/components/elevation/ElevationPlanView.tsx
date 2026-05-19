"use client";
import * as React from "react";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ElevationPlacementAccessoryDetails, detachedPanelWallIntersectsFloorPlacement, getPlacementRuleViolationMessage, getPlacementPlanOccupiedBounds, getPlacementProjectionOnWallAxis, getRotatedRectBounds, getRotatedRectCorners, getWallPlacementSupportedWall, polygonsOverlapForPlacementBlocking } from "../placements/PlacementViews";
import { getStructureGuideEndpointsFromMeasurementRun } from "../openings/Openings";
import { CABINET_TOE_KICK_HEIGHT_INCHES } from "../../constants/placementConstants";
import { GRID_SIZE } from "../../constants/editorConstants";
import { DEFAULT_ELEVATION_WALL_HEIGHT_INCHES, ELEVATION_VIEWBOX_HEIGHT, ELEVATION_VIEWBOX_WIDTH } from "../../constants/elevationConstants";
import { WALL_PLACEMENT_ELEVATION_OVERLAP_MESSAGE } from "../../constants/messages";
import { PENIN_WALL_ELEVATION_FACE_WIDTH_INCHES, PENIN_WALL_ELEVATION_HEIGHT_INCHES, PENIN_WALL_THICKNESS, WALL_ATTACH_THRESHOLD, WALL_THICKNESS } from "../../constants/wallConstants";
import { useMeasurementDisplayUnit } from "../../context/MeasurementDisplayUnitContext";
import { getBlindCabinetSide, getBlindCabinetWidthSegments, getDefaultBottomDrawerProductLayout, getOvenCabinetHeightSegments } from "../../data/placementCatalog";
import { placementHasToeKick, getPlacementImage, getPlacementSupportType, getDefaultPlacementImageForCategory, isAccessoryPlacementImage, isElevationFloatingPlacement, isProductPlacementImage, isStandaloneBaseProductElevationImage } from "../../engine/placementClassification";
import { add, clamp, cross, degreesToRadians, distance, dot, formatMeasurementFromInches, getPreferredNormal, inchesToPixels, mul, normalize, perp, pixelsToInches, sub, vectorLength } from "../../engine/geometry";
import { closestPointOnSegment, getWallSegmentBlackDotGeometry, isDetachedPanelWall, isIslandWall, isPeninWall, isThickWall } from "../../engine/wallEngine";
import { getPlacementCatalogItemByIdentity } from "../../services/smartKitchenExport";
import type { PlacementCategory, PlacementElement, PlacementElevationItem, PlacementImage, PlacementPreview, PlacementWallAttachment, DoorElement, ElevationAlignmentGuide, ElevationCornerReservation, ElevationCornerReservationSeverity, ElevationDragState, ElevationObjectBox, ElevationObjectDistanceMetrics, ElevationOpeningLayout, ElevationWallAxis, ElevationWallDistanceContext, ElevationWallInteriorSpan, MeasurementSide, PeninWallElevationPlacement, Point, Wall, WallPlacementMode, WallPlacementStackPlacementResult, WallElevationViewMode, WallFaceSide, WindowElement } from "../../types/editorTypes";

export function getElevationWallAxis(wall: Wall): ElevationWallAxis {
  const isMostlyHorizontal = Math.abs(wall.end.x - wall.start.x) >= Math.abs(wall.end.y - wall.start.y);
  const shouldFlip = isMostlyHorizontal
    ? wall.start.x > wall.end.x
    : wall.start.y > wall.end.y;
  const start = shouldFlip ? wall.end : wall.start;
  const end = shouldFlip ? wall.start : wall.end;
  const length = distance(start, end);
  const direction = length > 0.001 ? normalize(sub(end, start)) : { x: 1, y: 0 };
  const normal = perp(direction);

  return {
    start,
    end,
    direction,
    normal,
    length,
  };
}

export function getElevationWallElementCenterInches(wall: Wall, t: number) {
  const axis = getElevationWallAxis(wall);
  const wallLength = distance(wall.start, wall.end);
  const wallDirection = wallLength > 0.001 ? normalize(sub(wall.end, wall.start)) : axis.direction;
  const floorPlanCenter = add(wall.start, mul(wallDirection, clamp(t, 0, 1) * wallLength));
  const centerPixels = clamp(dot(sub(floorPlanCenter, axis.start), axis.direction), 0, axis.length);

  return pixelsToInches(centerPixels);
}

export function getInteriorMeasurementGuideSide(
  wall: Wall,
  walls: Wall[] = []
): Exclude<MeasurementSide, "length"> {
  const direction = normalize(sub(wall.end, wall.start));
  if (!vectorLength(direction)) return "left";

  // Interior/exterior cannot be derived from a fixed screen normal. For example,
  // a top wall and a bottom wall both may be drawn left-to-right, but their room
  // interiors are on opposite sides. The reliable signal is the measurement run:
  // for thick-wall rooms, the interior guide is the side with the shorter usable
  // run between mitered/connected wall faces (15'11", 12', 20'5", etc.), while
  // the exterior guide includes the wall thickness and is longer.
  if (walls.length) {
    const measurementWalls = walls.filter(isThickWall);
    const leftLength = getWallSideGuideRunLength(wall, measurementWalls, "left");
    const rightLength = getWallSideGuideRunLength(wall, measurementWalls, "right");
    const tolerance = 0.5;

    if (leftLength + tolerance < rightLength) return "left";
    if (rightLength + tolerance < leftLength) return "right";
  }

  const baseNormal = normalize(perp(direction));
  const interiorNormal = mul(getPreferredNormal(wall.start, wall.end), -1);

  return dot(interiorNormal, baseNormal) >= 0 ? "left" : "right";
}

export function getWallElevationViewMode(wall: Wall): WallElevationViewMode {
  return wall.elevationViewMode === "exterior" ? "exterior" : "interior";
}

export function getWallPlacementMode(wall: Wall): WallPlacementMode {
  return wall.placementMode === "none" ||
    wall.placementMode === "both" ||
    wall.placementMode === "interior" ||
    wall.placementMode === "exterior"
    ? wall.placementMode
    : "interior";
}

export function getWallPlacementGuideSides(
  wall: Wall,
  walls: Wall[]
): Exclude<MeasurementSide, "length">[] {
  if (getWallPlacementMode(wall) === "none") {
    return [];
  }

  const interiorSide = getInteriorMeasurementGuideSide(wall, walls);
  const exteriorSide = interiorSide === "left" ? "right" : "left";
  const mode = getWallPlacementMode(wall);

  if (mode === "both") {
    return [interiorSide, exteriorSide];
  }

  return [mode === "exterior" ? exteriorSide : interiorSide];
}

export function getWallPlacementDebugLines(
  wall: Wall,
  walls: Wall[]
): Array<{ key: string; start: Point; end: Point }> {
  const thickWalls = walls.filter(isThickWall);
  if (!thickWalls.length || getWallPlacementMode(wall) === "none") {
    return [];
  }

  const geometry = getWallSegmentBlackDotGeometry(wall.start, wall.end, thickWalls);
  const interiorSide = getInteriorMeasurementGuideSide(wall, thickWalls);
  const exteriorSide = interiorSide === "left" ? "right" : "left";
  const mode = getWallPlacementMode(wall);

  const lineForSide = (side: Exclude<MeasurementSide, "length">) =>
    side === "left"
      ? {
          key: `${wall.id}-left`,
          start: geometry.startLeft,
          end: geometry.endLeft,
        }
      : {
          key: `${wall.id}-right`,
          start: geometry.startRight,
          end: geometry.endRight,
        };

  if (mode === "both") {
    return [lineForSide(interiorSide), lineForSide(exteriorSide)];
  }

  return [lineForSide(mode === "exterior" ? exteriorSide : interiorSide)];
}

export function getWallElevationGuideSide(
  wall: Wall,
  walls: Wall[]
): Exclude<MeasurementSide, "length"> {
  const interiorSide = getInteriorMeasurementGuideSide(wall, walls);
  const mode = getWallElevationViewMode(wall);

  if (mode === "exterior") {
    return interiorSide === "left" ? "right" : "left";
  }

  return interiorSide;
}

export function getWallElevationDebugGuideSide(
  wall: Wall,
  walls: Wall[]
): Exclude<MeasurementSide, "length"> | null {
  return getWallPlacementGuideSides(wall, walls)[0] ?? null;
}

export function measurementSideToWallFaceSide(
  wall: Wall,
  side: Exclude<MeasurementSide, "length">
): WallFaceSide {
  const wallDirection = normalize(sub(wall.end, wall.start));
  const axisDirection = getElevationWallAxis(wall).direction;

  if (!vectorLength(wallDirection) || !vectorLength(axisDirection)) {
    return side;
  }

  // Cabinet wall-face attachments are stored in the elevation-axis left/right
  // system. When the elevation axis flips a wall for reading order, the raw
  // floor-plan left/right side must be mirrored to stay on the same physical
  // wall face.
  if (dot(wallDirection, axisDirection) < 0) {
    return side === "left" ? "right" : "left";
  }

  return side;
}

export function getWallProjectedFaceForElevation(
  wall: Wall,
  walls: Wall[]
): WallFaceSide | null {
  return measurementSideToWallFaceSide(
    wall,
    getWallElevationGuideSide(wall, walls)
  );
}

export function getElevationViewRightDirection(
  wall: Wall,
  walls: Wall[]
): Point | null {
  const axis = getElevationWallAxis(wall);
  if (axis.length < 0.001) return null;

  const projectedFace = getWallProjectedFaceForElevation(
    wall,
    walls.length ? walls : [wall]
  );
  if (!projectedFace) return null;

  // The projected face is the red/visible face of the wall. In elevation we are
  // standing on that face and looking straight back toward the wall. The screen
  // x-axis must therefore follow the viewer's right-hand direction, not a fixed
  // floor-plan reading order. Without this, cabinets on a north/east-facing
  // wall are mirrored to the wrong side of the wall elevation.
  const faceNormal =
    projectedFace === "left" ? axis.normal : mul(axis.normal, -1);
  const viewDirection = mul(faceNormal, -1);
  const viewerRight = perp(viewDirection);

  return vectorLength(viewerRight) ? normalize(viewerRight) : axis.direction;
}

export function shouldMirrorElevationDisplay(wall: Wall, walls: Wall[] = []) {
  const axis = getElevationWallAxis(wall);
  if (axis.length < 0.001) return false;

  if (!walls.length) {
    return getWallElevationViewMode(wall) === "exterior";
  }

  const viewerRight = getElevationViewRightDirection(wall, walls);
  if (!viewerRight) return false;

  return dot(axis.direction, viewerRight) < 0;
}

export function getElevationDisplayStartInches(
  wall: Wall,
  wallLengthInches: number,
  startInches: number,
  widthInches: number,
  walls: Wall[] = []
) {
  if (!shouldMirrorElevationDisplay(wall, walls)) return startInches;
  return Math.max(0, wallLengthInches - (startInches + widthInches));
}

export function getElevationActualStartInches(
  wall: Wall,
  wallLengthInches: number,
  displayStartInches: number,
  widthInches: number,
  walls: Wall[] = []
) {
  if (!shouldMirrorElevationDisplay(wall, walls)) return displayStartInches;
  return Math.max(0, wallLengthInches - (displayStartInches + widthInches));
}

export function getElevationWallDistanceContext(
  wall: Wall,
  walls: Wall[],
  placements: PlacementElement[] = []
): ElevationWallDistanceContext | null {
  const structuralWalls = walls.filter(
    (candidateWall) => isThickWall(candidateWall) && !isDetachedPanelWall(candidateWall)
  );
  const displayWalls = structuralWalls.length ? structuralWalls : walls.filter(isThickWall);
  const isPeninElevationWall = isDetachedPanelWall(wall);
  const peninElevationSegment = isPeninElevationWall
    ? getPeninWallVisibleSegment(wall, structuralWalls)
    : null;
  const elevationWallForMeasurement = peninElevationSegment
    ? { ...wall, start: peninElevationSegment.start, end: peninElevationSegment.end }
    : wall;
  const axis = getElevationWallAxis(elevationWallForMeasurement);

  if (axis.length < 0.001) return null;

  const span = isPeninElevationWall
    ? {
        startScalar: 0,
        endScalar: axis.length,
        length: axis.length,
        startAnchor: axis.start,
        endAnchor: axis.end,
      }
    : getElevationWallInteriorSpan(wall, displayWalls.length ? displayWalls : [wall], placements);

  const wallWidthInches = pixelsToInches(span.length);
  if (wallWidthInches <= 0.001) return null;

  return {
    wall,
    axis: getElevationWallAxis(wall),
    displayWalls,
    wallStartOffsetInches: pixelsToInches(span.startScalar),
    wallWidthInches,
  };
}

export function getElevationObjectDistanceMetricsFromStart(
  wall: Wall,
  wallWidthInches: number,
  actualStartInches: number,
  widthInches: number,
  displayWalls: Wall[]
): ElevationObjectDistanceMetrics {
  const boundedWidthInches = Math.max(0, widthInches);
  const maxStartInches = Math.max(0, wallWidthInches - boundedWidthInches);
  const boundedActualStartInches = clamp(actualStartInches, 0, maxStartInches);
  const displayStartInches = clamp(
    getElevationDisplayStartInches(
      wall,
      wallWidthInches,
      boundedActualStartInches,
      boundedWidthInches,
      displayWalls
    ),
    0,
    maxStartInches
  );

  return {
    distanceFromLeftInches: displayStartInches,
    distanceFromRightInches: Math.max(0, wallWidthInches - (displayStartInches + boundedWidthInches)),
    wallWidthInches,
  };
}

export function getOpeningElevationDistanceMetrics(
  opening: Pick<WindowElement | DoorElement, "wallId" | "t" | "width">,
  walls: Wall[],
  placements: PlacementElement[] = []
): ElevationObjectDistanceMetrics | null {
  const wall = walls.find((candidateWall) => candidateWall.id === opening.wallId);
  if (!wall) return null;

  const context = getElevationWallDistanceContext(wall, walls, placements);
  if (!context) return null;

  const actualLayout = getElevationOpeningLayoutFromCenter(
    context.wallWidthInches,
    opening.width,
    getElevationWallElementCenterInches(wall, opening.t) - context.wallStartOffsetInches
  );

  return getElevationObjectDistanceMetricsFromStart(
    wall,
    context.wallWidthInches,
    actualLayout.startInches,
    actualLayout.widthInches,
    context.displayWalls
  );
}

export function getWallTFromElevationAxisScalarInches(
  wall: Wall,
  axisScalarInches: number
) {
  const wallLength = distance(wall.start, wall.end);
  if (wallLength < 0.001) return 0;

  const axis = getElevationWallAxis(wall);
  const wallDirection = normalize(sub(wall.end, wall.start));
  const targetPoint = add(axis.start, mul(axis.direction, inchesToPixels(axisScalarInches)));
  return clamp(dot(sub(targetPoint, wall.start), wallDirection) / wallLength, 0, 1);
}

export function getOpeningTFromElevationDistance(
  opening: Pick<WindowElement | DoorElement, "wallId" | "width">,
  walls: Wall[],
  displayStartInches: number,
  placements: PlacementElement[] = []
): number | null {
  const wall = walls.find((candidateWall) => candidateWall.id === opening.wallId);
  if (!wall) return null;

  const context = getElevationWallDistanceContext(wall, walls, placements);
  if (!context) return null;

  const widthInches = pixelsToInches(opening.width);
  const maxStartInches = Math.max(0, context.wallWidthInches - widthInches);
  const boundedDisplayStartInches = clamp(displayStartInches, 0, maxStartInches);
  const actualStartInches = getElevationActualStartInches(
    wall,
    context.wallWidthInches,
    boundedDisplayStartInches,
    widthInches,
    context.displayWalls
  );
  const centerAxisScalarInches =
    context.wallStartOffsetInches + actualStartInches + widthInches / 2;

  return getWallTFromElevationAxisScalarInches(wall, centerAxisScalarInches);
}

export function getPlacementDistanceWall(
  placementItem: PlacementElement,
  walls: Wall[],
  placements: PlacementElement[] = []
): Wall | null {
  const thickWalls = walls.filter(isThickWall);
  if (placementItem.wallId) {
    const persistedWall = thickWalls.find((wall) => wall.id === placementItem.wallId);
    if (persistedWall) return persistedWall;
  }

  const bestAttachment = getBestPlacementWallAttachment(
    placementItem,
    thickWalls,
    Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8)
  );
  if (bestAttachment) return bestAttachment.wall;

  const supportedWall = getWallPlacementSupportedWall(
    placementItem,
    placements,
    thickWalls,
    placementItem.id
  );
  return supportedWall;
}

export function getPlacementElevationDistanceMetrics(
  placementItem: PlacementElement,
  walls: Wall[],
  placements: PlacementElement[]
): ElevationObjectDistanceMetrics | null {
  const wall = getPlacementDistanceWall(placementItem, walls, placements);
  if (!wall) return null;

  const context = getElevationWallDistanceContext(wall, walls, placements);
  if (!context) return null;

  const placement = getPlacementElevationItemsForWall(
    wall,
    placements,
    context.displayWalls
  ).find((candidatePlacement) => candidatePlacement.placement.id === placementItem.id);

  if (!placement) return null;

  const relativeStartInches = clamp(
    placement.startInches - context.wallStartOffsetInches,
    0,
    Math.max(0, context.wallWidthInches - placement.widthInches)
  );

  return getElevationObjectDistanceMetricsFromStart(
    wall,
    context.wallWidthInches,
    relativeStartInches,
    placement.widthInches,
    context.displayWalls
  );
}

export function getPlacementCenterFromElevationDistance(
  placementItem: PlacementElement,
  walls: Wall[],
  placements: PlacementElement[],
  displayStartInches: number
): Point | null {
  const wall = getPlacementDistanceWall(placementItem, walls, placements);
  if (!wall) return null;

  const context = getElevationWallDistanceContext(wall, walls, placements);
  if (!context) return null;

  const placement = getPlacementElevationItemsForWall(
    wall,
    placements,
    context.displayWalls
  ).find((candidatePlacement) => candidatePlacement.placement.id === placementItem.id);

  if (!placement) return null;

  const maxStartInches = Math.max(0, context.wallWidthInches - placement.widthInches);
  const boundedDisplayStartInches = clamp(displayStartInches, 0, maxStartInches);
  const actualRelativeStartInches = getElevationActualStartInches(
    wall,
    context.wallWidthInches,
    boundedDisplayStartInches,
    placement.widthInches,
    context.displayWalls
  );
  const nextAbsoluteStartInches = context.wallStartOffsetInches + actualRelativeStartInches;
  const deltaInches = nextAbsoluteStartInches - placement.startInches;

  if (Math.abs(deltaInches) < 0.001) return placementItem.center;

  return add(placementItem.center, mul(context.axis.direction, inchesToPixels(deltaInches)));
}

export function getPlacementWallFaceOnWall(
  placementItem: Pick<PlacementElement, "center" | "width" | "depth" | "rotation"> &
    Partial<Pick<PlacementElement, "wallId" | "wallFace">>,
  wall: Wall,
  walls: Wall[]
): WallFaceSide | null {
  if (placementItem.wallId && placementItem.wallId !== wall.id) return null;
  if (placementItem.wallId === wall.id && placementItem.wallFace) {
    return placementItem.wallFace;
  }

  const attachment = getPlacementWallAttachments(placementItem, walls).find(
    (candidate) => candidate.wall.id === wall.id
  );

  return attachment?.wallFace ?? null;
}

export function getWallSideGuideRunLength(
  wall: Wall,
  walls: Wall[],
  side: Exclude<MeasurementSide, "length">
) {
  const runEndpoints = getStructureGuideEndpointsFromMeasurementRun(
    wall,
    walls,
    side
  );

  if (runEndpoints) {
    return distance(runEndpoints.startAnchor, runEndpoints.endAnchor);
  }

  return distance(wall.start, wall.end);
}

export function getPlacementFacingMeasurementGuideSide(
  wall: Wall,
  placements: PlacementElement[],
  walls: Wall[]
): Exclude<MeasurementSide, "length"> | null {
  const thickWalls = walls.filter(isThickWall);
  const attachmentTolerance = Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8);
  const wallDirection = normalize(sub(wall.end, wall.start));

  if (!vectorLength(wallDirection)) return null;

  const wallNormal = normalize(perp(wallDirection));
  const votes = { left: 0, right: 0 } as Record<Exclude<MeasurementSide, "length">, number>;

  placements.forEach((placementItem) => {
    const isAttachedToWall = placementItem.wallId === wall.id
      ? true
      : !placementItem.wallId && getPlacementWallAttachments(placementItem, thickWalls, attachmentTolerance)
        .some((attachment) => attachment.wall.id === wall.id);

    if (!isAttachedToWall) return;

    const corners = getRotatedRectCorners(
      placementItem.center,
      placementItem.width,
      placementItem.depth,
      placementItem.rotation
    );
    const normalValues = corners.map((corner) => dot(sub(corner, wall.start), wallNormal));
    const minNormal = Math.min(...normalValues);
    const maxNormal = Math.max(...normalValues);

    // Use the cabinet edge that is physically closest to one of the wall faces.
    // This keeps the elevation width tied to the wall side that the cabinet is
    // actually attached to instead of falling back to the larger/opposite face.
    const leftFaceDistance = Math.min(Math.abs(minNormal - WALL_THICKNESS / 2), Math.abs(maxNormal - WALL_THICKNESS / 2));
    const rightFaceDistance = Math.min(Math.abs(minNormal + WALL_THICKNESS / 2), Math.abs(maxNormal + WALL_THICKNESS / 2));
    const side: Exclude<MeasurementSide, "length"> = leftFaceDistance <= rightFaceDistance ? "left" : "right";
    votes[side] += 1;
  });

  if (!votes.left && !votes.right) return null;
  return votes.left >= votes.right ? "left" : "right";
}

export function getElevationWallInteriorSpan(
  wall: Wall,
  walls: Wall[],
  placements: PlacementElement[] = []
): ElevationWallInteriorSpan {
  const axis = getElevationWallAxis(wall);
  const fallback = {
    startScalar: 0,
    endScalar: axis.length,
    length: axis.length,
    startAnchor: axis.start,
    endAnchor: axis.end,
  };

  if (axis.length < 0.001) return fallback;

  const thickWalls = walls.filter(isThickWall);
  const guideSide =
    getPlacementFacingMeasurementGuideSide(wall, placements, thickWalls) ??
    getWallElevationGuideSide(wall, walls);
  const runEndpoints = getStructureGuideEndpointsFromMeasurementRun(
    wall,
    thickWalls,
    guideSide
  );

  if (!runEndpoints) return fallback;

  const startScalar = dot(sub(runEndpoints.startAnchor, axis.start), axis.direction);
  const endScalar = dot(sub(runEndpoints.endAnchor, axis.start), axis.direction);
  const spanStart = Math.min(startScalar, endScalar);
  const spanEnd = Math.max(startScalar, endScalar);

  if (spanEnd - spanStart < 0.001) return fallback;

  return {
    startScalar: spanStart,
    endScalar: spanEnd,
    length: spanEnd - spanStart,
    startAnchor: runEndpoints.startAnchor,
    endAnchor: runEndpoints.endAnchor,
  };
}

export function getPeninWallAttachmentToWall(
  peninWall: Wall,
  hostWall: Wall,
  tolerance = Math.max(WALL_ATTACH_THRESHOLD, PENIN_WALL_THICKNESS)
): { endpoint: "start" | "end"; point: Point; normalSign: number; length: number } | null {
  const wallLength = distance(hostWall.start, hostWall.end);
  if (wallLength < 0.001) return null;

  const direction = normalize(sub(hostWall.end, hostWall.start));
  const normal = normalize(perp(direction));
  if (!vectorLength(normal)) return null;

  const candidates: Array<{ endpoint: "start" | "end"; endpointPoint: Point; freePoint: Point }> = [
    { endpoint: "start", endpointPoint: peninWall.start, freePoint: peninWall.end },
    { endpoint: "end", endpointPoint: peninWall.end, freePoint: peninWall.start },
  ];

  let best: { endpoint: "start" | "end"; point: Point; normalSign: number; length: number; distance: number } | null = null;

  for (const candidate of candidates) {
    const projectedPoint = closestPointOnSegment(candidate.endpointPoint, hostWall.start, hostWall.end);
    const scalar = dot(sub(projectedPoint, hostWall.start), direction);
    const endpointDistance = distance(candidate.endpointPoint, projectedPoint);
    if (endpointDistance > tolerance || scalar < -tolerance || scalar > wallLength + tolerance) {
      continue;
    }

    const freeVector = sub(candidate.freePoint, projectedPoint);
    const normalSign = dot(freeVector, normal) >= 0 ? 1 : -1;
    const length = Math.max(GRID_SIZE / 2, vectorLength(freeVector));
    if (!best || endpointDistance < best.distance) {
      best = {
        endpoint: candidate.endpoint,
        point: projectedPoint,
        normalSign,
        length,
        distance: endpointDistance,
      };
    }
  }

  if (!best) return null;
  return {
    endpoint: best.endpoint,
    point: best.point,
    normalSign: best.normalSign,
    length: best.length,
  };
}

export function getPeninWallEndpointAttachment(
  endpoint: Point,
  structuralWalls: Wall[],
  tolerance = Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 2)
): { wall: Wall; point: Point; distance: number } | null {
  let bestAttachment: { wall: Wall; point: Point; distance: number } | null = null;

  for (const wall of structuralWalls) {
    if (isDetachedPanelWall(wall)) continue;

    const wallLength = distance(wall.start, wall.end);
    if (wallLength < 0.001) continue;

    const direction = normalize(sub(wall.end, wall.start));
    const projectedPoint = closestPointOnSegment(endpoint, wall.start, wall.end);
    const scalar = dot(sub(projectedPoint, wall.start), direction);
    const endpointDistance = distance(endpoint, projectedPoint);

    if (endpointDistance > tolerance || scalar < -tolerance || scalar > wallLength + tolerance) continue;
    if (!bestAttachment || endpointDistance < bestAttachment.distance) {
      bestAttachment = { wall, point: projectedPoint, distance: endpointDistance };
    }
  }

  return bestAttachment;
}

export function getPeninWallVisibleSegment(wall: Wall, structuralWalls: Wall[] = []): { start: Point; end: Point } {
  if (isIslandWall(wall)) return { start: wall.start, end: wall.end };

  const length = distance(wall.start, wall.end);
  if (length < 0.001) return { start: wall.start, end: wall.end };

  const direction = normalize(sub(wall.end, wall.start));
  const attachOffset = WALL_THICKNESS / 2;
  let start = wall.start;
  let end = wall.end;

  if (getPeninWallEndpointAttachment(wall.start, structuralWalls)) {
    start = add(start, mul(direction, attachOffset));
  }

  if (getPeninWallEndpointAttachment(wall.end, structuralWalls)) {
    end = add(end, mul(direction, -attachOffset));
  }

  if (dot(sub(end, start), direction) <= 2) {
    return { start: wall.start, end: wall.end };
  }

  return { start, end };
}

export function getClosestPeninWallEndpointAttachment(
  endpoint: Point,
  structuralWalls: Wall[]
): { wall: Wall; point: Point; distance: number } | null {
  let bestAttachment: { wall: Wall; point: Point; distance: number } | null = null;

  for (const wall of structuralWalls) {
    if (isDetachedPanelWall(wall)) continue;

    const wallLength = distance(wall.start, wall.end);
    if (wallLength < 0.001) continue;

    const projectedPoint = closestPointOnSegment(endpoint, wall.start, wall.end);
    const endpointDistance = distance(endpoint, projectedPoint);

    if (!bestAttachment || endpointDistance < bestAttachment.distance) {
      bestAttachment = { wall, point: projectedPoint, distance: endpointDistance };
    }
  }

  return bestAttachment;
}

export function getPeninWallMovePreview(wall: Wall, structuralWalls: Wall[]): Wall {
  const startAttachment = getClosestPeninWallEndpointAttachment(wall.start, structuralWalls);
  const endAttachment = getClosestPeninWallEndpointAttachment(wall.end, structuralWalls);

  if (!startAttachment && !endAttachment) return wall;

  const useStartAttachment = Boolean(
    startAttachment && (!endAttachment || startAttachment.distance <= endAttachment.distance)
  );
  const attachment = useStartAttachment ? startAttachment : endAttachment;

  if (!attachment) return wall;

  const currentAnchorPoint = useStartAttachment ? wall.start : wall.end;
  const currentFreePoint = useStartAttachment ? wall.end : wall.start;
  const anchorDelta = sub(attachment.point, currentAnchorPoint);
  const desiredFreePoint = add(currentFreePoint, anchorDelta);
  const currentLength = distance(wall.start, wall.end);
  const nextLength = Math.max(GRID_SIZE / 2, currentLength);
  const hostDirection = normalize(sub(attachment.wall.end, attachment.wall.start));
  if (!vectorLength(hostDirection)) {
    return {
      ...wall,
      start: add(wall.start, anchorDelta),
      end: add(wall.end, anchorDelta),
    };
  }

  const normal = normalize(perp(hostDirection));
  const firstFreePoint = add(attachment.point, mul(normal, nextLength));
  const secondFreePoint = add(attachment.point, mul(normal, -nextLength));
  const freePoint = distance(firstFreePoint, desiredFreePoint) <= distance(secondFreePoint, desiredFreePoint)
    ? firstFreePoint
    : secondFreePoint;

  return useStartAttachment
    ? { ...wall, start: attachment.point, end: freePoint }
    : { ...wall, start: freePoint, end: attachment.point };
}

export function getPeninWallAttachmentPointForElevationWall(
  peninWall: Wall,
  wall: Wall,
  tolerance = Math.max(WALL_ATTACH_THRESHOLD, PENIN_WALL_THICKNESS)
): Point | null {
  const wallLength = distance(wall.start, wall.end);
  if (wallLength < 0.001) return null;

  for (const endpoint of [peninWall.start, peninWall.end]) {
    const projectedPoint = closestPointOnSegment(endpoint, wall.start, wall.end);
    const scalar = dot(sub(projectedPoint, wall.start), normalize(sub(wall.end, wall.start)));
    const endpointDistance = distance(endpoint, projectedPoint);

    if (endpointDistance <= tolerance && scalar >= -tolerance && scalar <= wallLength + tolerance) {
      return projectedPoint;
    }
  }

  return null;
}

export function getPeninWallElevationPlacementsForWall(
  wall: Wall,
  walls: Wall[]
): PeninWallElevationPlacement[] {
  const axis = getElevationWallAxis(wall);
  const wallLength = distance(wall.start, wall.end);
  if (wallLength < 0.001) return [];

  return walls
    .filter((candidate) => isPeninWall(candidate) && candidate.id !== wall.id)
    .map((peninWall): PeninWallElevationPlacement | null => {
      const peninLength = distance(peninWall.start, peninWall.end);
      if (peninLength < 0.001) return null;

      const peninDirection = normalize(sub(peninWall.end, peninWall.start));
      const attachmentPoint = getPeninWallAttachmentPointForElevationWall(peninWall, wall);
      if (!attachmentPoint) return null;

      // A peninsula wall is shown as a front-facing fixed panel on the wall it
      // attaches to. Parallel wall runs are not treated as peninsula faces.
      if (Math.abs(dot(peninDirection, axis.direction)) > 0.35) return null;

      const centerPixels = clamp(dot(sub(attachmentPoint, axis.start), axis.direction), 0, axis.length);
      const centerInches = pixelsToInches(centerPixels);
      const widthInches = Math.max(
        PENIN_WALL_ELEVATION_FACE_WIDTH_INCHES,
        pixelsToInches(PENIN_WALL_THICKNESS)
      );

      return {
        wall: peninWall,
        centerInches,
        startInches: centerInches - widthInches / 2,
        widthInches,
        heightInches: PENIN_WALL_ELEVATION_HEIGHT_INCHES,
        distanceFromFloorInches: 0,
      };
    })
    .filter((placement): placement is PeninWallElevationPlacement => Boolean(placement));
}

export function getElevationOpeningLayoutFromCenter(
  wallLengthInches: number,
  openingWidthPixels: number,
  centerInches: number
): ElevationOpeningLayout {
  const requestedWidthInches = pixelsToInches(openingWidthPixels);
  const halfWidthInches = Math.min(requestedWidthInches / 2, wallLengthInches / 2);
  const clampedCenterInches = clamp(
    centerInches,
    halfWidthInches,
    wallLengthInches - halfWidthInches
  );

  return {
    startInches: clampedCenterInches - halfWidthInches,
    centerInches: clampedCenterInches,
    widthInches: halfWidthInches * 2,
  };
}

export function ElevationPeninWallFace({
  x,
  y,
  width,
  height,
  selected = false,
  className,
  onPointerDown,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
  className?: string;
  onPointerDown?: (event: React.PointerEvent<SVGGElement>) => void;
}) {
  const inset = Math.max(7, Math.min(14, Math.min(width, height) * 0.12));
  const stroke = selected ? "#22bfd6" : "#111827";
  const strokeWidth = selected ? 3 : 2.25;
  return (
    <g className={className} onPointerDown={onPointerDown}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#f1ede4"
        stroke={stroke}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <rect
        x={x + inset}
        y={y + inset}
        width={Math.max(0, width - inset * 2)}
        height={Math.max(0, height - inset * 2)}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function ElevationPlacementOnWall({
  x,
  y,
  width,
  height,
  category,
  image,
  selected = false,
  invalid = false,
  placement,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  category: PlacementCategory;
  image?: PlacementImage;
  selected?: boolean;
  invalid?: boolean;
  placement?: PlacementElement;
}) {
  const outerStroke = invalid ? "#ef4444" : selected ? "#22bfd6" : "#111827";
  const outerStrokeWidth = selected ? 3 : 2;
  const innerStroke = invalid ? "#fca5a5" : selected ? "#67e8f9" : "#64748b";
  const placementImage = image ?? getDefaultPlacementImageForCategory(category);
  if (isAccessoryPlacementImage(placementImage)) {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={invalid ? "#fee2e2" : selected ? "#d9f8fd" : "#fafaf7"}
          stroke={innerStroke}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  const frontControlExtraInches =
    placement &&
    category === "base" &&
    placement.cooktopFixture === "front" &&
    !isProductPlacementImage(placementImage)
      ? Math.max(1, placement.cooktopFrontHeightInches ?? 6)
      : 0;
  const baseHeightInches = placement
    ? Math.max(1, getPlacementElevationSpec(placement, category).heightInches)
    : 0;
  const toeKickHeight =
    placement && placementHasToeKick(placement) && baseHeightInches > 0
      ? clamp((CABINET_TOE_KICK_HEIGHT_INCHES / baseHeightInches) * height, 0, Math.max(0, height - 1))
      : 0;
  const frontControlBlockHeight = frontControlExtraInches > 0 && baseHeightInches > 0
    ? clamp((frontControlExtraInches / baseHeightInches) * height, 0, height * 0.8)
    : 0;
  const bodyY = y;
  const bodyHeight = Math.max(1, height - toeKickHeight);
  const inset = Math.min(10, Math.max(4, Math.min(width, bodyHeight) * 0.08));
  const handleStroke = "#111827";
  const handleHeight = Math.min(bodyHeight * 0.42, Math.max(18, bodyHeight * 0.22));
  const handleTop = bodyY + bodyHeight / 2 - handleHeight / 2;
  const singleHandleX = x + width - inset - Math.max(6, width * 0.08);
  const renderStandaloneProduct = isStandaloneBaseProductElevationImage(placementImage);
  const innerX = x;
  const innerY = bodyY;
  const innerWidth = width;
  const innerHeight = bodyHeight;

  return (
    <g>
      {(selected || invalid) && (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="none"
          stroke={outerStroke}
          strokeWidth={outerStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {category !== "wall" ? (
        <ElevationBasePlacementDetails
          placement={placement}
          image={placementImage}
          x={x}
          y={bodyY}
          width={width}
          height={bodyHeight}
          inset={inset}
          innerX={innerX}
          innerY={innerY}
          innerWidth={innerWidth}
          innerHeight={innerHeight}
          innerStroke={innerStroke}
          handleStroke={handleStroke}
          handleTop={handleTop}
          handleHeight={handleHeight}
          singleHandleX={singleHandleX}
        />
      ) : (
        <ElevationWallPlacementDetails
          placement={placement}
          image={placementImage}
          x={x}
          y={bodyY}
          width={width}
          height={bodyHeight}
          innerX={innerX}
          innerY={innerY}
          innerWidth={innerWidth}
          innerHeight={innerHeight}
          innerStroke={innerStroke}
          handleStroke={handleStroke}
          handleTop={handleTop}
          handleHeight={handleHeight}
        />
      )}
      {toeKickHeight > 0 && (
        <rect
          x={x}
          y={y + height - toeKickHeight}
          width={width}
          height={toeKickHeight}
          fill="#f1ede4"
          stroke={innerStroke}
          strokeWidth="1.55"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {placement && (
        <ElevationPlacementAccessoryDetails
          placement={placement}
          x={x}
          y={bodyY}
          width={width}
          height={bodyHeight}
          innerStroke={innerStroke}
          handleStroke={handleStroke}
          frontControlBlockHeight={frontControlBlockHeight}
        />
      )}
    </g>
  );
}

export function ElevationWallPlacementDetails({
  placement,
  image,
  x,
  y,
  width,
  height,
  innerX,
  innerY,
  innerWidth,
  innerHeight,
  innerStroke,
  handleStroke,
  handleTop,
  handleHeight,
}: {
  placement?: PlacementElement;
  image: PlacementImage;
  x: number;
  y: number;
  width: number;
  height: number;
  innerX: number;
  innerY: number;
  innerWidth: number;
  innerHeight: number;
  innerStroke: string;
  handleStroke: string;
  handleTop: number;
  handleHeight: number;
}) {
  const handleOffsetFromCenter = Math.max(6, Math.min(16, width * 0.08));
  const leftCenterX = x + width / 2 - handleOffsetFromCenter;
  const rightCenterX = x + width / 2 + handleOffsetFromCenter;
  const panelFill = "#fafaf7";
  const panelGap = Math.max(2, Math.min(6, innerWidth * 0.04));
  const panelStrokeWidth = 1.5;

  const renderSingleDoorTopSection = (sectionHeight: number) => {
    const dividerY = innerY + sectionHeight;
    const panelInsetX = Math.max(4, innerWidth * 0.06);
    const panelInsetY = Math.max(3, sectionHeight * 0.12);
    const panelX = innerX + panelInsetX;
    const panelY = innerY + panelInsetY;
    const panelWidth = innerWidth - panelInsetX * 2;
    const panelHeight = Math.max(0, sectionHeight - panelInsetY * 2);
    const singleDoorHandleX = panelX + panelWidth - Math.max(6, panelWidth * 0.12);
    const singleDoorHandleHeight = Math.max(12, Math.min(24, panelHeight * 0.38));
    const singleDoorHandleTop = panelY + panelHeight * 0.42 - singleDoorHandleHeight / 2;

    return {
      dividerY,
      topSection: (
        <g>
          <line
            x1={innerX}
            y1={dividerY}
            x2={innerX + innerWidth}
            y2={dividerY}
            stroke={innerStroke}
            strokeWidth="1.35"
            vectorEffect="non-scaling-stroke"
          />
          <rect
            x={panelX}
            y={panelY}
            width={panelWidth}
            height={panelHeight}
            fill="none"
            stroke={innerStroke}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={singleDoorHandleX}
            y1={singleDoorHandleTop}
            x2={singleDoorHandleX}
            y2={singleDoorHandleTop + singleDoorHandleHeight}
            stroke={handleStroke}
            strokeWidth="1.8"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ),
    };
  };


  if (image === "base-refrigerator") {
    const bodyX = innerX;
    const bodyY = innerY;
    const bodyWidth = innerWidth;
    const bodyHeight = innerHeight;
    const panelInsetX = Math.max(2.2, bodyWidth * 0.035);
    const panelInsetY = Math.max(2.2, bodyHeight * 0.028);
    const panelX = bodyX + panelInsetX;
    const panelY = bodyY + panelInsetY;
    const panelWidth = bodyWidth - panelInsetX * 2;
    const panelHeight = bodyHeight - panelInsetY * 2;
    const topSectionHeight = panelHeight * 0.63;
    const freezerTopY = panelY + topSectionHeight;
    const centerGap = Math.max(1.5, panelWidth * 0.022);
    const doorWidth = panelWidth / 2 - centerGap / 2;
    const leftDoorX = panelX;
    const rightDoorX = panelX + doorWidth + centerGap;
    const handleTopY = panelY + topSectionHeight * 0.24;
    const handleBottomY = panelY + topSectionHeight * 0.72;
    const dispenserX = leftDoorX + doorWidth * 0.13;
    const dispenserY = panelY + topSectionHeight * 0.30;
    const dispenserWidth = doorWidth * 0.26;
    const dispenserHeight = topSectionHeight * 0.18;
    return (
      <g>
        <rect x={bodyX} y={bodyY} width={bodyWidth} height={bodyHeight} fill="#d1d5db" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <rect x={leftDoorX} y={panelY} width={doorWidth} height={topSectionHeight} fill="#d1d5db" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <rect x={rightDoorX} y={panelY} width={doorWidth} height={topSectionHeight} fill="#d1d5db" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <rect x={panelX} y={freezerTopY} width={panelWidth} height={panelHeight - topSectionHeight} fill="#d1d5db" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <rect x={dispenserX} y={dispenserY} width={dispenserWidth} height={dispenserHeight} rx="2" fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" opacity="0.55" vectorEffect="non-scaling-stroke" />
        <line x1={leftDoorX + doorWidth * 0.76} y1={handleTopY} x2={leftDoorX + doorWidth * 0.76} y2={handleBottomY} stroke={handleStroke} strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={rightDoorX + doorWidth * 0.24} y1={handleTopY} x2={rightDoorX + doorWidth * 0.24} y2={handleBottomY} stroke={handleStroke} strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={panelX} y1={freezerTopY} x2={panelX + panelWidth} y2={freezerTopY} stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (image === "wall-microwave") {
    const frameInset = Math.max(5, Math.min(10, width * 0.06));
    const frameX = innerX + frameInset;
    const frameY = innerY + frameInset;
    const frameWidth = innerWidth - frameInset * 2;
    const frameHeight = innerHeight - frameInset * 2;
    const controlWidth = Math.max(10, frameWidth * 0.18);
    return (
      <g>
        <rect x={frameX} y={frameY} width={frameWidth} height={frameHeight} rx="3" fill="#d1d5db" vectorEffect="non-scaling-stroke" />
        <rect x={frameX + frameWidth * 0.08} y={frameY + frameHeight * 0.18} width={frameWidth - controlWidth - frameWidth * 0.14} height={frameHeight * 0.64} rx="2" fill="#94a3b8" opacity="0.55" stroke="#64748b" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
        <rect x={frameX + frameWidth - controlWidth - 3} y={frameY + frameHeight * 0.12} width={controlWidth} height={frameHeight * 0.76} rx="2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        {Array.from({ length: 9 }).map((_, index) => {
          const col = index % 3;
          const row = Math.floor(index / 3);
          return <circle key={`mw-standalone-btn-${index}`} cx={frameX + frameWidth - controlWidth + 3 + col * (controlWidth / 4)} cy={frameY + frameHeight * 0.28 + row * (frameHeight * 0.13)} r="0.9" fill="#64748b" />;
        })}
      </g>
    );
  }

  if (image === "wall-double-oven") {
    const frameInset = Math.max(4, Math.min(8, width * 0.05));
    const frameX = innerX + frameInset;
    const frameY = innerY + frameInset;
    const frameWidth = innerWidth - frameInset * 2;
    const frameHeight = innerHeight - frameInset * 2;
    const ovenGap = Math.max(3, frameHeight * 0.045);
    const controlHeight = Math.max(5, frameHeight * 0.085);
    const ovenHeight = (frameHeight - ovenGap) / 2;

    const renderOven = (ovenY: number, index: number) => {
      const handleY = ovenY + controlHeight + Math.max(2, ovenHeight * 0.08);
      const windowY = ovenY + controlHeight + ovenHeight * 0.2;
      const windowHeight = ovenHeight * 0.42;
      return (
        <g key={`double-wall-oven-${index}`}>
          <rect
            x={frameX}
            y={ovenY}
            width={frameWidth}
            height={ovenHeight}
            rx="2"
            fill="#d1d5db"
            vectorEffect="non-scaling-stroke"
          />
          <rect
            x={frameX + frameWidth * 0.08}
            y={ovenY + controlHeight * 0.18}
            width={frameWidth * 0.84}
            height={controlHeight}
            rx="1.5"
            fill="#f8fafc"
            stroke="#94a3b8"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />
          {[0.18, 0.31, 0.69, 0.82].map((ratio) => (
            <circle
              key={`double-wall-oven-knob-${index}-${ratio}`}
              cx={frameX + frameWidth * ratio}
              cy={ovenY + controlHeight * 0.7}
              r={Math.max(1.1, frameWidth * 0.023)}
              fill={handleStroke}
            />
          ))}
          <rect
            x={frameX + frameWidth * 0.16}
            y={windowY}
            width={frameWidth * 0.68}
            height={windowHeight}
            rx="2"
            fill="#111827"
            opacity="0.72"
            stroke="#64748b"
            strokeWidth="0.9"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={frameX + frameWidth * 0.12}
            y1={handleY}
            x2={frameX + frameWidth * 0.88}
            y2={handleY}
            stroke={handleStroke}
            strokeWidth="1.7"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      );
    };

    return (
      <g>
        {renderOven(frameY, 0)}
        {renderOven(frameY + ovenHeight + ovenGap, 1)}
      </g>
    );
  }

  if (image === "wall-oven") {
    const frameInset = Math.max(4, Math.min(8, width * 0.05));
    const frameX = innerX + frameInset;
    const frameY = innerY + frameInset;
    const frameWidth = innerWidth - frameInset * 2;
    const frameHeight = innerHeight - frameInset * 2;
    const controlHeight = Math.max(5, frameHeight * 0.11);
    const handleY = frameY + controlHeight + Math.max(2, frameHeight * 0.1);
    const windowY = frameY + controlHeight + frameHeight * 0.22;
    const windowHeight = frameHeight * 0.34;
    return (
      <g>
        <rect
          x={frameX}
          y={frameY}
          width={frameWidth}
          height={frameHeight}
          rx="2"
          fill="#d1d5db"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={frameX + frameWidth * 0.08}
          y={frameY + controlHeight * 0.18}
          width={frameWidth * 0.84}
          height={controlHeight}
          rx="1.5"
          fill="#f8fafc"
          stroke="#94a3b8"
          strokeWidth="0.8"
          vectorEffect="non-scaling-stroke"
        />
        {[0.18, 0.31, 0.69, 0.82].map((ratio) => (
          <circle
            key={`single-wall-oven-knob-${ratio}`}
            cx={frameX + frameWidth * ratio}
            cy={frameY + controlHeight * 0.7}
            r={Math.max(1.1, frameWidth * 0.023)}
            fill={handleStroke}
          />
        ))}
        <rect
          x={frameX + frameWidth * 0.16}
          y={windowY}
          width={frameWidth * 0.68}
          height={windowHeight}
          rx="2"
          fill="#111827"
          opacity="0.72"
          stroke="#64748b"
          strokeWidth="0.9"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={frameX + frameWidth * 0.12}
          y1={handleY}
          x2={frameX + frameWidth * 0.88}
          y2={handleY}
          stroke={handleStroke}
          strokeWidth="1.7"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (image === "wall-hood") {
    const hoodTopWidth = innerWidth * 0.35;
    const hoodBottomWidth = innerWidth * 0.92;
    const hoodCenterX = innerX + innerWidth / 2;
    const chimneyY = innerY;
    const chimneyHeight = innerHeight * 0.42;
    const hoodY = innerY + chimneyHeight * 0.78;
    return (
      <g>
        <rect x={hoodCenterX - hoodTopWidth / 2} y={chimneyY} width={hoodTopWidth} height={chimneyHeight} fill="#e5e7eb" stroke={innerStroke} strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
        <path d={`M ${hoodCenterX - hoodTopWidth / 2} ${hoodY} L ${hoodCenterX + hoodTopWidth / 2} ${hoodY} L ${hoodCenterX + hoodBottomWidth / 2} ${innerY + innerHeight * 0.9} L ${hoodCenterX - hoodBottomWidth / 2} ${innerY + innerHeight * 0.9} Z`} fill="#d1d5db" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <rect x={hoodCenterX - hoodBottomWidth * 0.35} y={innerY + innerHeight * 0.86} width={hoodBottomWidth * 0.7} height={innerHeight * 0.04} rx="1.5" fill="#111827" opacity="0.85" />
      </g>
    );
  }

  if (image === "wall-blind-left" || image === "wall-blind-right") {
    return renderBlindCabinetElevationFront({
      placement,
      image,
      innerX,
      innerY,
      innerWidth,
      innerHeight,
      innerStroke,
      handleStroke,
      handleHeight,
    });
  }

  if (image === "pantry-one-door") {
    const panelX = innerX;
    const panelY = innerY;
    const panelWidth = innerWidth;
    const panelHeight = innerHeight;
    const singleDoorHandleX = panelX + panelWidth - Math.max(8, panelWidth * 0.14);

    return (
      <g>
        <rect
          x={panelX}
          y={panelY}
          width={panelWidth}
          height={panelHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={singleDoorHandleX}
          y1={panelY + panelHeight * 0.3}
          x2={singleDoorHandleX}
          y2={panelY + panelHeight * 0.3 + Math.min(handleHeight, panelHeight * 0.42)}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (image === "wall-one-door") {
    const panelX = innerX;
    const panelY = innerY;
    const panelWidth = innerWidth;
    const panelHeight = innerHeight;
    const singleDoorHandleX = panelX + panelWidth - Math.max(10, panelWidth * 0.16);

    return (
      <g>
        <rect
          x={panelX}
          y={panelY}
          width={panelWidth}
          height={panelHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={singleDoorHandleX}
          y1={panelY + panelHeight * 0.3}
          x2={singleDoorHandleX}
          y2={panelY + panelHeight * 0.3 + Math.min(handleHeight, panelHeight * 0.42)}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (image === "wall-microwave-one-door") {
    const topSectionHeight = innerHeight * 0.34;
    const { dividerY, topSection } = renderSingleDoorTopSection(topSectionHeight);
    const lowerSectionY = dividerY + Math.max(2, innerHeight * 0.03);
    const lowerSectionHeight = innerY + innerHeight - lowerSectionY - Math.max(2, innerHeight * 0.03);
    const microwaveInsetX = Math.max(4, innerWidth * 0.05);
    const microwaveX = innerX + microwaveInsetX;
    const microwaveWidth = innerWidth - microwaveInsetX * 2;
    const microwaveFrameHeight = Math.min(lowerSectionHeight * 0.8, microwaveWidth * 0.58);
    const microwaveFrameY = lowerSectionY + (lowerSectionHeight - microwaveFrameHeight) / 2;
    const doorWidth = microwaveWidth * 0.74;
    const controlWidth = microwaveWidth - doorWidth;
    const controlX = microwaveX + doorWidth;
    const glassInset = Math.max(2.8, microwaveWidth * 0.045);
    const glassX = microwaveX + glassInset;
    const glassY = microwaveFrameY + glassInset;
    const glassWidth = Math.max(0, doorWidth - glassInset * 1.55);
    const glassHeight = Math.max(0, microwaveFrameHeight - glassInset * 2);
    const keypadPaddingX = Math.max(2.1, controlWidth * 0.14);
    const keypadPaddingY = Math.max(2.4, microwaveFrameHeight * 0.09);
    const keypadX = controlX + keypadPaddingX;
    const keypadY = microwaveFrameY + keypadPaddingY;
    const keypadWidth = Math.max(0, controlWidth - keypadPaddingX * 2);
    const keypadHeight = Math.max(0, microwaveFrameHeight - keypadPaddingY * 2);
    const buttonCols = 3;
    const buttonRows = 4;
    const buttonGapX = Math.max(1.0, keypadWidth * 0.08);
    const buttonGapY = Math.max(1.2, keypadHeight * 0.07);
    const displayHeight = Math.max(3.2, keypadHeight * 0.16);
    const remainingButtonAreaHeight = Math.max(0, keypadHeight - displayHeight - buttonGapY * 1.4);
    const buttonWidth = Math.max(1.4, (keypadWidth - buttonGapX * (buttonCols - 1)) / buttonCols);
    const buttonHeight = Math.max(1.4, (remainingButtonAreaHeight - buttonGapY * (buttonRows - 1)) / buttonRows);

    return (
      <g>
        {topSection}
        <rect
          x={microwaveX}
          y={microwaveFrameY}
          width={microwaveWidth}
          height={microwaveFrameHeight}
          rx={Math.max(2, Math.min(4, width * 0.025))}
          fill="#d1d5db"
          stroke={innerStroke}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={glassX}
          y={glassY}
          width={glassWidth}
          height={glassHeight}
          rx={Math.max(1.6, Math.min(3.5, glassHeight * 0.08))}
          fill="#cad5df"
          stroke="#94a3b8"
          strokeWidth="0.95"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={glassX + glassWidth * 0.08}
          y={glassY + glassHeight * 0.12}
          width={glassWidth * 0.84}
          height={glassHeight * 0.76}
          rx={Math.max(1.4, Math.min(2.8, glassHeight * 0.06))}
          fill="#9aa7b5"
          opacity="0.42"
        />
        <line
          x1={controlX}
          y1={microwaveFrameY + 2}
          x2={controlX}
          y2={microwaveFrameY + microwaveFrameHeight - 2}
          stroke="#9ca3af"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={keypadX}
          y={keypadY}
          width={keypadWidth}
          height={displayHeight}
          rx="1.1"
          fill="#111827"
          opacity="0.86"
        />
        {Array.from({ length: buttonRows * buttonCols }).map((_, index) => {
          const column = index % buttonCols;
          const row = Math.floor(index / buttonCols);
          const buttonX = keypadX + column * (buttonWidth + buttonGapX);
          const buttonY = keypadY + displayHeight + buttonGapY * 1.4 + row * (buttonHeight + buttonGapY);
          return (
            <rect
              key={`mw-button-${index}`}
              x={buttonX}
              y={buttonY}
              width={buttonWidth}
              height={buttonHeight}
              rx="0.85"
              fill="#f8fafc"
              stroke="#9ca3af"
              strokeWidth="0.55"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </g>
    );
  }

  if (image === "wall-hood-one-door") {
    const topSectionHeight = innerHeight * 0.34;
    const { dividerY, topSection } = renderSingleDoorTopSection(topSectionHeight);
    const hoodTopY = dividerY + Math.max(1.5, innerHeight * 0.02);
    const hoodBottomY = y + height - 1;
    const hoodCenterX = x + width / 2;
    const topWidth = innerWidth * 0.44;
    const bottomWidth = width - 4;
    const topLeftX = hoodCenterX - topWidth / 2;
    const topRightX = hoodCenterX + topWidth / 2;
    const bottomLeftX = hoodCenterX - bottomWidth / 2;
    const bottomRightX = hoodCenterX + bottomWidth / 2;

    return (
      <g>
        {topSection}
        <path
          d={`M ${topLeftX} ${hoodTopY} L ${topRightX} ${hoodTopY} L ${bottomRightX} ${hoodBottomY} L ${bottomLeftX} ${hoodBottomY} Z`}
          fill="#d7dbe0"
          stroke={innerStroke}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  return (
    <g>
      <rect
        x={innerX}
        y={innerY}
        width={Math.max(0, innerWidth / 2 - panelGap / 2)}
        height={innerHeight}
        fill={panelFill}
        stroke={innerStroke}
        strokeWidth={panelStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <rect
        x={innerX + innerWidth / 2 + panelGap / 2}
        y={innerY}
        width={Math.max(0, innerWidth / 2 - panelGap / 2)}
        height={innerHeight}
        fill={panelFill}
        stroke={innerStroke}
        strokeWidth={panelStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={x + width / 2}
        y1={innerY}
        x2={x + width / 2}
        y2={innerY + innerHeight}
        stroke={innerStroke}
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={leftCenterX}
        y1={handleTop}
        x2={leftCenterX}
        y2={handleTop + handleHeight}
        stroke={handleStroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={rightCenterX}
        y1={handleTop}
        x2={rightCenterX}
        y2={handleTop + handleHeight}
        stroke={handleStroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function ElevationSinkFixture({
  x,
  y,
  width,
  height,
  innerStroke,
  fixtureScale = 1,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  innerStroke: string;
  fixtureScale?: number;
}) {
  const sinkCenterX = x + width / 2;
  const sinkY = y - Math.max(1.4, Math.min(4.5, height * 0.035));
  const sinkRadiusX = Math.max(8, Math.min(width * 0.2, 18));
  const sinkRadiusY = Math.max(2.2, Math.min(height * 0.04, 4.8));

  // Keep the faucet shape consistent across every sink cabinet.
  // Tool card previews can pass a smaller scale so the faucet fits inside the card image.
  const clampedFixtureScale = Math.max(0.55, Math.min(1, fixtureScale));
  const faucetWidth = 11 * clampedFixtureScale;
  const faucetHeight = 24 * clampedFixtureScale;
  const floatingLegHeight = 10 * clampedFixtureScale;
  const archLift = 3.5 * clampedFixtureScale;
  const faucetStrokeWidth = 4.8 * clampedFixtureScale;
  const faucetHighlightStrokeWidth = Math.max(0.8, clampedFixtureScale);
  const rightX = sinkCenterX + 2.5;
  const rightBottomY = sinkY - sinkRadiusY * 0.98;
  const rightTopY = rightBottomY - faucetHeight;
  const leftX = rightX - faucetWidth;
  const leftTopY = rightTopY + 2.8;
  const leftBottomY = leftTopY + floatingLegHeight;
  const archControlY = rightTopY - archLift;

  return (
    <g>
      <ellipse
        cx={sinkCenterX}
        cy={sinkY}
        rx={sinkRadiusX}
        ry={sinkRadiusY}
        fill="#f8fafc"
        stroke={innerStroke}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${rightX} ${rightBottomY} L ${rightX} ${rightTopY} C ${rightX} ${archControlY} ${leftX} ${archControlY} ${leftX} ${leftTopY} L ${leftX} ${leftBottomY}`}
        fill="none"
        stroke="#111827"
        strokeWidth={faucetStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${rightX - 0.8} ${rightBottomY - 0.2} L ${rightX - 0.8} ${rightTopY + 1.5} C ${rightX - 0.8} ${archControlY + 1.2} ${leftX + 0.8} ${archControlY + 1.2} ${leftX + 0.8} ${leftTopY + 1}`}
        fill="none"
        stroke="#475579"
        strokeWidth={faucetHighlightStrokeWidth}
        strokeLinecap="round"
        opacity="0.28"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function ElevationBasePlacementDetails({
  placement,
  image,
  x,
  y,
  width,
  height,
  inset: _inset,
  innerX,
  innerY,
  innerWidth,
  innerHeight,
  innerStroke,
  handleStroke,
  handleTop,
  handleHeight,
  singleHandleX,
}: {
  placement?: PlacementElement;
  image: PlacementImage;
  x: number;
  y: number;
  width: number;
  height: number;
  inset: number;
  innerX: number;
  innerY: number;
  innerWidth: number;
  innerHeight: number;
  innerStroke: string;
  handleStroke: string;
  handleTop: number;
  handleHeight: number;
  singleHandleX: number;
}) {
  const doorDividerX = x + width / 2;
  const handleOffsetFromCenter = Math.max(6, Math.min(16, width * 0.08));
  const leftHandleX = doorDividerX - handleOffsetFromCenter;
  const rightHandleX = doorDividerX + handleOffsetFromCenter;
  const drawerHandleWidth = Math.max(12, Math.min(34, width * 0.26));
  const drawerHandleX1 = x + width / 2 - drawerHandleWidth / 2;
  const drawerHandleX2 = x + width / 2 + drawerHandleWidth / 2;
  const panelFill = "#fafaf7";
  const panelStrokeWidth = 1.5;
  const panelGap = Math.max(2, Math.min(6, innerWidth * 0.04));

  const renderDoubleDoorLowerSection = (topY: number, lowerHeight: number) => {
    const leftPanelWidth = Math.max(0, innerWidth / 2 - panelGap / 2);
    const rightPanelX = innerX + innerWidth / 2 + panelGap / 2;
    return (
      <>
        <rect
          x={innerX}
          y={topY}
          width={leftPanelWidth}
          height={lowerHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={rightPanelX}
          y={topY}
          width={leftPanelWidth}
          height={lowerHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={doorDividerX}
          y1={topY}
          x2={doorDividerX}
          y2={topY + lowerHeight}
          stroke={innerStroke}
          strokeWidth="1.35"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={leftHandleX}
          y1={topY + lowerHeight * 0.3}
          x2={leftHandleX}
          y2={topY + lowerHeight * 0.3 + Math.min(handleHeight, lowerHeight * 0.42)}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={rightHandleX}
          y1={topY + lowerHeight * 0.3}
          x2={rightHandleX}
          y2={topY + lowerHeight * 0.3 + Math.min(handleHeight, lowerHeight * 0.42)}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </>
    );
  };

  const renderSinkBaseFront = (variant: "standard" | "farm") => {
    const topSectionHeight = innerHeight * 0.24;
    const lowerTop = innerY + topSectionHeight;
    const lowerHeight = innerHeight - topSectionHeight;
    const apronInsetX = Math.max(4, innerWidth * 0.09);
    const apronX = innerX + apronInsetX;
    const apronWidth = innerWidth - apronInsetX * 2;
    const apronHeight = Math.max(0, topSectionHeight * 0.86);
    const apronY = innerY + Math.max(1.5, topSectionHeight * 0.06);

    return (
      <g>
        {variant === "farm" ? (
          <path
            d={`M ${apronX} ${apronY} L ${apronX + apronWidth} ${apronY} L ${apronX + apronWidth} ${apronY + apronHeight * 0.72} Q ${innerX + innerWidth / 2} ${apronY + apronHeight} ${apronX} ${apronY + apronHeight * 0.72} Z`}
            fill="#f8fafc"
            stroke={innerStroke}
            strokeWidth={panelStrokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <rect
            x={innerX}
            y={innerY}
            width={innerWidth}
            height={topSectionHeight}
            fill={panelFill}
            stroke={innerStroke}
            strokeWidth={panelStrokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {renderDoubleDoorLowerSection(lowerTop, lowerHeight)}
      </g>
    );
  };

  const renderFullHeightSingleFront = (showBins = false) => (
    <g>
      <rect
        x={innerX}
        y={innerY}
        width={innerWidth}
        height={innerHeight}
        fill={panelFill}
        stroke={innerStroke}
        strokeWidth={panelStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      {showBins && (
        <>
          {[0.3, 0.7].map((ratio) => (
            <rect
              key={`trash-bin-${ratio}`}
              x={innerX + innerWidth * (ratio - 0.14)}
              y={innerY + innerHeight * 0.26}
              width={innerWidth * 0.22}
              height={innerHeight * 0.34}
              rx="2"
              fill="none"
              stroke={innerStroke}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </>
      )}
      <line
        x1={singleHandleX}
        y1={handleTop}
        x2={singleHandleX}
        y2={handleTop + handleHeight}
        stroke={handleStroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );

  if (image === "base-corner") {
    const returnSectionWidth = Math.max(12, Math.min(innerWidth * 0.24, 26));
    const mainSectionX = innerX + returnSectionWidth;
    const mainSectionWidth = Math.max(0, innerWidth - returnSectionWidth);
    const mainPanelInsetX = Math.max(4, mainSectionWidth * 0.05);
    const mainPanelInsetY = Math.max(4, innerHeight * 0.06);
    const mainPanelX = mainSectionX + mainPanelInsetX;
    const mainPanelY = innerY + mainPanelInsetY;
    const mainPanelWidth = Math.max(0, mainSectionWidth - mainPanelInsetX * 2);
    const mainPanelHeight = Math.max(0, innerHeight - mainPanelInsetY * 2);
    const returnPanelInsetX = Math.max(2.5, returnSectionWidth * 0.12);
    const returnPanelInsetY = Math.max(4, innerHeight * 0.08);
    const returnPanelX = innerX + returnPanelInsetX;
    const returnPanelY = innerY + returnPanelInsetY;
    const returnPanelWidth = Math.max(0, returnSectionWidth - returnPanelInsetX * 1.5);
    const returnPanelHeight = Math.max(0, innerHeight - returnPanelInsetY * 2);
    const mainDoorDividerX = mainPanelX + mainPanelWidth / 2;
    const leftDoorHandleX = mainDoorDividerX - Math.max(6, Math.min(13, mainPanelWidth * 0.11));
    const rightDoorHandleX = mainDoorDividerX + Math.max(6, Math.min(13, mainPanelWidth * 0.11));
    const seamY = innerY + Math.max(4, innerHeight * 0.1);
    const seamDrop = Math.max(5, Math.min(12, innerHeight * 0.14));
    const returnKnobR = Math.max(1.2, Math.min(2.2, width * 0.015));

    return (
      <g>
        <line
          x1={mainSectionX}
          y1={innerY}
          x2={mainSectionX}
          y2={innerY + innerHeight}
          stroke={innerStroke}
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={innerX + returnSectionWidth * 0.3}
          y1={seamY}
          x2={mainSectionX}
          y2={seamY + seamDrop}
          stroke={innerStroke}
          strokeWidth="1.15"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={returnPanelX}
          y={returnPanelY}
          width={returnPanelWidth}
          height={returnPanelHeight}
          fill="none"
          stroke={innerStroke}
          strokeWidth="1.15"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={returnPanelX + Math.max(3.5, returnPanelWidth * 0.2)}
          cy={returnPanelY + returnPanelHeight * 0.42}
          r={returnKnobR}
          fill={handleStroke}
        />
        <rect
          x={mainPanelX}
          y={mainPanelY}
          width={mainPanelWidth}
          height={mainPanelHeight}
          fill="none"
          stroke={innerStroke}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={mainDoorDividerX}
          y1={mainPanelY}
          x2={mainDoorDividerX}
          y2={mainPanelY + mainPanelHeight}
          stroke={innerStroke}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={leftDoorHandleX}
          y1={handleTop}
          x2={leftDoorHandleX}
          y2={handleTop + handleHeight}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={rightDoorHandleX}
          y1={handleTop}
          x2={rightDoorHandleX}
          y2={handleTop + handleHeight}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (image === "base-drawer") {
    return (
      <g>
        {Array.from({ length: 3 }, (_, index) => {
          const drawerY = innerY + (innerHeight * index) / 3;
          const drawerHeight = innerHeight / 3;
          const centerY = innerY + (innerHeight * (index + 0.5)) / 3;
          return (
            <g key={`elev-drawer-${index}`}>
              <rect
                x={innerX}
                y={drawerY}
                width={innerWidth}
                height={drawerHeight}
                fill={panelFill}
                stroke={innerStroke}
                strokeWidth={panelStrokeWidth}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={drawerHandleX1}
                y1={centerY}
                x2={drawerHandleX2}
                y2={centerY}
                stroke={handleStroke}
                strokeWidth="1.6"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
      </g>
    );
  }

  if (image === "base-sink-cabinet" || image === "base-farm-sink-cabinet") {
    return renderSinkBaseFront(image === "base-farm-sink-cabinet" ? "farm" : "standard");
  }


  if (image === "base-dishwasher") {
    const panelInset = Math.max(4, Math.min(8, width * 0.06));
    const panelX = innerX + panelInset;
    const panelY = innerY + panelInset;
    const panelWidth = innerWidth - panelInset * 2;
    const panelHeight = innerHeight - panelInset * 2;
    return (
      <g>
        <rect x={innerX} y={innerY} width={innerWidth} height={innerHeight} fill="#d1d5db" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <rect x={panelX} y={panelY} width={panelWidth} height={panelHeight} rx="2" fill="#e5e7eb" stroke="#94a3b8" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
        <rect x={panelX + panelWidth * 0.1} y={panelY + panelHeight * 0.08} width={panelWidth * 0.8} height={Math.max(4, panelHeight * 0.08)} rx="2" fill="#9ca3af" opacity="0.65" />
        <rect x={x} y={y + height * 0.88} width={width} height={height * 0.12} fill="#111827" opacity="0.9" />
      </g>
    );
  }

  if (image === "base-refrigerator") {
    const bodyX = innerX;
    const bodyY = innerY;
    const bodyWidth = innerWidth;
    const bodyHeight = innerHeight;
    const panelInsetX = Math.max(2.2, bodyWidth * 0.035);
    const panelInsetY = Math.max(2.2, bodyHeight * 0.028);
    const panelX = bodyX + panelInsetX;
    const panelY = bodyY + panelInsetY;
    const panelWidth = bodyWidth - panelInsetX * 2;
    const panelHeight = bodyHeight - panelInsetY * 2;
    const topSectionHeight = panelHeight * 0.63;
    const freezerTopY = panelY + topSectionHeight;
    const centerGap = Math.max(1.5, panelWidth * 0.022);
    const doorWidth = panelWidth / 2 - centerGap / 2;
    const leftDoorX = panelX;
    const rightDoorX = panelX + doorWidth + centerGap;
    const handleTopY = panelY + topSectionHeight * 0.24;
    const handleBottomY = panelY + topSectionHeight * 0.72;
    const dispenserX = leftDoorX + doorWidth * 0.14;
    const dispenserY = panelY + topSectionHeight * 0.32;
    const dispenserWidth = doorWidth * 0.24;
    const dispenserHeight = topSectionHeight * 0.2;
    return (
      <g>
        <rect x={bodyX} y={bodyY} width={bodyWidth} height={bodyHeight} fill="#d1d5db" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <rect x={leftDoorX} y={panelY} width={doorWidth} height={topSectionHeight} fill="#d1d5db" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <rect x={rightDoorX} y={panelY} width={doorWidth} height={topSectionHeight} fill="#d1d5db" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <rect x={panelX} y={freezerTopY} width={panelWidth} height={panelHeight - topSectionHeight} fill="#d1d5db" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <rect x={dispenserX} y={dispenserY} width={dispenserWidth} height={dispenserHeight} rx="2" fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" opacity="0.55" vectorEffect="non-scaling-stroke" />
        <line x1={leftDoorX + doorWidth * 0.76} y1={handleTopY} x2={leftDoorX + doorWidth * 0.76} y2={handleBottomY} stroke={handleStroke} strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={rightDoorX + doorWidth * 0.24} y1={handleTopY} x2={rightDoorX + doorWidth * 0.24} y2={handleBottomY} stroke={handleStroke} strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={panelX} y1={freezerTopY} x2={panelX + panelWidth} y2={freezerTopY} stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (image === "base-range") {
    const controlBottom = innerY + innerHeight * 0.2;
    const ovenX = innerX + innerWidth * 0.12;
    const ovenY = innerY + innerHeight * 0.42;
    const ovenWidth = innerWidth * 0.76;
    const ovenHeight = innerHeight * 0.38;
    return (
      <g>
        <rect x={innerX} y={innerY} width={innerWidth} height={innerHeight} fill="#e5e7eb" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <line x1={innerX} y1={controlBottom} x2={innerX + innerWidth} y2={controlBottom} stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        {[0.18,0.34,0.5,0.66,0.82].map((ratio) => <circle key={`range-elev-knob-${ratio}`} cx={innerX + innerWidth * ratio} cy={innerY + innerHeight * 0.1} r={Math.max(1.5, innerWidth * 0.025)} fill={handleStroke} />)}
        <rect x={ovenX} y={ovenY} width={ovenWidth} height={ovenHeight} rx="2" fill="#111827" opacity="0.64" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1={ovenX + ovenWidth * 0.15} y1={ovenY - innerHeight * 0.08} x2={ovenX + ovenWidth * 0.85} y2={ovenY - innerHeight * 0.08} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <rect x={innerX + innerWidth * 0.08} y={innerY + innerHeight * 0.24} width={innerWidth * 0.84} height={innerHeight * 0.12} rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (image === "base-appliance") {
    return (
      <g>
        <rect x={innerX + innerWidth * 0.12} y={innerY + innerHeight * 0.22} width={innerWidth * 0.76} height={innerHeight * 0.42} fill="none" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <line x1={innerX + innerWidth * 0.18} y1={innerY + innerHeight * 0.14} x2={innerX + innerWidth * 0.82} y2={innerY + innerHeight * 0.14} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={x} y1={y + height * 0.78} x2={x + width} y2={y + height * 0.78} stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <circle cx={x + width / 2} cy={y + height * 0.88} r={Math.max(1.4, Math.min(3, width * 0.025))} fill="#6b7280" />
      </g>
    );
  }

  if (image === "base-oven-bottom-drawer" || image === "base-microwave-bottom-drawer") {
    const {
      totalHeightInches,
      bottomDrawerHeightInches,
      productHeightInches,
      fillerHeightInches,
    } = getOvenCabinetHeightSegments(placement ?? { heightInches: 36 });
    const fillerHeight = totalHeightInches > 0 ? (fillerHeightInches / totalHeightInches) * innerHeight : 0;
    const drawerHeight = totalHeightInches > 0 ? (bottomDrawerHeightInches / totalHeightInches) * innerHeight : 0;
    const productHeight = Math.max(0, innerHeight - fillerHeight - drawerHeight);
    const fillerBottom = innerY + fillerHeight;
    const productY = fillerBottom;
    const drawerTop = innerY + innerHeight - drawerHeight;
    const productX = innerX;
    const productWidth = innerWidth;
    const productInnerX = productX + productWidth * 0.12;
    const drawerHandleWidth = Math.max(10, Math.min(28, innerWidth * 0.28));
    const productLayout =
      placement?.ovenCabinetProductLayout ??
      getDefaultBottomDrawerProductLayout(image) ??
      "none";

    const renderSingleOven = (ovenY: number, ovenHeight: number, key: string) => (
      <g key={key}>
        <rect x={productX} y={ovenY} width={productWidth} height={ovenHeight} rx={Math.max(2, Math.min(6, width * 0.03))} fill="#d1d5db" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <rect x={productInnerX} y={ovenY + ovenHeight * 0.16} width={productWidth * 0.76} height={ovenHeight * 0.6} rx={Math.max(2, Math.min(5, height * 0.02))} fill="#eceff3" stroke="#9ca3af" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1={productX + productWidth * 0.22} y1={ovenY + ovenHeight * 0.08} x2={productX + productWidth * 0.78} y2={ovenY + ovenHeight * 0.08} stroke="#6b7280" strokeWidth="1.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );

    const renderMicrowave = (microwaveY: number, microwaveHeight: number) => (
      <g>
        <rect x={productX} y={microwaveY} width={productWidth} height={microwaveHeight} rx="2" fill="#d1d5db" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <rect x={productX + productWidth * 0.08} y={microwaveY + microwaveHeight * 0.18} width={productWidth * 0.54} height={microwaveHeight * 0.46} rx="2" fill="#94a3b8" opacity="0.55" stroke="#64748b" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
        <rect x={productX + productWidth * 0.68} y={microwaveY + microwaveHeight * 0.12} width={productWidth * 0.18} height={microwaveHeight * 0.62} rx="2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      </g>
    );

    return (
      <g>
        {fillerHeight > 0 && (
          <rect x={innerX} y={innerY} width={innerWidth} height={fillerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        )}
        {productHeight > 0 && productLayout === "none" && (
          <rect
            x={productX}
            y={productY}
            width={productWidth}
            height={productHeight}
            fill="#111827"
            stroke={innerStroke}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {productHeight > 0 && productLayout === "single-oven" && renderSingleOven(productY, productHeight, "single-oven")}
        {productHeight > 0 && productLayout === "double-oven" && (
          <>
            {renderSingleOven(productY, productHeight / 2 - 1, "double-oven-top")}
            {renderSingleOven(productY + productHeight / 2 + 1, productHeight / 2 - 1, "double-oven-bottom")}
          </>
        )}
        {productHeight > 0 && productLayout === "single-microwave" && renderMicrowave(productY, productHeight)}
        {productHeight > 0 && productLayout === "microwave-oven" && (() => {
          const microwaveHeight = Math.min(productHeight * 0.42, productHeight * 0.48);
          const ovenHeight = Math.max(productHeight - microwaveHeight - 2, productHeight * 0.5);
          return (
            <>
              {renderMicrowave(productY, microwaveHeight)}
              {renderSingleOven(productY + microwaveHeight + 2, ovenHeight, "microwave-oven-bottom")}
            </>
          );
        })()}
        <rect x={innerX} y={drawerTop} width={innerWidth} height={drawerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        <line x1={x + width / 2 - drawerHandleWidth / 2} y1={drawerTop + drawerHeight * 0.5} x2={x + width / 2 + drawerHandleWidth / 2} y2={drawerTop + drawerHeight * 0.5} stroke={handleStroke} strokeWidth="1.55" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (image === "base-two-door-one-drawer" || image === "base-one-door-one-drawer" || image === "base-two-door-two-drawer") {
    const isSingleDoor = image === "base-one-door-one-drawer";
    const hasTwoDrawers = image === "base-two-door-two-drawer";
    const drawerBottom = innerY + innerHeight * 0.24;
    const drawerMidX = innerX + innerWidth / 2;
    const drawerHandleY = innerY + innerHeight * 0.12;
    const drawerHandleWidthLocal = Math.max(8, Math.min(24, innerWidth * 0.2));
    const doorTop = drawerBottom;
    const doorHeight = innerY + innerHeight - doorTop;
    const leftPanelWidth = Math.max(0, innerWidth / 2 - panelGap / 2);
    const rightPanelX = innerX + innerWidth / 2 + panelGap / 2;

    return (
      <g>
        {hasTwoDrawers ? (
          <>
            <rect x={innerX} y={innerY} width={innerWidth / 2} height={drawerBottom - innerY} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
            <rect x={drawerMidX} y={innerY} width={innerWidth / 2} height={drawerBottom - innerY} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
          </>
        ) : (
          <rect x={innerX} y={innerY} width={innerWidth} height={drawerBottom - innerY} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        )}
        {hasTwoDrawers ? (
          <>
            <line x1={innerX + innerWidth * 0.15} y1={drawerHandleY} x2={innerX + innerWidth * 0.35} y2={drawerHandleY} stroke={handleStroke} strokeWidth="1.45" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <line x1={innerX + innerWidth * 0.65} y1={drawerHandleY} x2={innerX + innerWidth * 0.85} y2={drawerHandleY} stroke={handleStroke} strokeWidth="1.45" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </>
        ) : (
          <line x1={x + width / 2 - drawerHandleWidthLocal / 2} y1={drawerHandleY} x2={x + width / 2 + drawerHandleWidthLocal / 2} y2={drawerHandleY} stroke={handleStroke} strokeWidth="1.45" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        )}
        {isSingleDoor ? (
          <rect x={innerX} y={doorTop} width={innerWidth} height={doorHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        ) : (
          <>
            <rect x={innerX} y={doorTop} width={leftPanelWidth} height={doorHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
            <rect x={rightPanelX} y={doorTop} width={leftPanelWidth} height={doorHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
          </>
        )}
        {!isSingleDoor && (
          <line x1={doorDividerX} y1={doorTop} x2={doorDividerX} y2={doorTop + doorHeight} stroke={innerStroke} strokeWidth="1.35" vectorEffect="non-scaling-stroke" />
        )}
        {isSingleDoor ? (
          <line x1={singleHandleX} y1={doorTop + doorHeight * 0.3} x2={singleHandleX} y2={doorTop + doorHeight * 0.3 + Math.min(handleHeight, doorHeight * 0.42)} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ) : (
          <>
            <line x1={leftHandleX} y1={doorTop + doorHeight * 0.3} x2={leftHandleX} y2={doorTop + doorHeight * 0.3 + Math.min(handleHeight, doorHeight * 0.42)} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <line x1={rightHandleX} y1={doorTop + doorHeight * 0.3} x2={rightHandleX} y2={doorTop + doorHeight * 0.3 + Math.min(handleHeight, doorHeight * 0.42)} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </g>
    );
  }

  if (image === "base-two-drawer" || image === "base-four-drawer") {
    const drawerCount = image === "base-two-drawer" ? 2 : 4;
    return (
      <g>
        {Array.from({ length: drawerCount }, (_, index) => {
          const drawerY = innerY + (innerHeight * index) / drawerCount;
          const drawerHeight = innerHeight / drawerCount;
          const centerY = innerY + (innerHeight * (index + 0.5)) / drawerCount;
          const localHandleWidth = Math.max(10, Math.min(28, innerWidth * 0.32));
          return (
            <g key={`elev-new-drawer-pull-${index}`}>
              <rect
                x={innerX}
                y={drawerY}
                width={innerWidth}
                height={drawerHeight}
                fill={panelFill}
                stroke={innerStroke}
                strokeWidth={panelStrokeWidth}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={x + width / 2 - localHandleWidth / 2}
                y1={centerY}
                x2={x + width / 2 + localHandleWidth / 2}
                y2={centerY}
                stroke={handleStroke}
                strokeWidth="1.55"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
      </g>
    );
  }

  if (image === "base-spice-rack") {
    return renderFullHeightSingleFront(false);
  }

  if (image === "base-trash-can") {
    return renderFullHeightSingleFront(true);
  }

  if (
    image === "base-blind-left-one-drawer" ||
    image === "base-blind-right-one-drawer" ||
    image === "base-blind-left" ||
    image === "base-blind-right"
  ) {
    return renderBlindCabinetElevationFront({
      placement,
      image,
      innerX,
      innerY,
      innerWidth,
      innerHeight,
      innerStroke,
      handleStroke,
      handleHeight,
    });
  }

  if (image === "base" || image === "pantry-two-door") {
    const panelWidth = Math.max(0, innerWidth / 2 - panelGap / 2);
    return (
      <g>
        <rect
          x={innerX}
          y={innerY}
          width={panelWidth}
          height={innerHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={innerX + innerWidth / 2 + panelGap / 2}
          y={innerY}
          width={panelWidth}
          height={innerHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <line x1={doorDividerX} y1={innerY} x2={doorDividerX} y2={innerY + innerHeight} stroke={innerStroke} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        <line x1={leftHandleX} y1={handleTop} x2={leftHandleX} y2={handleTop + handleHeight} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={rightHandleX} y1={handleTop} x2={rightHandleX} y2={handleTop + handleHeight} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  return (
    <g>
      <rect
        x={innerX}
        y={innerY}
        width={innerWidth}
        height={innerHeight}
        fill={panelFill}
        stroke={innerStroke}
        strokeWidth={panelStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <line x1={singleHandleX} y1={handleTop} x2={singleHandleX} y2={handleTop + handleHeight} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
}

export function renderBlindCabinetElevationFront(params: {
  placement?: PlacementElement;
  image: PlacementImage;
  innerX: number;
  innerY: number;
  innerWidth: number;
  innerHeight: number;
  innerStroke: string;
  handleStroke: string;
  handleHeight: number;
}) {
  const {
    placement,
    image,
    innerX,
    innerY,
    innerWidth,
    innerHeight,
    innerStroke,
    handleStroke,
    handleHeight,
  } = params;
  const panelFill = "#fafaf7";
  const panelStrokeWidth = 1.5;
  const widthScale = innerWidth / Math.max(1, placement?.width ? pixelsToInches(placement.width) : innerWidth);
  const blindWidths = placement
    ? getBlindCabinetWidthSegments(placement)
    : {
        widthInches: innerWidth,
        doorWidthInches: innerWidth * 0.36,
        fillerWidthInches: 3,
        blindWidthInches: innerWidth * 0.64,
        side: getBlindCabinetSide(image),
      };
  const side = blindWidths.side ?? "left";
  const doorWidth = blindWidths.doorWidthInches * widthScale;
  const fillerWidth = blindWidths.fillerWidthInches * widthScale;
  const blindWidth = Math.max(0, innerWidth - doorWidth - fillerWidth);

  if (side === "right") {
    const doorX = innerX;
    const fillerX = doorX + doorWidth;
    const blindX = fillerX + fillerWidth;
    const doorHandleX = doorX + Math.max(7, doorWidth * 0.16);
    return (
      <g>
        <rect x={blindX} y={innerY} width={blindWidth} height={innerHeight} fill="#111827" stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        <rect x={fillerX} y={innerY} width={fillerWidth} height={innerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        <rect x={doorX} y={innerY} width={doorWidth} height={innerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        <line x1={doorHandleX} y1={innerY + innerHeight * 0.28} x2={doorHandleX} y2={innerY + innerHeight * 0.28 + Math.min(handleHeight, innerHeight * 0.42)} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  const blindX = innerX;
  const fillerX = blindX + blindWidth;
  const doorX = fillerX + fillerWidth;
  const doorHandleX = doorX + doorWidth - Math.max(7, doorWidth * 0.16);
  return (
    <g>
      <rect x={blindX} y={innerY} width={blindWidth} height={innerHeight} fill="#111827" stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
      <rect x={fillerX} y={innerY} width={fillerWidth} height={innerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
      <rect x={doorX} y={innerY} width={doorWidth} height={innerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
      <line x1={doorHandleX} y1={innerY + innerHeight * 0.28} x2={doorHandleX} y2={innerY + innerHeight * 0.28 + Math.min(handleHeight, innerHeight * 0.42)} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
}

export function getPlacementWallAttachments(
  placementItem: Pick<PlacementElement, "center" | "width" | "depth" | "rotation">,
  walls: Wall[],
  tolerance = Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 6)
): PlacementWallAttachment[] {
  const corners = getRotatedRectCorners(
    placementItem.center,
    placementItem.width,
    placementItem.depth,
    placementItem.rotation
  );
  const widthEdges = [
    { start: corners[0], end: corners[1] },
    { start: corners[3], end: corners[2] },
  ];
  const wallFaceOffset = WALL_THICKNESS / 2;
  const parallelTolerance = 0.08;
  const attachments: PlacementWallAttachment[] = [];

  for (const wall of walls.filter(isThickWall)) {
    const axis = getElevationWallAxis(wall);
    if (axis.length < 0.001) continue;
    const segmentGeometry = getWallSegmentBlackDotGeometry(
      wall.start,
      wall.end,
      walls.filter(isThickWall)
    );

    for (const edge of widthEdges) {
      const edgeLength = distance(edge.start, edge.end);
      if (edgeLength < 0.001) continue;

      const edgeDirection = normalize(sub(edge.end, edge.start));
      const parallelAmount = Math.abs(cross(edgeDirection, axis.direction));
      if (parallelAmount > parallelTolerance) continue;

      const sideDistanceStart = dot(sub(edge.start, axis.start), axis.normal);
      const sideDistanceEnd = dot(sub(edge.end, axis.start), axis.normal);
      if (Math.abs(sideDistanceStart - sideDistanceEnd) > tolerance) continue;

      const sideDistance = (sideDistanceStart + sideDistanceEnd) / 2;
      const projectionA = dot(sub(edge.start, axis.start), axis.direction);
      const projectionB = dot(sub(edge.end, axis.start), axis.direction);
      const rawStartProjection = Math.min(projectionA, projectionB);
      const rawEndProjection = Math.max(projectionA, projectionB);
      const attachedStartProjection = clamp(rawStartProjection, 0, axis.length);
      const attachedEndProjection = clamp(rawEndProjection, 0, axis.length);
      const overlap = attachedEndProjection - attachedStartProjection;
      if (overlap <= Math.max(1, edgeLength * 0.2)) continue;

      for (const faceSign of [-1, 1] as const) {
        const faceDistance = faceSign * wallFaceOffset;
        const gap = sideDistance - faceDistance;
        if (Math.abs(gap) > tolerance) continue;
        const wallFace: WallFaceSide = faceSign === 1 ? "left" : "right";
        const faceStartAnchor =
          wallFace === "left"
            ? segmentGeometry.startLeft
            : segmentGeometry.startRight;
        const faceEndAnchor =
          wallFace === "left"
            ? segmentGeometry.endLeft
            : segmentGeometry.endRight;
        const faceStartScalar = dot(
          sub(faceStartAnchor, axis.start),
          axis.direction
        );
        const faceEndScalar = dot(sub(faceEndAnchor, axis.start), axis.direction);
        const faceIntervalStart = Math.min(faceStartScalar, faceEndScalar);
        const faceIntervalEnd = Math.max(faceStartScalar, faceEndScalar);
        const faceIntervalLength = faceIntervalEnd - faceIntervalStart;
        if (faceIntervalLength <= 0.5) continue;

        const displayWidthPixels = Math.min(
          rawEndProjection - rawStartProjection,
          faceIntervalLength
        );
        if (displayWidthPixels <= 0.5) continue;

        let startProjection = rawStartProjection;
        let endProjection = rawEndProjection;

        if (displayWidthPixels >= faceIntervalLength) {
          startProjection = faceIntervalStart;
          endProjection = faceIntervalEnd;
        } else {
          if (startProjection < faceIntervalStart) {
            endProjection += faceIntervalStart - startProjection;
            startProjection = faceIntervalStart;
          }

          if (endProjection > faceIntervalEnd) {
            startProjection -= endProjection - faceIntervalEnd;
            endProjection = faceIntervalEnd;
          }

          startProjection = clamp(
            startProjection,
            faceIntervalStart,
            faceIntervalEnd - displayWidthPixels
          );
          endProjection = startProjection + displayWidthPixels;
        }

        // Only bind to the left/right end of the elevation wall when the cabinet
        // is truly almost touching that end. The old threshold used the wall
        // attachment tolerance, which was intentionally large and made cabinets
        // jump to the rectangle edge even when the user wanted to leave a small
        // reveal/gap near the left or right side of the elevation wall.
        const wallEndBindThreshold = inchesToPixels(0.35);
        if (startProjection - faceIntervalStart <= wallEndBindThreshold) {
          startProjection = faceIntervalStart;
          endProjection = Math.min(
            faceIntervalStart + displayWidthPixels,
            faceIntervalEnd
          );
        } else if (faceIntervalEnd - endProjection <= wallEndBindThreshold) {
          endProjection = faceIntervalEnd;
          startProjection = Math.max(
            faceIntervalStart,
            faceIntervalEnd - displayWidthPixels
          );
        }

        const centerSideDistance = dot(sub(placementItem.center, axis.start), axis.normal);
        const depthFromWallFace = Math.max(
          0,
          Math.abs(centerSideDistance - faceDistance) - placementItem.depth / 2
        );

        attachments.push({
          wall,
          wallFace,
          startProjection,
          endProjection,
          depthFromWallFace,
          overlap,
          gap: Math.abs(gap),
        });
      }
    }
  }

  return attachments.sort((left, right) => {
    if (Math.abs(left.gap - right.gap) > 0.001) return left.gap - right.gap;
    if (Math.abs(left.depthFromWallFace - right.depthFromWallFace) > 0.001) {
      return left.depthFromWallFace - right.depthFromWallFace;
    }
    return right.overlap - left.overlap;
  });
}

export function getBestPlacementWallAttachment(
  placementItem: Pick<PlacementElement, "center" | "width" | "depth" | "rotation">,
  walls: Wall[],
  tolerance = Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 6)
): PlacementWallAttachment | null {
  return getPlacementWallAttachments(placementItem, walls, tolerance)[0] ?? null;
}

export function getPlacementElevationItemsForWall(
  wall: Wall,
  placements: PlacementElement[],
  walls: Wall[] = []
): PlacementElevationItem[] {
  const axis = getElevationWallAxis(wall);
  const wallLength = axis.length;
  if (wallLength < 0.001) return [];

  const allWalls = walls.length ? walls.filter(isThickWall) : [wall];
  const projectedFace = getWallProjectedFaceForElevation(wall, allWalls);
  if (!projectedFace) return [];
  const attachmentTolerance = Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8);

  const placementElevationItems = placements
    .map((placementItem) => {
      // Prefer the persisted wall id, the same way doors/windows do. For older
      // saved cabinets that do not yet have wallId, infer it from the cabinet
      // edge that is actually touching a wall face. This avoids projecting a
      // cabinet from the opposite wall into the current elevation while still
      // allowing valid cabinets to appear.
      if (placementItem.wallId && placementItem.wallId !== wall.id) return null;

      const category = getPlacementElevationCategory(placementItem);
      const attachments = getPlacementWallAttachments(placementItem, allWalls, attachmentTolerance);
      const placementWallFace = getPlacementWallFaceOnWall(placementItem, wall, allWalls);
      if (placementWallFace && placementWallFace !== projectedFace) return null;
      const attachment = attachments.find(
        (candidate) =>
          candidate.wall.id === wall.id && candidate.wallFace === projectedFace
      ) ?? null;
      const supportedWall = isElevationFloatingPlacement(placementItem)
        ? getWallPlacementSupportedWall(placementItem, placements, allWalls, placementItem.id)
        : null;

      if (!attachment && supportedWall?.id !== wall.id) return null;
      if (!attachment && !supportedWall) return null;
      if (!placementItem.wallId && attachment) {
        const bestAttachment = attachments[0] ?? null;
        if (
          !bestAttachment ||
          bestAttachment.wall.id !== wall.id ||
          bestAttachment.wallFace !== projectedFace
        ) {
          return null;
        }
      }

      const projection = attachment
        ? {
            startProjection: attachment.startProjection,
            endProjection: attachment.endProjection,
            depthFromWallFace: attachment.depthFromWallFace,
          }
        : getPlacementProjectionOnWallAxis(placementItem, wall);

      if (!projection) return null;

      const widthPixels = projection.endProjection - projection.startProjection;
      if (widthPixels <= 0.5) return null;

      const spec = getPlacementElevationSpec(placementItem, category);

      return {
        placement: placementItem,
        category,
        startInches: pixelsToInches(projection.startProjection),
        widthInches: pixelsToInches(widthPixels),
        heightInches: spec.heightInches,
        distanceFromFloorInches: spec.distanceFromFloorInches,
        depthFromWallInches: pixelsToInches(Math.max(0, projection.depthFromWallFace)),
      };
    })
    .filter((placement): placement is PlacementElevationItem => Boolean(placement));

  // Each cabinet elevation position must stay tied to that cabinet's own
  // floor-plan projection. Do not auto-stack here. Wall-cabinet stack spacing is
  // applied once at placement time and then stored on the cabinet, so later
  // manual elevation edits do not get overwritten by a render-time equalizer.
  return placementElevationItems.sort((left, right) => {
    if (left.depthFromWallInches !== right.depthFromWallInches) {
      return left.depthFromWallInches - right.depthFromWallInches;
    }

    if (left.distanceFromFloorInches !== right.distanceFromFloorInches) {
      return left.distanceFromFloorInches - right.distanceFromFloorInches;
    }

    return left.startInches - right.startInches;
  });
}

export function stackOverlappingWallPlacements(
  placements: PlacementElevationItem[],
  wallHeightInches = DEFAULT_ELEVATION_WALL_HEIGHT_INCHES,
  targetPlacementId?: string
): PlacementElevationItem[] {
  const nextPlacements = placements.map((placement) => ({ ...placement }));
  const depthPathToleranceInches = 3;
  const overlapToleranceInches = 0.25;

  const horizontalOverlap = (first: PlacementElevationItem, second: PlacementElevationItem) => {
    const firstStart = first.startInches;
    const firstEnd = first.startInches + first.widthInches;
    const secondStart = second.startInches;
    const secondEnd = second.startInches + second.widthInches;
    return Math.min(firstEnd, secondEnd) - Math.max(firstStart, secondStart);
  };

  const sameDepthPath = (first: PlacementElevationItem, second: PlacementElevationItem) =>
    Math.abs(first.depthFromWallInches - second.depthFromWallInches) <= depthPathToleranceInches;

  const wallPlacementIndexes = nextPlacements
    .map((placement, index) => ({ placement, index }))
    .filter(({ placement }) => placement.category === "wall")
    .map(({ index }) => index);

  const visited = new Set<number>();

  wallPlacementIndexes.forEach((startIndex) => {
    if (visited.has(startIndex)) return;

    const group: number[] = [];
    const queue = [startIndex];
    visited.add(startIndex);

    while (queue.length) {
      const currentIndex = queue.shift() as number;
      const currentPlacement = nextPlacements[currentIndex];
      group.push(currentIndex);

      wallPlacementIndexes.forEach((candidateIndex) => {
        if (visited.has(candidateIndex)) return;

        const candidatePlacement = nextPlacements[candidateIndex];
        if (!sameDepthPath(currentPlacement, candidatePlacement)) return;
        if (horizontalOverlap(currentPlacement, candidatePlacement) <= overlapToleranceInches) return;

        visited.add(candidateIndex);
        queue.push(candidateIndex);
      });
    }

    if (
      targetPlacementId &&
      !group.some((index) => nextPlacements[index].placement.id === targetPlacementId)
    ) {
      return;
    }

    const groupPlacements = group.map((index) => nextPlacements[index]);
    const groupStart = Math.min(...groupPlacements.map((placement) => placement.startInches));
    const groupEnd = Math.max(...groupPlacements.map((placement) => placement.startInches + placement.widthInches));
    const groupDepth = groupPlacements.reduce((sum, placement) => sum + placement.depthFromWallInches, 0) / groupPlacements.length;

    const groundObstacles = nextPlacements.filter((placement) => {
      if (placement.category === "wall") return false;
      if (Math.abs(placement.depthFromWallInches - groupDepth) > depthPathToleranceInches) return false;

      const placementStart = placement.startInches;
      const placementEnd = placement.startInches + placement.widthInches;
      return Math.min(groupEnd, placementEnd) - Math.max(groupStart, placementStart) > overlapToleranceInches;
    });

    const bottomLimitInches = Math.max(
      0,
      ...groundObstacles.map(
        (placement) => placement.distanceFromFloorInches + placement.heightInches
      )
    );

    const shouldAutoStack = group.length > 1 || bottomLimitInches > 0;
    if (!shouldAutoStack) return;

    const totalStackHeight = groupPlacements.reduce(
      (sum, placement) => sum + placement.heightInches,
      0
    );
    const availableHeight = Math.max(0, wallHeightInches - bottomLimitInches);

    if (totalStackHeight > availableHeight + 0.001) {
      const message = "Not enough vertical wall space to add another wall cabinet in this stack.";
      group.forEach((index) => {
        nextPlacements[index].stackOverflow = true;
        nextPlacements[index].stackOverflowMessage = message;
      });
      return;
    }

    const sortedGroup = group.slice().sort((leftIndex, rightIndex) => {
      const left = nextPlacements[leftIndex];
      const right = nextPlacements[rightIndex];
      if (left.distanceFromFloorInches !== right.distanceFromFloorInches) {
        return left.distanceFromFloorInches - right.distanceFromFloorInches;
      }
      return placements.findIndex((placement) => placement.placement.id === left.placement.id) -
        placements.findIndex((placement) => placement.placement.id === right.placement.id);
    });

    const gap = (availableHeight - totalStackHeight) / (sortedGroup.length + 1);
    let nextDistanceFromFloor = bottomLimitInches + gap;

    sortedGroup.forEach((index) => {
      const placement = nextPlacements[index];
      placement.distanceFromFloorInches = nextDistanceFromFloor;
      nextDistanceFromFloor += placement.heightInches + gap;
    });
  });

  return nextPlacements;
}

export function getWallPlacementStackOverflowMessage(
  placements: PlacementElement[],
  walls: Wall[],
  targetPlacementId?: string
) {
  const stackResult = resolveWallPlacementStackPlacement(
    placements,
    walls,
    targetPlacementId
  );

  return stackResult.message ?? null;
}

export function applyWallPlacementStackSpacingOnPlacement(
  placements: PlacementElement[],
  walls: Wall[],
  placedPlacementId: string
): WallPlacementStackPlacementResult {
  return resolveWallPlacementStackPlacement(placements, walls, placedPlacementId);
}

export function resolveWallPlacementStackPlacement(
  placements: PlacementElement[],
  walls: Wall[],
  placedPlacementId?: string
): WallPlacementStackPlacementResult {
  const placedPlacementElement = placedPlacementId
    ? placements.find((placementItem) => placementItem.id === placedPlacementId)
    : null;

  if (!placedPlacementElement || getPlacementElevationCategory(placedPlacementElement) !== "wall") {
    return { placements };
  }

  const thickWalls = walls.filter(isThickWall);
  const nextPlacements = placements.map((placementItem) => ({ ...placementItem }));
  const depthPathToleranceInches = 3;
  const overlapToleranceInches = 0.25;

  for (const wall of thickWalls) {
    const wallPlacementItems = getPlacementElevationItemsForWall(wall, nextPlacements, thickWalls);
    const placedPlacementItem = wallPlacementItems.find(
      (placementItem) =>
        placementItem.placement.id === placedPlacementElement.id && placementItem.category === "wall"
    );

    if (!placedPlacementItem) continue;

    const placedStart = placedPlacementItem.startInches;
    const placedEnd = placedPlacementItem.startInches + placedPlacementItem.widthInches;

    const horizontalOverlap = (placementItem: PlacementElevationItem) => {
      const placementStart = placementItem.startInches;
      const placementEnd = placementItem.startInches + placementItem.widthInches;
      return Math.min(placedEnd, placementEnd) - Math.max(placedStart, placementStart);
    };

    const sameDepthPath = (placementItem: PlacementElevationItem) =>
      Math.abs(placementItem.depthFromWallInches - placedPlacementItem.depthFromWallInches) <= depthPathToleranceInches;

    const stackObstacles = wallPlacementItems.filter((placementItem) => {
      if (placementItem.placement.id === placedPlacementElement.id) return false;
      if (!sameDepthPath(placementItem)) return false;
      return horizontalOverlap(placementItem) > overlapToleranceInches;
    });

    if (stackObstacles.length === 0) continue;

    const nextDistanceFromFloorInches = Math.max(
      placedPlacementItem.distanceFromFloorInches,
      ...stackObstacles.map(
        (placementItem) => placementItem.distanceFromFloorInches + placementItem.heightInches
      )
    );
    const nextTopInches = nextDistanceFromFloorInches + placedPlacementItem.heightInches;

    if (nextTopInches > DEFAULT_ELEVATION_WALL_HEIGHT_INCHES + 0.001) {
      return {
        placements,
        message:
          "Cannot stack this wall cabinet because it would go beyond the ceiling height.",
      };
    }

    return {
      placements: nextPlacements.map((placementItem) =>
        placementItem.id === placedPlacementElement.id
          ? {
              ...placementItem,
              distanceFromFloorInches: nextDistanceFromFloorInches,
              wallId: placedPlacementItem.placement.wallId ?? wall.id,
            }
          : placementItem
      ),
    };
  }

  return { placements: nextPlacements };
}


export function getPlacementElevationCategory(placementItem: PlacementElement): PlacementCategory {
  if (placementItem.category) return placementItem.category;

  const widthInches = pixelsToInches(placementItem.width);
  const depthInches = pixelsToInches(placementItem.depth);

  if (depthInches <= 15) return "wall";
  return "base";
}

export function getPlacementFloorVisualLayerPriority(placementItem: Pick<PlacementElement, "category" | "width" | "depth">): number {
  const category = getPlacementElevationCategory(placementItem as PlacementElement);
  if (category === "wall") return 30;
  if (category === "pantry") return 20;
  return 10;
}

export function getPlacementPreviewFloorVisualLayerPriority(preview: PlacementPreview): number {
  return getPlacementFloorVisualLayerPriority({
    category: preview.category,
    width: preview.width,
    depth: preview.depth,
  });
}

export function getPlacementElevationSpec(placementItem: PlacementElement, category: PlacementCategory) {
  // This is the cabinet BODY size only. Accessories like the front-control
  // cooktop are drawn as an add-on block above the cabinet body, so editing
  // cooktopFrontHeightInches never changes/stretches the cabinet itself.
  const supportType = getPlacementSupportType(placementItem);
  const defaultHeightInches =
    category === "pantry" ? 84 : category === "wall" ? 30 : 36;
  const heightInches = placementItem.heightInches ?? defaultHeightInches;

  if (supportType === "floor-supported") {
    return {
      heightInches,
      distanceFromFloorInches: 0,
    };
  }

  if (placementItem.heightInches !== undefined || placementItem.distanceFromFloorInches !== undefined) {
    return {
      heightInches,
      distanceFromFloorInches: placementItem.distanceFromFloorInches ?? (category === "wall" ? 54 : 0),
    };
  }

  if (category === "pantry") {
    return {
      heightInches,
      distanceFromFloorInches: 0,
    };
  }

  if (category === "wall") {
    return {
      heightInches,
      distanceFromFloorInches: 54,
    };
  }

  return {
    heightInches,
    distanceFromFloorInches: 0,
  };
}

export function getPlacementTopAccessoryExtraHeightInches(placementItem: PlacementElement) {
  const category = getPlacementElevationCategory(placementItem);
  const image = placementItem.image ?? getDefaultPlacementImageForCategory(category);

  if (
    category === "base" &&
    placementItem.cooktopFixture === "front" &&
    !isProductPlacementImage(image)
  ) {
    return Math.max(1, placementItem.cooktopFrontHeightInches ?? 6);
  }

  return 0;
}

export function getPlacementDisplayTitle(placementItem: PlacementElement) {
  const catalogMatch = getPlacementCatalogItemByIdentity(placementItem);
  if (catalogMatch?.title) return catalogMatch.title;

  if (placementItem.image) {
    return placementItem.image
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  const category = getPlacementElevationCategory(placementItem);
  return category === "wall" ? "Wall cabinet" : category === "pantry" ? "Pantry cabinet" : "Base cabinet";
}

export function isLShapedCornerCabinet(placementItem: Partial<Pick<PlacementElement, "image" | "category">>) {
  return getPlacementImage(placementItem) === "base-corner";
}

export function placementProjectionRangeRelativeToWallAxis(
  placementItem: PlacementElement,
  axis: ElevationWallAxis
) {
  const corners = getRotatedRectCorners(
    placementItem.center,
    placementItem.width,
    placementItem.depth,
    placementItem.rotation
  );
  const values = corners.map((corner) => dot(sub(corner, axis.start), axis.direction));

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function getPlacementPlanBodyPolygon(
  placementItem: Pick<PlacementElement, "center" | "width" | "depth" | "rotation"> & Partial<Pick<PlacementElement, "image" | "category">>
): Point[] {
  const radians = degreesToRadians(placementItem.rotation);
  const cosValue = Math.cos(radians);
  const sinValue = Math.sin(radians);
  const halfWidth = placementItem.width / 2;
  const halfDepth = placementItem.depth / 2;
  const left = -halfWidth;
  const right = halfWidth;
  const top = -halfDepth;
  const bottom = halfDepth;
  const image = getPlacementImage(placementItem);
  const localPoints = image === "base-corner"
    ? [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left + placementItem.width * 0.48, y: bottom },
        { x: left + placementItem.width * 0.48, y: top + placementItem.depth * 0.54 },
        { x: left, y: top + placementItem.depth * 0.54 },
      ]
    : [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
      ];

  return localPoints.map((point) => ({
    x: placementItem.center.x + point.x * cosValue - point.y * sinValue,
    y: placementItem.center.y + point.x * sinValue + point.y * cosValue,
  }));
}

export function rangesOverlapOrTouchInches(firstStart: number, firstEnd: number, secondStart: number, secondEnd: number, tolerance = 0) {
  return firstStart <= secondEnd + tolerance && secondStart <= firstEnd + tolerance;
}

export function getPlacementAttachedWallForElevationFootprint(
  placementItem: PlacementElement,
  walls: Wall[],
  attachmentTolerance: number
): Wall | null {
  if (placementItem.wallId) {
    return walls.find((candidateWall) => candidateWall.id === placementItem.wallId) ?? null;
  }

  return getBestPlacementWallAttachment(placementItem, walls, attachmentTolerance)?.wall ?? null;
}

export function getCoveredSameWallCornerPlacementIdsForElevation(
  wall: Wall,
  placements: PlacementElement[],
  walls: Wall[]
): Set<string> {
  const coveredIds = new Set<string>();
  const axis = getElevationWallAxis(wall);
  if (axis.length < 0.001) return coveredIds;

  const thickWalls = walls.filter(isThickWall);
  const attachmentTolerance = Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8);
  const sharedEndpointTolerance = Math.max(2, WALL_THICKNESS + 4);
  const cornerTouchTolerancePixels = Math.max(inchesToPixels(3), WALL_THICKNESS + 8);
  const bodyTouchTolerancePixels = Math.max(2, inchesToPixels(0.75));
  const elevationOverlapToleranceInches = 1.5;
  const perpendicularTolerance = 0.12;

  placements.forEach((cornerPlacementElement) => {
    if (!isLShapedCornerCabinet(cornerPlacementElement)) return;

    const cornerAttachedWall = getPlacementAttachedWallForElevationFootprint(
      cornerPlacementElement,
      thickWalls,
      attachmentTolerance
    );
    if (!cornerAttachedWall || cornerAttachedWall.id !== wall.id) return;

    const cornerElevationItem =
      getPlacementElevationItemsForWall(wall, [cornerPlacementElement], thickWalls)[0] ?? null;
    if (!cornerElevationItem) return;

    const cornerStart = cornerElevationItem.startInches;
    const cornerEnd = cornerElevationItem.startInches + cornerElevationItem.widthInches;
    const touchesStartBoundary = cornerStart <= pixelsToInches(cornerTouchTolerancePixels);
    const touchesEndBoundary = pixelsToInches(axis.length) - cornerEnd <= pixelsToInches(cornerTouchTolerancePixels);
    if (!touchesStartBoundary && !touchesEndBoundary) return;

    const cornerPolygon = getPlacementPlanBodyPolygon(cornerPlacementElement);

    const hasCoveringBasePlacement = placements.some((otherPlacementElement) => {
      if (otherPlacementElement.id === cornerPlacementElement.id) return false;
      if (isLShapedCornerCabinet(otherPlacementElement)) return false;
      if (getPlacementElevationCategory(otherPlacementElement) === "wall") return false;

      const otherAttachedWall = getPlacementAttachedWallForElevationFootprint(
        otherPlacementElement,
        thickWalls,
        attachmentTolerance
      );
      if (!otherAttachedWall) return false;

      if (otherAttachedWall.id === wall.id) {
        const otherElevationItem =
          getPlacementElevationItemsForWall(wall, [otherPlacementElement], thickWalls)[0] ?? null;
        if (!otherElevationItem) return false;

        const otherStart = otherElevationItem.startInches;
        const otherEnd = otherElevationItem.startInches + otherElevationItem.widthInches;
        const touchesCornerInElevation = rangesOverlapOrTouchInches(
          cornerStart,
          cornerEnd,
          otherStart,
          otherEnd,
          elevationOverlapToleranceInches
        );
        if (!touchesCornerInElevation) return false;

        return polygonsOverlapForPlacementBlocking(
          cornerPolygon,
          getPlacementPlanBodyPolygon(otherPlacementElement)
        ) || Math.max(
          getPlacementPlanOccupiedBounds(cornerPlacementElement).minX - getPlacementPlanOccupiedBounds(otherPlacementElement).maxX,
          getPlacementPlanOccupiedBounds(otherPlacementElement).minX - getPlacementPlanOccupiedBounds(cornerPlacementElement).maxX,
          getPlacementPlanOccupiedBounds(cornerPlacementElement).minY - getPlacementPlanOccupiedBounds(otherPlacementElement).maxY,
          getPlacementPlanOccupiedBounds(otherPlacementElement).minY - getPlacementPlanOccupiedBounds(cornerPlacementElement).maxY,
          0
        ) <= bodyTouchTolerancePixels;
      }

      const sharedEndpoint = getSharedWallEndpoint(wall, otherAttachedWall, sharedEndpointTolerance);
      if (!sharedEndpoint) return false;

      const otherAxis = getElevationWallAxis(otherAttachedWall);
      if (otherAxis.length < 0.001) return false;
      const parallelAmount = Math.abs(dot(axis.direction, otherAxis.direction));
      if (parallelAmount > perpendicularTolerance) return false;

      const cornerRangeOnActiveWall = placementProjectionRangeRelativeToWallAxis(cornerPlacementElement, axis);
      const sharedScalarOnActiveWall = dot(sub(sharedEndpoint, axis.start), axis.direction);
      const cornerReachesSharedEndpoint = Math.max(
        cornerRangeOnActiveWall.min - sharedScalarOnActiveWall,
        sharedScalarOnActiveWall - cornerRangeOnActiveWall.max,
        0
      ) <= cornerTouchTolerancePixels;
      if (!cornerReachesSharedEndpoint) return false;

      const otherRangeOnAttachedWall = placementProjectionRangeRelativeToWallAxis(otherPlacementElement, otherAxis);
      const sharedScalarOnAttachedWall = dot(sub(sharedEndpoint, otherAxis.start), otherAxis.direction);
      const otherReachesSharedEndpoint = Math.max(
        otherRangeOnAttachedWall.min - sharedScalarOnAttachedWall,
        sharedScalarOnAttachedWall - otherRangeOnAttachedWall.max,
        0
      ) <= Math.max(cornerTouchTolerancePixels, Math.max(cornerPlacementElement.width, cornerPlacementElement.depth));

      if (!otherReachesSharedEndpoint) return false;

      return polygonsOverlapForPlacementBlocking(
        cornerPolygon,
        getPlacementPlanBodyPolygon(otherPlacementElement)
      ) || Math.max(
        getPlacementPlanOccupiedBounds(cornerPlacementElement).minX - getPlacementPlanOccupiedBounds(otherPlacementElement).maxX,
        getPlacementPlanOccupiedBounds(otherPlacementElement).minX - getPlacementPlanOccupiedBounds(cornerPlacementElement).maxX,
        getPlacementPlanOccupiedBounds(cornerPlacementElement).minY - getPlacementPlanOccupiedBounds(otherPlacementElement).maxY,
        getPlacementPlanOccupiedBounds(otherPlacementElement).minY - getPlacementPlanOccupiedBounds(cornerPlacementElement).maxY,
        0
      ) <= bodyTouchTolerancePixels;
    });

    if (hasCoveringBasePlacement) {
      coveredIds.add(cornerPlacementElement.id);
    }
  });

  return coveredIds;
}

export function wallsShareEndpoint(firstWall: Wall, secondWall: Wall, tolerance = 2) {
  return [firstWall.start, firstWall.end].some((firstPoint) =>
    [secondWall.start, secondWall.end].some((secondPoint) =>
      distance(firstPoint, secondPoint) <= tolerance
    )
  );
}

export function getSharedWallEndpoint(firstWall: Wall, secondWall: Wall, tolerance = 2): Point | null {
  for (const firstPoint of [firstWall.start, firstWall.end]) {
    for (const secondPoint of [secondWall.start, secondWall.end]) {
      if (distance(firstPoint, secondPoint) <= tolerance) {
        return {
          x: (firstPoint.x + secondPoint.x) / 2,
          y: (firstPoint.y + secondPoint.y) / 2,
        };
      }
    }
  }

  return null;
}

export function getReservationBoundaryForWall(
  reservation: Pick<ElevationCornerReservation, "startInches" | "widthInches" | "boundary">,
  wallLengthInches: number
): "start" | "end" {
  if (reservation.boundary) return reservation.boundary;

  const endInches = reservation.startInches + reservation.widthInches;
  return reservation.startInches <= wallLengthInches - endInches ? "start" : "end";
}

export function getReservationBoundaryDistanceInches(
  reservation: Pick<ElevationCornerReservation, "startInches" | "widthInches" | "boundary" | "boundaryDistanceInches">,
  wallLengthInches: number
): number {
  if (reservation.boundaryDistanceInches !== undefined) {
    return reservation.boundaryDistanceInches;
  }

  const boundary = getReservationBoundaryForWall(reservation, wallLengthInches);
  return boundary === "start"
    ? reservation.startInches
    : Math.max(0, wallLengthInches - (reservation.startInches + reservation.widthInches));
}

export function compareElevationCornerReservations(
  left: ElevationCornerReservation,
  right: ElevationCornerReservation,
  wallLengthInches: number
): number {
  const leftWallFaceGap = left.wallFaceGapPixels ?? 0;
  const rightWallFaceGap = right.wallFaceGapPixels ?? 0;
  if (Math.abs(leftWallFaceGap - rightWallFaceGap) > 0.001) {
    return leftWallFaceGap - rightWallFaceGap;
  }

  const leftSharedCornerDistance = left.distanceToSharedCornerPixels ?? inchesToPixels(
    getReservationBoundaryDistanceInches(left, wallLengthInches)
  );
  const rightSharedCornerDistance = right.distanceToSharedCornerPixels ?? inchesToPixels(
    getReservationBoundaryDistanceInches(right, wallLengthInches)
  );
  if (Math.abs(leftSharedCornerDistance - rightSharedCornerDistance) > 0.001) {
    return leftSharedCornerDistance - rightSharedCornerDistance;
  }

  const leftBoundaryDistance = getReservationBoundaryDistanceInches(left, wallLengthInches);
  const rightBoundaryDistance = getReservationBoundaryDistanceInches(right, wallLengthInches);
  if (Math.abs(leftBoundaryDistance - rightBoundaryDistance) > 0.001) {
    return leftBoundaryDistance - rightBoundaryDistance;
  }

  const leftCoveredCorner = left.coveredSameWallCorner ? 0 : 1;
  const rightCoveredCorner = right.coveredSameWallCorner ? 0 : 1;
  if (leftCoveredCorner !== rightCoveredCorner) {
    return leftCoveredCorner - rightCoveredCorner;
  }

  const leftIsCorner = isLShapedCornerCabinet(left.sourcePlacement) ? 0 : 1;
  const rightIsCorner = isLShapedCornerCabinet(right.sourcePlacement) ? 0 : 1;
  if (leftIsCorner !== rightIsCorner) {
    return leftIsCorner - rightIsCorner;
  }

  return right.widthInches - left.widthInches;
}

export function dedupeElevationCornerReservationsByClosestPlacement(
  reservations: ElevationCornerReservation[],
  wallLengthInches: number
): ElevationCornerReservation[] {
  const verticalOverlapToleranceInches = 1;
  const boundaryClusterToleranceInches = Math.max(6, pixelsToInches(WALL_THICKNESS) + 2);
  const groups: ElevationCornerReservation[][] = [];

  reservations.forEach((reservation) => {
    const boundary = getReservationBoundaryForWall(reservation, wallLengthInches);
    const bottom = reservation.distanceFromFloorInches;
    const top = reservation.distanceFromFloorInches + reservation.heightInches;
    const boundaryDistance = getReservationBoundaryDistanceInches(reservation, wallLengthInches);

    const group = groups.find((existingGroup) => {
      const existing = existingGroup[0];
      const existingBoundary = getReservationBoundaryForWall(existing, wallLengthInches);
      if (existingBoundary !== boundary) return false;

      const existingBottom = existing.distanceFromFloorInches;
      const existingTop = existing.distanceFromFloorInches + existing.heightInches;
      const overlapsVertically = rangesOverlapOrTouchInches(
        bottom,
        top,
        existingBottom,
        existingTop,
        verticalOverlapToleranceInches
      );
      if (!overlapsVertically) return false;

      const existingBoundaryDistance = getReservationBoundaryDistanceInches(existing, wallLengthInches);
      return Math.min(boundaryDistance, existingBoundaryDistance) <= boundaryClusterToleranceInches;
    });

    if (group) {
      group.push(reservation);
    } else {
      groups.push([reservation]);
    }
  });

  return groups.map((group) =>
    [...group].sort((left, right) => compareElevationCornerReservations(left, right, wallLengthInches))[0]
  );
}

export function getElevationCornerReservationsForWall(
  wall: Wall,
  placements: PlacementElement[],
  walls: Wall[],
  coveredSameWallCornerPlacementIds: Set<string> = new Set()
): ElevationCornerReservation[] {
  const axis = getElevationWallAxis(wall);
  const wallInteriorSpan = getElevationWallInteriorSpan(wall, walls);
  const wallStartOffsetInches = pixelsToInches(wallInteriorSpan.startScalar);
  const wallLengthInches = pixelsToInches(wallInteriorSpan.length);
  if (axis.length < 0.001 || wallLengthInches <= 0.001) return [];

  const thickWalls = walls.filter(isThickWall);
  const perpendicularTolerance = 0.12;
  const boundaryToleranceInches = Math.max(2, pixelsToInches(WALL_THICKNESS) + 1);
  const touchTolerancePixels = Math.max(1.5, inchesToPixels(0.75));
  const attachmentTolerance = Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8);
  const sharedEndpointTolerance = Math.max(2, WALL_THICKNESS + 4);

  type ReservationCandidate = ElevationCornerReservation & {
    attachedWallId: string;
    boundary: "start" | "end";
    distanceToSharedCornerPixels: number;
    boundaryDistanceInches: number;
    projectedWidthInches: number;
  };

  const candidates: ReservationCandidate[] = [];

  thickWalls.forEach((attachedWall) => {
    if (attachedWall.id === wall.id) return;

    const sharedEndpoint = getSharedWallEndpoint(wall, attachedWall, sharedEndpointTolerance);
    if (!sharedEndpoint) return;

    const attachedAxis = getElevationWallAxis(attachedWall);
    if (attachedAxis.length < 0.001) return;

    const parallelAmount = Math.abs(dot(axis.direction, attachedAxis.direction));
    if (parallelAmount > perpendicularTolerance) return;

    const sharedScalarOnWall = dot(sub(sharedEndpoint, axis.start), axis.direction);
    const sharedInchesOnWall = clamp(
      pixelsToInches(sharedScalarOnWall) - wallStartOffsetInches,
      0,
      wallLengthInches
    );
    const boundary: "start" | "end" =
      sharedInchesOnWall <= wallLengthInches - sharedInchesOnWall ? "start" : "end";

    const sharedScalarOnAttachedWall = dot(
      sub(sharedEndpoint, attachedAxis.start),
      attachedAxis.direction
    );

    placements.forEach((placementItem) => {
      // A footprint on this elevation represents the cabinet face/depth that is
      // occupied by a cabinet on the perpendicular, connected wall. Cabinets
      // already attached to the active wall are drawn normally, not as a
      // footprint. For legacy cabinets without wallId, infer the best wall the
      // same way the elevation placement code does.
      if (placementItem.wallId === wall.id) return;

      const placementAttachedWall = placementItem.wallId
        ? thickWalls.find((candidateWall) => candidateWall.id === placementItem.wallId) ?? null
        : getBestPlacementWallAttachment(placementItem, thickWalls, attachmentTolerance)?.wall ?? null;

      if (!placementAttachedWall || placementAttachedWall.id !== attachedWall.id) return;

      const axisRange = placementProjectionRangeRelativeToWallAxis(placementItem, axis);
      const rawStartInches = pixelsToInches(axisRange.min) - wallStartOffsetInches;
      const rawEndInches = pixelsToInches(axisRange.max) - wallStartOffsetInches;
      const projectedStartInches = clamp(rawStartInches, 0, wallLengthInches);
      const projectedEndInches = clamp(rawEndInches, 0, wallLengthInches);
      const projectedWidthInches = projectedEndInches - projectedStartInches;
      if (projectedWidthInches <= 0.5) return;

      const boundaryDistanceInches = boundary === "start"
        ? projectedStartInches
        : wallLengthInches - projectedEndInches;

      // Only use cabinets whose perpendicular projection actually reaches the
      // shared corner of this elevation wall. This prevents a cabinet farther
      // down the same perpendicular wall from leaving a stale footprint on the
      // wrong elevation.
      if (boundaryDistanceInches > boundaryToleranceInches) return;

      const attachedRange = placementProjectionRangeRelativeToWallAxis(placementItem, attachedAxis);
      const distanceToSharedCornerPixels = Math.max(
        attachedRange.min - sharedScalarOnAttachedWall,
        sharedScalarOnAttachedWall - attachedRange.max,
        0
      );

      const placementCorners = getRotatedRectCorners(
        placementItem.center,
        placementItem.width,
        placementItem.depth,
        placementItem.rotation
      );
      const normalValues = placementCorners.map((corner) =>
        dot(sub(corner, axis.start), axis.normal)
      );
      const normalMin = Math.min(...normalValues);
      const normalMax = Math.max(...normalValues);
      const nearestDistanceToWallCenterline = normalMin <= 0 && normalMax >= 0
        ? 0
        : Math.min(Math.abs(normalMin), Math.abs(normalMax));
      const gapToWallFace = Math.max(0, nearestDistanceToWallCenterline - WALL_THICKNESS / 2);
      const severity: ElevationCornerReservationSeverity = gapToWallFace <= touchTolerancePixels
        ? "taken"
        : "caution";

      const category = getPlacementElevationCategory(placementItem);
      const spec = getPlacementElevationSpec(placementItem, category);
      const startInches = boundary === "start"
        ? 0
        : Math.max(0, wallLengthInches - projectedWidthInches);

      candidates.push({
        key: `corner-reservation-${wall.id}-${attachedWall.id}-${boundary}-${placementItem.id}`,
        sourcePlacement: placementItem,
        title: getPlacementDisplayTitle(placementItem),
        severity,
        startInches,
        widthInches: projectedWidthInches,
        heightInches: spec.heightInches,
        distanceFromFloorInches: spec.distanceFromFloorInches,
        boundary,
        boundaryDistanceInches,
        distanceToSharedCornerPixels,
        wallFaceGapPixels: gapToWallFace,
        attachedWallId: attachedWall.id,
        projectedWidthInches,
      });
    });
  });

  // Keep separate reservations for distinct vertical bands on the same attached
  // wall/boundary pair. A wall blind and a base blind at the same corner should
  // both show their taken areas on the neighboring elevation instead of one
  // suppressing the other before vertical dedupe happens.
  const perpendicularReservations = [...candidates]
    .sort((left, right) => {
      if (left.attachedWallId !== right.attachedWallId) {
        return left.attachedWallId.localeCompare(right.attachedWallId);
      }
      if (left.boundary !== right.boundary) return left.boundary === "start" ? -1 : 1;
      if (Math.abs(left.distanceFromFloorInches - right.distanceFromFloorInches) > 0.001) {
        return left.distanceFromFloorInches - right.distanceFromFloorInches;
      }
      if (Math.abs(left.distanceToSharedCornerPixels - right.distanceToSharedCornerPixels) > 0.001) {
        return left.distanceToSharedCornerPixels - right.distanceToSharedCornerPixels;
      }
      return left.startInches - right.startInches;
    })
    .map(({ attachedWallId, projectedWidthInches, ...reservation }) => reservation);

  const sameWallCoveredCornerReservations = placements
    .filter((placementItem) => coveredSameWallCornerPlacementIds.has(placementItem.id))
    .map((placementItem): ElevationCornerReservation | null => {
      const placement = getPlacementElevationItemsForWall(wall, [placementItem], thickWalls)[0] ?? null;
      if (!placement) return null;

      const relativeStartInches = clamp(
        placement.startInches - wallStartOffsetInches,
        0,
        Math.max(0, wallLengthInches - placement.widthInches)
      );

      const coveredBoundary = getReservationBoundaryForWall(
        { startInches: relativeStartInches, widthInches: placement.widthInches },
        wallLengthInches
      );

      return {
        key: `covered-corner-reservation-${wall.id}-${placementItem.id}`,
        sourcePlacement: placementItem,
        title: getPlacementDisplayTitle(placementItem),
        severity: "taken",
        startInches: relativeStartInches,
        widthInches: placement.widthInches,
        heightInches: placement.heightInches,
        distanceFromFloorInches: placement.distanceFromFloorInches,
        boundary: coveredBoundary,
        boundaryDistanceInches: coveredBoundary === "start"
          ? relativeStartInches
          : Math.max(0, wallLengthInches - (relativeStartInches + placement.widthInches)),
        distanceToSharedCornerPixels: 0,
        wallFaceGapPixels: 0,
        coveredSameWallCorner: true,
      };
    })
    .filter((reservation): reservation is ElevationCornerReservation => Boolean(reservation));

  return dedupeElevationCornerReservationsByClosestPlacement(
    [...perpendicularReservations, ...sameWallCoveredCornerReservations].map(
      (reservation) => {
        const displayStartInches = getElevationDisplayStartInches(
          wall,
          wallLengthInches,
          reservation.startInches,
          reservation.widthInches,
          thickWalls
        );
        const boundary = getReservationBoundaryForWall(
          {
            startInches: displayStartInches,
            widthInches: reservation.widthInches,
          },
          wallLengthInches
        );

        return {
          ...reservation,
          startInches: displayStartInches,
          boundary,
          boundaryDistanceInches:
            boundary === "start"
              ? displayStartInches
              : Math.max(
                  0,
                  wallLengthInches -
                    (displayStartInches + reservation.widthInches)
                ),
        };
      }
    ),
    wallLengthInches
  ).sort((left, right) => left.startInches - right.startInches);
}

export function ElevationPlanView({
  walls,
  allWalls,
  windows,
  doors,
  placements,
  selectedWindowId,
  selectedDoorId,
  selectedPlacementId,
  selectedWallId,
  activeIndex,
  showMeasurements,
  onSelectWindow,
  onSelectDoor,
  onSelectPlacement,
  onSelectWall,
  onUpdateWindow,
  onUpdateDoor,
  onUpdatePlacement,
  onUpdateWall,
  onAlert,
  onClearSelection,
  onPrevious,
  onNext,
}: {
  walls: Wall[];
  allWalls?: Wall[];
  windows: WindowElement[];
  doors: DoorElement[];
  placements: PlacementElement[];
  selectedWindowId: string | null;
  selectedDoorId: string | null;
  selectedPlacementId: string | null;
  selectedWallId: string | null;
  activeIndex: number;
  showMeasurements: boolean;
  onSelectWindow: (id: string) => void;
  onSelectDoor: (id: string) => void;
  onSelectPlacement: (id: string) => void;
  onSelectWall: (id: string) => void;
  onUpdateWindow: (
    id: string,
    updates: Partial<Pick<WindowElement, "t" | "distanceFromFloorInches">>
  ) => void;
  onUpdateDoor: (
    id: string,
    updates: Partial<Pick<DoorElement, "t" | "distanceFromFloorInches">>
  ) => void;
  onUpdatePlacement: (
    id: string,
    updates: Partial<Pick<PlacementElement, "center" | "distanceFromFloorInches">>
  ) => void;
  onUpdateWall: (
    id: string,
    updates: Partial<Pick<Wall, "start" | "end">>
  ) => void;
  onAlert: (message: string, title?: string) => void;
  onClearSelection: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const elevationDragRef = useRef<ElevationDragState | null>(null);
  const elevationDragAlertRef = useRef<string | null>(null);
  const elevationInvalidPlacementDragRef = useRef<{ id: string; message: string } | null>(null);
  const [isElevationDragging, setIsElevationDragging] = useState(false);
  const [elevationAlignmentGuides, setElevationAlignmentGuides] = useState<ElevationAlignmentGuide[]>([]);
  const [elevationInvalidPlacementDrag, setElevationInvalidPlacementDrag] = useState<{ id: string; message: string } | null>(null);
  const measurementDisplayUnit = useMeasurementDisplayUnit();

  const updateElevationInvalidPlacementDrag = (state: { id: string; message: string } | null) => {
    elevationInvalidPlacementDragRef.current = state;
    setElevationInvalidPlacementDrag(state);
  };

  if (walls.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#f5f5f5]">
        <div className="rounded-xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-pelican-navy">Elevation plan</h3>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Draw or generate at least one thick wall in the floor plan first, then switch back to Elevation plan to browse each wall side.
          </p>
        </div>
      </div>
    );
  }

  const calculationWalls = allWalls ?? walls;
  const elevationStructureWalls = calculationWalls.filter((candidateWall) => !isDetachedPanelWall(candidateWall));
  const wall = walls[activeIndex] ?? walls[0];
  const currentElevationViewMode = getWallElevationViewMode(wall);
  const isPeninElevationWall = isDetachedPanelWall(wall);
  const peninElevationSegment = isPeninElevationWall
    ? getPeninWallVisibleSegment(wall, elevationStructureWalls)
    : null;
  const elevationWallForMeasurement = peninElevationSegment
    ? { ...wall, start: peninElevationSegment.start, end: peninElevationSegment.end }
    : wall;
  const wallWindows = windows
    .filter((windowItem) => windowItem.wallId === wall.id)
    .sort(
      (left, right) =>
        getElevationWallElementCenterInches(wall, left.t) -
        getElevationWallElementCenterInches(wall, right.t)
    );
  const wallDoors = doors
    .filter((doorItem) => doorItem.wallId === wall.id)
    .sort(
      (left, right) =>
        getElevationWallElementCenterInches(wall, left.t) -
        getElevationWallElementCenterInches(wall, right.t)
    );
  const coveredSameWallCornerPlacementIds = getCoveredSameWallCornerPlacementIdsForElevation(
    wall,
    placements,
    elevationStructureWalls
  );
  const wallPlacements = getPlacementElevationItemsForWall(wall, placements, elevationStructureWalls)
    .filter((placement) => !coveredSameWallCornerPlacementIds.has(placement.placement.id));

  const elevationWallAxis = getElevationWallAxis(elevationWallForMeasurement);
  const elevationWallInteriorSpan = isPeninElevationWall
    ? {
        startScalar: 0,
        endScalar: elevationWallAxis.length,
        length: elevationWallAxis.length,
        startAnchor: elevationWallAxis.start,
        endAnchor: elevationWallAxis.end,
      }
    : getElevationWallInteriorSpan(wall, elevationStructureWalls, placements);
  const wallStartOffsetInches = pixelsToInches(elevationWallInteriorSpan.startScalar);
  const wallLengthInches = pixelsToInches(elevationWallInteriorSpan.length);
  const wallHeightInches = DEFAULT_ELEVATION_WALL_HEIGHT_INCHES;
  const drawingWidth = ELEVATION_VIEWBOX_WIDTH - 220;
  const drawingHeight = ELEVATION_VIEWBOX_HEIGHT - 260;
  const renderScale = Math.min(
    drawingWidth / Math.max(wallLengthInches, 1),
    drawingHeight / wallHeightInches
  );
  const wallRenderWidth = wallLengthInches * renderScale;
  const wallRenderHeight = wallHeightInches * renderScale;
  const wallLeft = (ELEVATION_VIEWBOX_WIDTH - wallRenderWidth) / 2;
  const wallRight = wallLeft + wallRenderWidth;
  const wallTop = 190;
  const wallBottom = wallTop + wallRenderHeight;
  const toElevationDisplayStartInches = (startInches: number, widthInches: number) =>
    getElevationDisplayStartInches(
      wall,
      wallLengthInches,
      startInches,
      widthInches,
      elevationStructureWalls
    );
  const toPlacementDisplayStartInches = toElevationDisplayStartInches;
  const toPlacementActualStartInches = (
    displayStartInches: number,
    widthInches: number
  ) =>
    getElevationActualStartInches(
      wall,
      wallLengthInches,
      displayStartInches,
      widthInches,
      elevationStructureWalls
    );
  const toElevationActualCenterInches = (
    displayCenterInches: number,
    widthInches: number
  ) =>
    toPlacementActualStartInches(
      displayCenterInches - widthInches / 2,
      widthInches
    ) +
    widthInches / 2;
  const overallLengthLabel = formatMeasurementFromInches(wallLengthInches, measurementDisplayUnit);
  const overallHeightLabel = formatMeasurementFromInches(wallHeightInches, measurementDisplayUnit);

  const placementRenderItems = wallPlacements.map((placement) => {
    const relativeStartInches = clamp(
      placement.startInches - wallStartOffsetInches,
      0,
      Math.max(0, wallLengthInches - placement.widthInches)
    );
    const width = placement.widthInches * renderScale;
    const height = placement.heightInches * renderScale;
    // Elevation view is an orthographic projection onto the selected wall.
    // Preserve the cabinet's floor-plan distance from the wall in data, but do
    // not shift the drawing sideways because that makes cabinets that touch in
    // floor plan look separated in elevation and misaligns their width guides.
    const depthVisualOffsetInches = 0;
    const depthShiftXInches = 0;
    const displayStartInches = toPlacementDisplayStartInches(
      relativeStartInches,
      placement.widthInches
    );
    const boundedDistanceFromFloorInches = clamp(
      placement.distanceFromFloorInches,
      0,
      Math.max(0, wallHeightInches - placement.heightInches)
    );
    const left = wallLeft + displayStartInches * renderScale;
    const boundedBottom = wallBottom - boundedDistanceFromFloorInches * renderScale;
    const top = boundedBottom - height;

    return {
      key: placement.placement.id,
      type: 'cabinet' as const,
      placement: placement,
      relativeStartInches,
      displayStartInches,
      dimensionLeft: left,
      dimensionRight: left + width,
      left,
      right: left + width,
      width,
      top,
      bottom: boundedBottom,
      height,
      depthShiftXInches,
      depthVisualOffsetInches,
    };
  });

  const selfPeninWallRenderItem = isPeninElevationWall
    ? {
        key: `penin-wall-self-elevation-${wall.id}`,
        left: wallLeft,
        right: wallRight,
        width: wallRenderWidth,
        height: PENIN_WALL_ELEVATION_HEIGHT_INCHES * renderScale,
        top: wallBottom - PENIN_WALL_ELEVATION_HEIGHT_INCHES * renderScale,
        bottom: wallBottom,
      }
    : null;

  const peninWallRenderItems = getPeninWallElevationPlacementsForWall(wall, calculationWalls).map((placement) => {
    const relativeStartInches = clamp(
      placement.startInches - wallStartOffsetInches,
      0,
      Math.max(0, wallLengthInches - placement.widthInches)
    );
    const displayStartInches = toElevationDisplayStartInches(
      relativeStartInches,
      placement.widthInches
    );
    const width = placement.widthInches * renderScale;
    const height = placement.heightInches * renderScale;
    const left = wallLeft + displayStartInches * renderScale;
    const bottom = wallBottom - placement.distanceFromFloorInches * renderScale;
    const top = bottom - height;

    return {
      key: `penin-wall-elevation-${placement.wall.id}`,
      placement,
      left,
      right: left + width,
      width,
      top,
      bottom,
      height,
    };
  });

  const elevationCornerReservations = getElevationCornerReservationsForWall(
    wall,
    placements,
    elevationStructureWalls,
    coveredSameWallCornerPlacementIds
  );
  const reservationRenderItems = elevationCornerReservations.map((reservation) => {
    const clampedStartInches = clamp(
      reservation.startInches,
      0,
      Math.max(0, wallLengthInches - reservation.widthInches)
    );
    const width = reservation.widthInches * renderScale;
    const height = reservation.heightInches * renderScale;
    const left = wallLeft + clampedStartInches * renderScale;
    const bottom = wallBottom - reservation.distanceFromFloorInches * renderScale;
    const top = bottom - height;

    return {
      key: reservation.key,
      type: 'reservation' as const,
      reservation,
      displayStartInches: clampedStartInches,
      left,
      right: left + width,
      width,
      top,
      bottom,
      height,
    };
  });

  const placementBodyItems = [...placementRenderItems].sort((left, right) => {
    if (left.placement.depthFromWallInches !== right.placement.depthFromWallInches) {
      return left.placement.depthFromWallInches - right.placement.depthFromWallInches;
    }

    if (left.placement.distanceFromFloorInches !== right.placement.distanceFromFloorInches) {
      return left.placement.distanceFromFloorInches - right.placement.distanceFromFloorInches;
    }

    return left.placement.startInches - right.placement.startInches;
  });
  const placementDrawItems = [...placementBodyItems].sort((left, right) => {
    const leftSelected = left.key === selectedPlacementId;
    const rightSelected = right.key === selectedPlacementId;
    if (leftSelected !== rightSelected) return leftSelected ? 1 : -1;
    return 0;
  });

  const windowRenderItems = wallWindows.map((windowItem) => {
    const actualLayout = getElevationOpeningLayoutFromCenter(
      wallLengthInches,
      windowItem.width,
      getElevationWallElementCenterInches(wall, windowItem.t) - wallStartOffsetInches
    );
    const displayStartInches = toElevationDisplayStartInches(
      actualLayout.startInches,
      actualLayout.widthInches
    );
    const layout = {
      ...actualLayout,
      startInches: displayStartInches,
      centerInches: displayStartInches + actualLayout.widthInches / 2,
    };
    const width = layout.widthInches * renderScale;
    const height = windowItem.heightInches * renderScale;
    const left = wallLeft + layout.startInches * renderScale;
    const top = wallBottom - (windowItem.distanceFromFloorInches + windowItem.heightInches) * renderScale;
    const sillY = wallBottom - windowItem.distanceFromFloorInches * renderScale;

    return {
      key: windowItem.id,
      type: 'window' as const,
      windowItem,
      layout,
      left,
      right: left + width,
      width,
      top,
      bottom: sillY,
      height,
    };
  });

  const doorRenderItems = wallDoors.map((doorItem) => {
    const actualLayout = getElevationOpeningLayoutFromCenter(
      wallLengthInches,
      doorItem.width,
      getElevationWallElementCenterInches(wall, doorItem.t) - wallStartOffsetInches
    );
    const displayStartInches = toElevationDisplayStartInches(
      actualLayout.startInches,
      actualLayout.widthInches
    );
    const layout = {
      ...actualLayout,
      startInches: displayStartInches,
      centerInches: displayStartInches + actualLayout.widthInches / 2,
    };
    const width = layout.widthInches * renderScale;
    const height = doorItem.heightInches * renderScale;
    const left = wallLeft + layout.startInches * renderScale;
    const top = wallBottom - (doorItem.distanceFromFloorInches + doorItem.heightInches) * renderScale;

    return {
      key: doorItem.id,
      type: 'door' as const,
      doorItem,
      layout,
      left,
      right: left + width,
      width,
      top,
      bottom: wallBottom - doorItem.distanceFromFloorInches * renderScale,
      height,
    };
  });

  const toElevationObjectBox = (item: { key: string; left: number; right: number; top: number; bottom: number }): ElevationObjectBox => ({
    key: item.key,
    left: item.left,
    right: item.right,
    top: item.top,
    bottom: item.bottom,
    centerX: (item.left + item.right) / 2,
    centerY: (item.top + item.bottom) / 2,
  });

  const elevationObjectBoxes: ElevationObjectBox[] = [
    ...placementRenderItems.map(toElevationObjectBox),
    ...reservationRenderItems.map(toElevationObjectBox),
    ...windowRenderItems.map(toElevationObjectBox),
    ...doorRenderItems.map(toElevationObjectBox),
  ];

  const rangesOverlapOrTouch = (minA: number, maxA: number, minB: number, maxB: number, tolerance = 0) =>
    minA <= maxB + tolerance && minB <= maxA + tolerance;

  const getElevationAlignmentGuidesForBox = (movingBox: ElevationObjectBox, movingKey: string): ElevationAlignmentGuide[] => {
    const snapThreshold = 9;
    const guideColorPadding = 34;
    const guides: ElevationAlignmentGuide[] = [];
    const otherBoxes = elevationObjectBoxes.filter((box) => box.key !== movingKey);
    const wallCenterX = (wallLeft + wallRight) / 2;
    const wallCenterY = (wallTop + wallBottom) / 2;

    const pushGuide = (guide: ElevationAlignmentGuide) => {
      const guideKey = guide.kind === "vertical"
        ? `v-${Math.round(guide.x)}-${Math.round(guide.y1)}-${Math.round(guide.y2)}-${guide.label ?? ""}`
        : `h-${Math.round(guide.y)}-${Math.round(guide.x1)}-${Math.round(guide.x2)}-${guide.label ?? ""}`;
      const alreadyExists = guides.some((existingGuide) => {
        const existingKey = existingGuide.kind === "vertical"
          ? `v-${Math.round(existingGuide.x)}-${Math.round(existingGuide.y1)}-${Math.round(existingGuide.y2)}-${existingGuide.label ?? ""}`
          : `h-${Math.round(existingGuide.y)}-${Math.round(existingGuide.x1)}-${Math.round(existingGuide.x2)}-${existingGuide.label ?? ""}`;
        return existingKey === guideKey;
      });
      if (!alreadyExists) guides.push(guide);
    };

    if (Math.abs(movingBox.centerX - wallCenterX) <= snapThreshold) {
      pushGuide({
        kind: "vertical",
        x: wallCenterX,
        y1: wallTop - guideColorPadding,
        y2: wallBottom + guideColorPadding,
      });
    }

    if (Math.abs(movingBox.centerY - wallCenterY) <= snapThreshold) {
      pushGuide({
        kind: "horizontal",
        y: wallCenterY,
        x1: wallLeft - guideColorPadding,
        x2: wallRight + guideColorPadding,
      });
    }

    const xAnchors = [
      { name: "left", value: movingBox.left },
      { name: "center", value: movingBox.centerX },
      { name: "right", value: movingBox.right },
    ];
    const yAnchors = [
      { name: "top", value: movingBox.top },
      { name: "center", value: movingBox.centerY },
      { name: "bottom", value: movingBox.bottom },
    ];

    let bestVertical: (ElevationAlignmentGuide & { distance: number }) | null = null;
    let bestHorizontal: (ElevationAlignmentGuide & { distance: number }) | null = null;
    const horizontalSpacingGuides: Array<ElevationAlignmentGuide & { sortDistance: number }> = [];
    const verticalSpacingGuides: Array<ElevationAlignmentGuide & { sortDistance: number }> = [];

    otherBoxes.forEach((otherBox) => {
      const otherXAnchors = [
        { name: "left", value: otherBox.left },
        { name: "center", value: otherBox.centerX },
        { name: "right", value: otherBox.right },
      ];
      const otherYAnchors = [
        { name: "top", value: otherBox.top },
        { name: "center", value: otherBox.centerY },
        { name: "bottom", value: otherBox.bottom },
      ];

      xAnchors.forEach((movingAnchor) => {
        otherXAnchors.forEach((otherAnchor) => {
          const delta = Math.abs(movingAnchor.value - otherAnchor.value);
          if (delta > snapThreshold) return;
          const y1 = Math.min(movingBox.top, otherBox.top) - guideColorPadding;
          const y2 = Math.max(movingBox.bottom, otherBox.bottom) + guideColorPadding;
          if (!bestVertical || delta < bestVertical.distance) {
            bestVertical = { kind: "vertical", x: otherAnchor.value, y1, y2, distance: delta };
          }
        });
      });

      yAnchors.forEach((movingAnchor) => {
        otherYAnchors.forEach((otherAnchor) => {
          const delta = Math.abs(movingAnchor.value - otherAnchor.value);
          if (delta > snapThreshold) return;
          const x1 = Math.min(movingBox.left, otherBox.left) - guideColorPadding;
          const x2 = Math.max(movingBox.right, otherBox.right) + guideColorPadding;
          if (!bestHorizontal || delta < bestHorizontal.distance) {
            bestHorizontal = { kind: "horizontal", y: otherAnchor.value, x1, x2, distance: delta };
          }
        });
      });

      const sameHorizontalBand =
        Math.abs(movingBox.centerY - otherBox.centerY) <= snapThreshold ||
        Math.abs(movingBox.top - otherBox.top) <= snapThreshold ||
        Math.abs(movingBox.bottom - otherBox.bottom) <= snapThreshold ||
        rangesOverlapOrTouch(movingBox.top, movingBox.bottom, otherBox.top, otherBox.bottom, snapThreshold);

      if (sameHorizontalBand) {
        const gap = movingBox.left >= otherBox.right
          ? movingBox.left - otherBox.right
          : otherBox.left >= movingBox.right
            ? otherBox.left - movingBox.right
            : 0;

        if (gap > 8) {
          const x1 = movingBox.left >= otherBox.right ? otherBox.right : movingBox.right;
          const x2 = movingBox.left >= otherBox.right ? movingBox.left : otherBox.left;
          const y = Math.max(movingBox.bottom, otherBox.bottom) + 14;
          horizontalSpacingGuides.push({
            kind: "horizontal",
            y,
            x1,
            x2,
            label: formatMeasurementFromInches(Math.max(0, gap / renderScale), measurementDisplayUnit),
            labelX: (x1 + x2) / 2,
            labelY: y - 14,
            sortDistance: gap,
          });
        }
      }

      const sameVerticalBand =
        Math.abs(movingBox.centerX - otherBox.centerX) <= snapThreshold ||
        Math.abs(movingBox.left - otherBox.left) <= snapThreshold ||
        Math.abs(movingBox.right - otherBox.right) <= snapThreshold ||
        rangesOverlapOrTouch(movingBox.left, movingBox.right, otherBox.left, otherBox.right, snapThreshold);

      if (sameVerticalBand) {
        const gap = movingBox.top >= otherBox.bottom
          ? movingBox.top - otherBox.bottom
          : otherBox.top >= movingBox.bottom
            ? otherBox.top - movingBox.bottom
            : 0;

        if (gap > 8) {
          const y1 = movingBox.top >= otherBox.bottom ? otherBox.bottom : movingBox.bottom;
          const y2 = movingBox.top >= otherBox.bottom ? movingBox.top : otherBox.top;
          const x = Math.max(movingBox.right, otherBox.right) + 16;
          verticalSpacingGuides.push({
            kind: "vertical",
            x,
            y1,
            y2,
            label: formatMeasurementFromInches(Math.max(0, gap / renderScale), measurementDisplayUnit),
            labelX: x + 18,
            labelY: (y1 + y2) / 2,
            sortDistance: gap,
          });
        }
      }
    });

    if (bestVertical) pushGuide(bestVertical);
    if (bestHorizontal) pushGuide(bestHorizontal);

    horizontalSpacingGuides
      .sort((left, right) => left.sortDistance - right.sortDistance)
      .slice(0, 2)
      .forEach((guide) => pushGuide(guide));

    verticalSpacingGuides
      .sort((left, right) => left.sortDistance - right.sortDistance)
      .slice(0, 2)
      .forEach((guide) => pushGuide(guide));

    return guides;
  };

  const topHorizontalDimensionMap = new Map<string, {
    key: string;
    left: number;
    right: number;
    anchorY: number;
    label: string;
  }>();

  const bottomHorizontalDimensionMap = new Map<string, {
    key: string;
    left: number;
    right: number;
    anchorY: number;
    label: string;
  }>();

  const addHorizontalDimension = (
    map: Map<string, { key: string; left: number; right: number; anchorY: number; label: string }>,
    item: { key: string; left: number; right: number; anchorY: number; label: string }
  ) => {
    const left = Math.min(item.left, item.right);
    const right = Math.max(item.left, item.right);
    if (right - left < 2) return;

    const dedupeKey = `${Math.round(left)}:${Math.round(right)}:${item.label}`;
    if (!map.has(dedupeKey)) {
      map.set(dedupeKey, { ...item, left, right });
    }
  };

  placementRenderItems.forEach((item) => {
    const dimensionItem = {
      key: `placement-width-${item.key}`,
      left: item.dimensionLeft,
      right: item.dimensionRight,
      anchorY: item.placement.category === "base" ? item.bottom : item.top,
      label: formatMeasurementFromInches(item.placement.widthInches, measurementDisplayUnit),
    };

    if (item.placement.category === "base") {
      addHorizontalDimension(bottomHorizontalDimensionMap, dimensionItem);
    } else {
      addHorizontalDimension(topHorizontalDimensionMap, dimensionItem);
    }
  });

  windowRenderItems.forEach((item) => {
    addHorizontalDimension(topHorizontalDimensionMap, {
      key: `window-width-${item.key}`,
      left: item.left,
      right: item.right,
      anchorY: item.top,
      label: formatMeasurementFromInches(item.layout.widthInches, measurementDisplayUnit),
    });
  });

  doorRenderItems.forEach((item) => {
    addHorizontalDimension(bottomHorizontalDimensionMap, {
      key: `door-width-${item.key}`,
      left: item.left,
      right: item.right,
      anchorY: item.bottom,
      label: formatMeasurementFromInches(item.layout.widthInches, measurementDisplayUnit),
    });
  });

  const topHorizontalDimensionItems = Array.from(topHorizontalDimensionMap.values()).sort((left, right) => {
    if (left.left !== right.left) return left.left - right.left;
    return left.right - right.right;
  });
  const bottomHorizontalDimensionItems = Array.from(bottomHorizontalDimensionMap.values()).sort((left, right) => {
    if (left.left !== right.left) return left.left - right.left;
    return left.right - right.right;
  });

  const topDetailDimensionY = wallTop - 42;
  const topOverallDimensionY = wallTop - 88;
  const bottomDetailDimensionY = wallBottom + 34;
  const bottomOverallDimensionY = wallBottom + 78;
  const leftDetailDimensionX = wallLeft - 50;
  const leftOverallDimensionX = wallLeft - 96;

  const clearanceDimensionMap = new Map<string, {
    key: string;
    top: number;
    bottom: number;
    referenceX: number;
    label: string;
  }>();

  [
    ...placementRenderItems
      .filter((item) => item.placement.distanceFromFloorInches > 0)
      .map((item) => ({
        key: `placement-floor-${item.key}`,
        top: item.bottom,
        bottom: wallBottom,
        referenceX: wallLeft,
        label: formatMeasurementFromInches(item.placement.distanceFromFloorInches, measurementDisplayUnit),
      })),
    ...windowRenderItems
      .filter((item) => item.windowItem.distanceFromFloorInches > 0)
      .map((item) => ({
        key: `window-sill-${item.key}`,
        top: item.bottom,
        bottom: wallBottom,
        referenceX: wallLeft,
        label: formatMeasurementFromInches(item.windowItem.distanceFromFloorInches, measurementDisplayUnit),
      })),
    ...doorRenderItems
      .filter((item) => item.doorItem.distanceFromFloorInches > 0)
      .map((item) => ({
        key: `door-floor-${item.key}`,
        top: item.bottom,
        bottom: wallBottom,
        referenceX: wallLeft,
        label: formatMeasurementFromInches(item.doorItem.distanceFromFloorInches, measurementDisplayUnit),
      })),
  ].forEach((item) => {
    const top = Math.min(item.top, item.bottom);
    const bottom = Math.max(item.top, item.bottom);
    if (bottom - top < 2) return;

    const dedupeKey = `${Math.round(top)}:${Math.round(bottom)}:${item.label}`;
    const existing = clearanceDimensionMap.get(dedupeKey);
    if (!existing || item.referenceX < existing.referenceX) {
      clearanceDimensionMap.set(dedupeKey, { ...item, top, bottom });
    }
  });

  const heightDimensionMap = new Map<string, {
    key: string;
    top: number;
    bottom: number;
    referenceX: number;
    label: string;
  }>();

  [
    ...placementRenderItems.map((item) => ({
      key: `placement-height-${item.key}`,
      top: item.top,
      bottom: item.bottom,
      referenceX: wallLeft,
      label: formatMeasurementFromInches(item.placement.heightInches, measurementDisplayUnit),
    })),
    ...windowRenderItems.map((item) => ({
      key: `window-height-${item.key}`,
      top: item.top,
      bottom: item.bottom,
      referenceX: wallLeft,
      label: formatMeasurementFromInches(item.windowItem.heightInches, measurementDisplayUnit),
    })),
    ...doorRenderItems.map((item) => ({
      key: `door-height-${item.key}`,
      top: item.top,
      bottom: item.bottom,
      referenceX: wallLeft,
      label: formatMeasurementFromInches(item.doorItem.heightInches, measurementDisplayUnit),
    })),
  ].forEach((item) => {
    const top = Math.min(item.top, item.bottom);
    const bottom = Math.max(item.top, item.bottom);
    if (bottom - top < 2) return;

    const dedupeKey = `${Math.round(top)}:${Math.round(bottom)}:${item.label}`;
    const existing = heightDimensionMap.get(dedupeKey);
    if (!existing || item.referenceX < existing.referenceX) {
      heightDimensionMap.set(dedupeKey, { ...item, top, bottom });
    }
  });

  const verticalDetailDimensionItems = [
    ...Array.from(heightDimensionMap.values()),
    ...Array.from(clearanceDimensionMap.values()),
  ].sort((left, right) => {
    if (left.top !== right.top) return left.top - right.top;
    if (left.bottom !== right.bottom) return left.bottom - right.bottom;
    return left.label.localeCompare(right.label);
  });

  const getElevationSvgPoint = (event: React.PointerEvent<SVGElement>): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    return {
      x: ((event.clientX - rect.left) / rect.width) * ELEVATION_VIEWBOX_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * ELEVATION_VIEWBOX_HEIGHT,
    };
  };

  const getWallTFromElevationRelativeCenterInches = (centerInches: number) => {
    const wallLength = distance(wall.start, wall.end);
    if (wallLength < 0.001) return 0;

    const wallDirection = normalize(sub(wall.end, wall.start));
    const axisScalarPixels = inchesToPixels(wallStartOffsetInches + centerInches);
    const floorPoint = add(
      elevationWallAxis.start,
      mul(elevationWallAxis.direction, axisScalarPixels)
    );

    return clamp(dot(sub(floorPoint, wall.start), wallDirection) / wallLength, 0, 1);
  };

  const getPeninWallMoveAlongCurrentElevationWall = (
    peninWall: Wall,
    anchorEndpoint: "start" | "end",
    normalSign: number,
    length: number,
    centerInches: number
  ): Wall => {
    const clampedCenterInches = clamp(centerInches, 0, wallLengthInches);
    const anchorPoint = add(
      elevationWallAxis.start,
      mul(elevationWallAxis.direction, inchesToPixels(wallStartOffsetInches + clampedCenterInches))
    );
    const hostDirection = normalize(sub(wall.end, wall.start));
    const hostNormal = normalize(perp(hostDirection));
    if (!vectorLength(hostNormal)) return peninWall;

    const freePoint = add(anchorPoint, mul(hostNormal, length * normalSign));
    return anchorEndpoint === "start"
      ? { ...peninWall, start: anchorPoint, end: freePoint }
      : { ...peninWall, start: freePoint, end: anchorPoint };
  };

  const beginElevationDrag = (
    event: React.PointerEvent<SVGGElement>,
    dragState: ElevationDragState
  ) => {
    event.preventDefault();
    event.stopPropagation();
    elevationDragRef.current = dragState;
    elevationDragAlertRef.current = null;
    updateElevationInvalidPlacementDrag(null);
    setIsElevationDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  type ElevationPlacementDragResolution = {
    startInches: number;
    distanceFromFloorInches: number;
    blocked?: boolean;
    message?: string;
  };

  const getPlacementElevationDragResolution = (
    movingId: string,
    desiredStartInches: number,
    desiredDistanceFromFloorInches: number,
    widthInches: number,
    heightInches: number,
    category: PlacementCategory
  ): ElevationPlacementDragResolution => {
    const snapThresholdInches = 3;
    const overlapToleranceInches = 0.25;
    const minUsefulOverlapInches = 1;
    const wallEdgeBindingSnapThresholdInches = 0.35;

    const maxStartInches = Math.max(0, wallLengthInches - widthInches);
    const maxDistanceFromFloorInches = Math.max(0, wallHeightInches - heightInches);

    const resolveWallEdgeBoundedValue = (value: number, maxValue: number) => {
      if (value <= 0) return 0;
      if (value >= maxValue) return maxValue;
      if (value <= wallEdgeBindingSnapThresholdInches) return 0;
      if (maxValue - value <= wallEdgeBindingSnapThresholdInches) return maxValue;
      return value;
    };

    let startInches = resolveWallEdgeBoundedValue(desiredStartInches, maxStartInches);
    let distanceFromFloorInches = isElevationFloatingPlacement({ category, widthInches: widthInches })
      ? resolveWallEdgeBoundedValue(desiredDistanceFromFloorInches, maxDistanceFromFloorInches)
      : 0;

    type ElevationObstacleBox = {
      key: string;
      startInches: number;
      endInches: number;
      bottomInches: number;
      topInches: number;
      widthInches: number;
      heightInches: number;
      reservationSeverity?: ElevationCornerReservationSeverity;
      sourcePlacement?: PlacementElement;
    };

    const movingPlacement = placements.find((placementItem) => placementItem.id === movingId) ?? null;
    const movingRenderItem = placementRenderItems.find((item) => item.key === movingId) ?? null;

    const otherObstacleBoxes: ElevationObstacleBox[] = [
      ...placementRenderItems
        .filter((item) => item.key !== movingId)
        .map((item) => ({
          key: item.key,
          startInches: item.displayStartInches,
          endInches: item.displayStartInches + item.placement.widthInches,
          bottomInches: item.placement.distanceFromFloorInches,
          topInches: item.placement.distanceFromFloorInches + item.placement.heightInches,
          widthInches: item.placement.widthInches,
          heightInches: item.placement.heightInches,
        })),
      ...elevationCornerReservations.map((reservation) => ({
        key: reservation.key,
        startInches: reservation.startInches,
        endInches: reservation.startInches + reservation.widthInches,
        bottomInches: reservation.distanceFromFloorInches,
        topInches: reservation.distanceFromFloorInches + reservation.heightInches,
        widthInches: reservation.widthInches,
        heightInches: reservation.heightInches,
        reservationSeverity: reservation.severity,
        sourcePlacement: reservation.sourcePlacement,
      })),
    ];

    const getHorizontalOverlap = (candidateStart: number, other: ElevationObstacleBox) => {
      const candidateEnd = candidateStart + widthInches;
      return Math.min(candidateEnd, other.endInches) - Math.max(candidateStart, other.startInches);
    };

    const getVerticalOverlap = (candidateBottom: number, other: ElevationObstacleBox) => {
      const candidateTop = candidateBottom + heightInches;
      return Math.min(candidateTop, other.topInches) - Math.max(candidateBottom, other.bottomInches);
    };

    const buildCandidatePlacement = (candidateStart: number): PlacementElement | null => {
      if (!movingPlacement || !movingRenderItem) return null;
      const candidateActualStart = toPlacementActualStartInches(
        candidateStart,
        widthInches
      );
      const deltaPixels = inchesToPixels(
        candidateActualStart - movingRenderItem.relativeStartInches
      );
      return {
        ...movingPlacement,
        center: add(movingPlacement.center, mul(elevationWallAxis.direction, deltaPixels)),
      };
    };

    const placementPlanBoundsOverlap = (
      firstPlacement: Pick<PlacementElement, "center" | "width" | "depth" | "rotation">,
      secondPlacement: Pick<PlacementElement, "center" | "width" | "depth" | "rotation">
    ) => {
      const firstBounds = getRotatedRectBounds(
        firstPlacement.center,
        Math.max(1, firstPlacement.width - 1),
        Math.max(1, firstPlacement.depth - 1),
        firstPlacement.rotation
      );
      const secondBounds = getRotatedRectBounds(
        secondPlacement.center,
        Math.max(1, secondPlacement.width - 1),
        Math.max(1, secondPlacement.depth - 1),
        secondPlacement.rotation
      );
      const overlapX = Math.min(firstBounds.maxX, secondBounds.maxX) - Math.max(firstBounds.minX, secondBounds.minX);
      const overlapY = Math.min(firstBounds.maxY, secondBounds.maxY) - Math.max(firstBounds.minY, secondBounds.minY);
      return overlapX > 0.5 && overlapY > 0.5;
    };

    const candidateOverlapsObstacle = (
      candidateStart: number,
      candidateBottom: number,
      other: ElevationObstacleBox
    ) => {
      const horizontalOverlap = getHorizontalOverlap(candidateStart, other);
      const verticalOverlap = getVerticalOverlap(candidateBottom, other);
      if (horizontalOverlap <= overlapToleranceInches || verticalOverlap <= overlapToleranceInches) return false;
      if (!other.sourcePlacement) return true;
      if (other.reservationSeverity === "taken") return true;
      const candidatePlacement = buildCandidatePlacement(candidateStart);
      if (!candidatePlacement) return false;
      return placementPlanBoundsOverlap(candidatePlacement, other.sourcePlacement);
    };

    let bestHorizontalSnap: { startInches: number; distance: number } | null = null;
    otherObstacleBoxes.forEach((other) => {
      if (getVerticalOverlap(distanceFromFloorInches, other) <= minUsefulOverlapInches) return;

      const snapToOtherLeft = other.startInches - widthInches;
      const snapToOtherRight = other.endInches;
      const leftDistance = Math.abs(startInches - snapToOtherLeft);
      const rightDistance = Math.abs(startInches - snapToOtherRight);

      if (leftDistance <= snapThresholdInches && snapToOtherLeft >= 0 && snapToOtherLeft <= maxStartInches) {
        bestHorizontalSnap = !bestHorizontalSnap || leftDistance < bestHorizontalSnap.distance
          ? { startInches: snapToOtherLeft, distance: leftDistance }
          : bestHorizontalSnap;
      }

      if (rightDistance <= snapThresholdInches && snapToOtherRight >= 0 && snapToOtherRight <= maxStartInches) {
        bestHorizontalSnap = !bestHorizontalSnap || rightDistance < bestHorizontalSnap.distance
          ? { startInches: snapToOtherRight, distance: rightDistance }
          : bestHorizontalSnap;
      }
    });

    const horizontalSnap = bestHorizontalSnap as { startInches: number; distance: number } | null;
    if (horizontalSnap) {
      startInches = clamp(horizontalSnap.startInches, 0, Math.max(0, wallLengthInches - widthInches));
    }

    if (isElevationFloatingPlacement({ category, widthInches: widthInches })) {
      let bestVerticalSnap: { bottomInches: number; distance: number; message?: string } | null = null;

      otherObstacleBoxes.forEach((other) => {
        if (getHorizontalOverlap(startInches, other) <= minUsefulOverlapInches) return;

        const snapAboveBottom = other.topInches;
        const snapUnderBottom = other.bottomInches - heightInches;
        const aboveDistance = Math.abs(distanceFromFloorInches - snapAboveBottom);
        const underDistance = Math.abs(distanceFromFloorInches - snapUnderBottom);

        if (aboveDistance <= snapThresholdInches) {
          const message = snapAboveBottom + heightInches > wallHeightInches + overlapToleranceInches
            ? "Cannot stack this wall cabinet because it would go beyond the ceiling height."
            : undefined;
          if (message || (snapAboveBottom >= 0 && snapAboveBottom <= maxDistanceFromFloorInches)) {
            bestVerticalSnap = !bestVerticalSnap || aboveDistance < bestVerticalSnap.distance
              ? { bottomInches: snapAboveBottom, distance: aboveDistance, message }
              : bestVerticalSnap;
          }
        }

        if (underDistance <= snapThresholdInches && snapUnderBottom >= 0 && snapUnderBottom <= maxDistanceFromFloorInches) {
          bestVerticalSnap = !bestVerticalSnap || underDistance < bestVerticalSnap.distance
            ? { bottomInches: snapUnderBottom, distance: underDistance }
            : bestVerticalSnap;
        }
      });

      const selectedVerticalSnap = bestVerticalSnap as { bottomInches: number; distance: number; message?: string } | null;
      if (selectedVerticalSnap?.message) {
        return { startInches, distanceFromFloorInches, blocked: true, message: selectedVerticalSnap.message };
      }

      if (selectedVerticalSnap) {
        distanceFromFloorInches = clamp(selectedVerticalSnap.bottomInches, 0, Math.max(0, wallHeightInches - heightInches));
      }
    }

    const hasPlacementOverlap = (candidateStart: number, candidateBottom: number) =>
      otherObstacleBoxes.some((other) => candidateOverlapsObstacle(candidateStart, candidateBottom, other));

    if (hasPlacementOverlap(startInches, distanceFromFloorInches)) {
      type ElevationResolutionCandidate = {
        startInches: number;
        distanceFromFloorInches: number;
        distance: number;
        message?: string;
      };

      const verticalResolutionCandidates: ElevationResolutionCandidate[] = isElevationFloatingPlacement({ category, widthInches: widthInches })
        ? otherObstacleBoxes.reduce<ElevationResolutionCandidate[]>((candidates, other) => {
            if (getHorizontalOverlap(startInches, other) <= minUsefulOverlapInches) return candidates;
            candidates.push(
              {
                startInches,
                distanceFromFloorInches: other.topInches,
                distance: Math.abs(distanceFromFloorInches - other.topInches),
                message: other.topInches + heightInches > wallHeightInches + overlapToleranceInches
                  ? "Cannot stack this wall cabinet because it would go beyond the ceiling height."
                  : undefined,
              },
              {
                startInches,
                distanceFromFloorInches: other.bottomInches - heightInches,
                distance: Math.abs(distanceFromFloorInches - (other.bottomInches - heightInches)),
              }
            );
            return candidates;
          }, [])
        : [];

      const horizontalResolutionCandidates: ElevationResolutionCandidate[] = otherObstacleBoxes.reduce<ElevationResolutionCandidate[]>((candidates, other) => {
        if (getVerticalOverlap(distanceFromFloorInches, other) <= minUsefulOverlapInches) return candidates;
        candidates.push(
          {
            startInches: other.startInches - widthInches,
            distanceFromFloorInches,
            distance: Math.abs(startInches - (other.startInches - widthInches)),
          },
          {
            startInches: other.endInches,
            distanceFromFloorInches,
            distance: Math.abs(startInches - other.endInches),
          }
        );
        return candidates;
      }, []);

      const resolutionCandidate = [...verticalResolutionCandidates, ...horizontalResolutionCandidates]
        .filter((candidate) => {
          if (candidate.message) return true;
          if (candidate.startInches < -overlapToleranceInches) return false;
          if (candidate.startInches + widthInches > wallLengthInches + overlapToleranceInches) return false;
          if (candidate.distanceFromFloorInches < -overlapToleranceInches) return false;
          if (candidate.distanceFromFloorInches + heightInches > wallHeightInches + overlapToleranceInches) return false;
          return !hasPlacementOverlap(
            clamp(candidate.startInches, 0, Math.max(0, wallLengthInches - widthInches)),
            clamp(candidate.distanceFromFloorInches, 0, Math.max(0, wallHeightInches - heightInches))
          );
        })
        .sort((left, right) => left.distance - right.distance)[0];

      if (resolutionCandidate?.message) {
        return { startInches, distanceFromFloorInches, blocked: true, message: resolutionCandidate.message };
      }

      if (resolutionCandidate) {
        return {
          startInches: clamp(resolutionCandidate.startInches, 0, Math.max(0, wallLengthInches - widthInches)),
          distanceFromFloorInches: isElevationFloatingPlacement({ category, widthInches: widthInches })
            ? clamp(resolutionCandidate.distanceFromFloorInches, 0, Math.max(0, wallHeightInches - heightInches))
            : 0,
        };
      }

      return { startInches, distanceFromFloorInches, blocked: true };
    }

    return { startInches, distanceFromFloorInches };
  };

  const getElevationGuideSnappedPlacementDrag = (
    movingId: string,
    startInches: number,
    distanceFromFloorInches: number,
    widthInches: number,
    heightInches: number,
    category: PlacementCategory,
    depthVisualOffsetInches: number
  ): ElevationPlacementDragResolution & { didSnap: boolean } => {
    const snapThresholdPx = 9;
    const maxStartInches = Math.max(0, wallLengthInches - widthInches);
    const maxDistanceFromFloorInches = Math.max(0, wallHeightInches - heightInches);
    const displayStartInches =
      toPlacementDisplayStartInches(startInches, widthInches) +
      depthVisualOffsetInches;
    const left = wallLeft + displayStartInches * renderScale;
    const right = left + widthInches * renderScale;
    const centerX = left + (widthInches * renderScale) / 2;
    const bottom = wallBottom - distanceFromFloorInches * renderScale;
    const top = bottom - heightInches * renderScale;
    const centerY = top + (heightInches * renderScale) / 2;

    let snappedStartInches = startInches;
    let snappedDistanceFromFloorInches = distanceFromFloorInches;
    let bestXDistance = snapThresholdPx + 1;
    let bestYDistance = snapThresholdPx + 1;

    const otherBoxes = elevationObjectBoxes.filter((box) => box.key !== movingId);
    const xReferences = [
      ...otherBoxes.flatMap((box) => [box.left, box.centerX, box.right]),
      (wallLeft + wallRight) / 2,
    ];
    const yReferences = [
      ...otherBoxes.flatMap((box) => [box.top, box.centerY, box.bottom]),
      (wallTop + wallBottom) / 2,
    ];

    const xCandidates = [
      {
        value: left,
        toStartInches: (target: number) =>
          toPlacementActualStartInches(
            (target - wallLeft) / renderScale - depthVisualOffsetInches,
            widthInches
          ),
      },
      {
        value: centerX,
        toStartInches: (target: number) =>
          toPlacementActualStartInches(
            (target - wallLeft) / renderScale -
              widthInches / 2 -
              depthVisualOffsetInches,
            widthInches
          ),
      },
      {
        value: right,
        toStartInches: (target: number) =>
          toPlacementActualStartInches(
            (target - wallLeft) / renderScale -
              widthInches -
              depthVisualOffsetInches,
            widthInches
          ),
      },
    ];

    xCandidates.forEach((candidate) => {
      xReferences.forEach((referenceX) => {
        const distancePx = Math.abs(candidate.value - referenceX);
        if (distancePx <= snapThresholdPx && distancePx < bestXDistance) {
          bestXDistance = distancePx;
          snappedStartInches = clamp(candidate.toStartInches(referenceX), 0, maxStartInches);
        }
      });
    });

    if (isElevationFloatingPlacement({ category, widthInches: widthInches })) {
      const yCandidates = [
        {
          value: top,
          toDistanceFromFloorInches: (target: number) =>
            (wallBottom - target) / renderScale - heightInches,
        },
        {
          value: centerY,
          toDistanceFromFloorInches: (target: number) =>
            (wallBottom - target) / renderScale - heightInches / 2,
        },
        {
          value: bottom,
          toDistanceFromFloorInches: (target: number) =>
            (wallBottom - target) / renderScale,
        },
      ];

      yCandidates.forEach((candidate) => {
        yReferences.forEach((referenceY) => {
          const distancePx = Math.abs(candidate.value - referenceY);
          if (distancePx <= snapThresholdPx && distancePx < bestYDistance) {
            bestYDistance = distancePx;
            snappedDistanceFromFloorInches = clamp(
              candidate.toDistanceFromFloorInches(referenceY),
              0,
              maxDistanceFromFloorInches
            );
          }
        });
      });
    }

    if (
      Math.abs(snappedStartInches - startInches) <= 0.001 &&
      Math.abs(snappedDistanceFromFloorInches - distanceFromFloorInches) <= 0.001
    ) {
      return { startInches, distanceFromFloorInches, didSnap: false };
    }

    const snappedResolution = getPlacementElevationDragResolution(
      movingId,
      snappedStartInches,
      snappedDistanceFromFloorInches,
      widthInches,
      heightInches,
      category
    );

    if (snappedResolution.blocked) {
      return { startInches, distanceFromFloorInches, didSnap: false };
    }

    return {
      ...snappedResolution,
      didSnap:
        Math.abs(snappedResolution.startInches - startInches) > 0.001 ||
        Math.abs(snappedResolution.distanceFromFloorInches - distanceFromFloorInches) > 0.001,
    };
  };

  const handleElevationPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const dragState = elevationDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const point = getElevationSvgPoint(event);
    if (!point) return;

    event.preventDefault();

    if (dragState.kind === "window") {
      const halfWidth = Math.min(dragState.widthInches / 2, wallLengthInches / 2);
      const nextCenterInches = clamp(
        (point.x - wallLeft) / renderScale - dragState.grabOffsetCenterXInches,
        halfWidth,
        Math.max(halfWidth, wallLengthInches - halfWidth)
      );
      const nextDistanceFromFloor = clamp(
        (wallBottom - point.y) / renderScale - dragState.grabOffsetBottomYInches,
        0,
        Math.max(0, wallHeightInches - dragState.heightInches)
      );

      const nextWindowLayout = getElevationOpeningLayoutFromCenter(
        wallLengthInches,
        dragState.widthInches,
        nextCenterInches
      );
      const nextWindowLeft = wallLeft + nextWindowLayout.startInches * renderScale;
      const nextWindowRight = nextWindowLeft + nextWindowLayout.widthInches * renderScale;
      const nextWindowBottom = wallBottom - nextDistanceFromFloor * renderScale;
      const nextWindowTop = nextWindowBottom - dragState.heightInches * renderScale;
      setElevationAlignmentGuides(getElevationAlignmentGuidesForBox({
        key: dragState.id,
        left: nextWindowLeft,
        right: nextWindowRight,
        top: nextWindowTop,
        bottom: nextWindowBottom,
        centerX: (nextWindowLeft + nextWindowRight) / 2,
        centerY: (nextWindowTop + nextWindowBottom) / 2,
      }, dragState.id));

      const nextActualCenterInches = toElevationActualCenterInches(
        nextCenterInches,
        dragState.widthInches
      );

      onUpdateWindow(dragState.id, {
        t: getWallTFromElevationRelativeCenterInches(nextActualCenterInches),
        distanceFromFloorInches: nextDistanceFromFloor,
      });
      elevationDragRef.current = dragState;
      return;
    }

    if (dragState.kind === "door") {
      const halfWidth = Math.min(dragState.widthInches / 2, wallLengthInches / 2);
      const nextCenterInches = clamp(
        (point.x - wallLeft) / renderScale - dragState.grabOffsetCenterXInches,
        halfWidth,
        Math.max(halfWidth, wallLengthInches - halfWidth)
      );
      const nextDistanceFromFloor = clamp(
        (wallBottom - point.y) / renderScale - dragState.grabOffsetBottomYInches,
        0,
        Math.max(0, wallHeightInches - dragState.heightInches)
      );

      const nextDoorLayout = getElevationOpeningLayoutFromCenter(
        wallLengthInches,
        dragState.widthInches,
        nextCenterInches
      );
      const nextDoorLeft = wallLeft + nextDoorLayout.startInches * renderScale;
      const nextDoorRight = nextDoorLeft + nextDoorLayout.widthInches * renderScale;
      const nextDoorBottom = wallBottom - nextDistanceFromFloor * renderScale;
      const nextDoorTop = nextDoorBottom - dragState.heightInches * renderScale;
      setElevationAlignmentGuides(getElevationAlignmentGuidesForBox({
        key: dragState.id,
        left: nextDoorLeft,
        right: nextDoorRight,
        top: nextDoorTop,
        bottom: nextDoorBottom,
        centerX: (nextDoorLeft + nextDoorRight) / 2,
        centerY: (nextDoorTop + nextDoorBottom) / 2,
      }, dragState.id));

      const nextActualCenterInches = toElevationActualCenterInches(
        nextCenterInches,
        dragState.widthInches
      );

      onUpdateDoor(dragState.id, {
        t: getWallTFromElevationRelativeCenterInches(nextActualCenterInches),
        distanceFromFloorInches: nextDistanceFromFloor,
      });
      elevationDragRef.current = dragState;
      return;
    }

    if (dragState.kind === "penin-wall") {
      if (isPeninElevationWall) return;

      const halfWidth = Math.min(dragState.widthInches / 2, wallLengthInches / 2);
      const nextCenterInches = clamp(
        (point.x - wallLeft) / renderScale - dragState.grabOffsetCenterXInches,
        halfWidth,
        Math.max(halfWidth, wallLengthInches - halfWidth)
      );
      const nextActualCenterInches = toElevationActualCenterInches(
        nextCenterInches,
        dragState.widthInches
      );
      const movedPeninWall = getPeninWallMoveAlongCurrentElevationWall(
        dragState.startWall,
        dragState.anchorEndpoint,
        dragState.normalSign,
        dragState.length,
        nextActualCenterInches
      );
      if (
        detachedPanelWallIntersectsFloorPlacement(
          movedPeninWall,
          placements,
          calculationWalls.filter((candidateWall) => isThickWall(candidateWall) && !isDetachedPanelWall(candidateWall)),
          calculationWalls,
          dragState.id
        )
      ) {
        return;
      }

      const nextLeft = wallLeft + (nextCenterInches - dragState.widthInches / 2) * renderScale;
      const nextRight = nextLeft + dragState.widthInches * renderScale;
      const nextBottom = wallBottom;
      const nextTop = wallBottom - PENIN_WALL_ELEVATION_HEIGHT_INCHES * renderScale;
      setElevationAlignmentGuides(getElevationAlignmentGuidesForBox({
        key: dragState.id,
        left: nextLeft,
        right: nextRight,
        top: nextTop,
        bottom: nextBottom,
        centerX: (nextLeft + nextRight) / 2,
        centerY: (nextTop + nextBottom) / 2,
      }, dragState.id));

      onUpdateWall(dragState.id, {
        start: movedPeninWall.start,
        end: movedPeninWall.end,
      });
      elevationDragRef.current = dragState;
      return;
    }

    // Elevation drag only moves the cabinet along the viewed wall and in height.
    // It intentionally preserves the wall-normal depth from the floor plan.
    // Keep the original pointer-to-cabinet grab offset while dragging. Do not
    // rebase the drag start on every pointer move, because wall-edge clamping or
    // snapping would otherwise change that grab offset and make the cabinet
    // visibly drift away from the cursor.
    const desiredDisplayStartInches = (point.x - wallLeft) / renderScale - dragState.grabOffsetXInches;
    const desiredStartInches = toPlacementActualStartInches(
      desiredDisplayStartInches - dragState.depthVisualOffsetInches,
      dragState.widthInches
    );
    const desiredDistanceFromFloor = isElevationFloatingPlacement({ category: dragState.category, widthInches: dragState.widthInches })
      ? (wallBottom - point.y) / renderScale - dragState.grabOffsetBottomYInches
      : 0;

    const resolvedPlacementDrag = getPlacementElevationDragResolution(
      dragState.id,
      desiredStartInches,
      desiredDistanceFromFloor,
      dragState.widthInches,
      dragState.heightInches,
      dragState.category
    );

    if (resolvedPlacementDrag.blocked) {
      setElevationAlignmentGuides([]);
      updateElevationInvalidPlacementDrag({
        id: dragState.id,
        message: resolvedPlacementDrag.message ?? WALL_PLACEMENT_ELEVATION_OVERLAP_MESSAGE,
      });
      return;
    }

    updateElevationInvalidPlacementDrag(null);
    const snappedPlacementDrag = getElevationGuideSnappedPlacementDrag(
      dragState.id,
      resolvedPlacementDrag.startInches,
      resolvedPlacementDrag.distanceFromFloorInches,
      dragState.widthInches,
      dragState.heightInches,
      dragState.category,
      dragState.depthVisualOffsetInches
    );
    const finalPlacementDrag = snappedPlacementDrag.didSnap ? snappedPlacementDrag : resolvedPlacementDrag;
    const resolvedStartInches = finalPlacementDrag.startInches;
    const nextDistanceFromFloor = finalPlacementDrag.distanceFromFloorInches;
    const resolvedDisplayStartInches = clamp(
      toPlacementDisplayStartInches(
        resolvedStartInches,
        dragState.widthInches
      ) + dragState.depthVisualOffsetInches,
      0,
      Math.max(0, wallLengthInches - dragState.widthInches)
    );

    const startDeltaPixels = inchesToPixels(resolvedStartInches - dragState.startStartInches);
    const nextCenter = add(
      dragState.startCenter,
      mul(elevationWallAxis.direction, startDeltaPixels)
    );

    const nextPlacementLeft = wallLeft + resolvedDisplayStartInches * renderScale;
    const nextPlacementRight = nextPlacementLeft + dragState.widthInches * renderScale;
    const nextPlacementBottom = wallBottom - nextDistanceFromFloor * renderScale;
    const nextPlacementTop = nextPlacementBottom - dragState.heightInches * renderScale;
    setElevationAlignmentGuides(getElevationAlignmentGuidesForBox({
      key: dragState.id,
      left: nextPlacementLeft,
      right: nextPlacementRight,
      top: nextPlacementTop,
      bottom: nextPlacementBottom,
      centerX: (nextPlacementLeft + nextPlacementRight) / 2,
      centerY: (nextPlacementTop + nextPlacementBottom) / 2,
    }, dragState.id));

    onUpdatePlacement(dragState.id, {
      center: nextCenter,
      distanceFromFloorInches: nextDistanceFromFloor,
    });
    elevationDragRef.current = dragState;
  };

  const stopElevationDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    const dragState = elevationDragRef.current;
    if (dragState && dragState.pointerId === event.pointerId) {
      if (dragState.kind === "placement") {
        const invalidDrag = elevationInvalidPlacementDragRef.current;
        if (invalidDrag?.id === dragState.id) {
          onAlert(invalidDrag.message);
          onUpdatePlacement(dragState.id, {
            center: dragState.startCenter,
            distanceFromFloorInches: dragState.startDistanceFromFloorInches,
          });
        } else {
          const finishedPlacement = placements.find((placementItem) => placementItem.id === dragState.id);
          if (finishedPlacement) {
            const ruleMessage = getPlacementRuleViolationMessage(
              finishedPlacement,
              placements,
              calculationWalls,
              finishedPlacement.id,
              true
            );
            if (ruleMessage) {
              onAlert(ruleMessage);
              onUpdatePlacement(dragState.id, {
                center: dragState.startCenter,
                distanceFromFloorInches: dragState.startDistanceFromFloorInches,
              });
            }
          }
        }
      }

      elevationDragRef.current = null;
      elevationDragAlertRef.current = null;
      updateElevationInvalidPlacementDrag(null);
      setIsElevationDragging(false);
      setElevationAlignmentGuides([]);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f5f5f5]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-slate-200 bg-white px-5 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-pelican-navy">
            Wall {activeIndex + 1} of {walls.length}
          </div>
          <div className="hidden text-xs text-slate-500">
            Wall {activeIndex + 1} of {walls.length} · {overallLengthLabel} wide
          </div>
        </div>

        <div className="flex justify-center">
          <div className="flex w-full max-w-[240px] flex-col items-center gap-1">
            <label
              htmlFor="elevation-plan-view-mode"
              className="text-[11px] font-bold uppercase tracking-wide text-pelican-navy"
            >
              Elevation view
            </label>
            <select
              id="elevation-plan-view-mode"
              value={currentElevationViewMode}
              onChange={(event) => {
                window.dispatchEvent(
                  new CustomEvent("pelican-wall-elevation-view-change", {
                    detail: {
                      id: wall.id,
                      value: event.target.value as WallElevationViewMode,
                    },
                  })
                );
              }}
              disabled={!isThickWall(wall)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-pelican-teal"
            >
              <option value="interior">Interior side</option>
              <option value="exterior">Exterior side</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onPrevious}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            aria-label="Previous wall elevation"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            aria-label="Next wall elevation"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-6">
        <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <svg
            ref={svgRef}
            className={cn("h-full w-full", isElevationDragging && "cursor-grabbing")}
            viewBox={`0 0 ${ELEVATION_VIEWBOX_WIDTH} ${ELEVATION_VIEWBOX_HEIGHT}`}
            onPointerDown={(event) => {
              if (event.button !== 0 || isElevationDragging) return;
              onClearSelection();
            }}
            onPointerMove={handleElevationPointerMove}
            onPointerUp={stopElevationDrag}
            onPointerCancel={stopElevationDrag}
            onPointerLeave={stopElevationDrag}
          >
            <defs>
              <pattern id="elevation-reservation-cabinet-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="12" stroke="#64748b" strokeWidth="2" opacity="0.3" />
              </pattern>
              <pattern id="elevation-reservation-caution-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="12" stroke="#64748b" strokeWidth="2" opacity="0.3" />
              </pattern>
              <pattern id="elevation-reservation-taken-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="12" stroke="#64748b" strokeWidth="2" opacity="0.3" />
              </pattern>
            </defs>
            <rect x="0" y="0" width={ELEVATION_VIEWBOX_WIDTH} height={ELEVATION_VIEWBOX_HEIGHT} fill="#ffffff" />

            <line x1={wallLeft} y1={wallBottom} x2={wallLeft + wallRenderWidth} y2={wallBottom} stroke="#d1d5db" strokeWidth="2" />
            <rect
              x={wallLeft}
              y={wallTop}
              width={wallRenderWidth}
              height={wallRenderHeight}
              fill="#d9d9d9"
              stroke="#9ca3af"
              strokeWidth="2"
            />

            {isPeninElevationWall && (
              <text
                x={wallLeft + wallRenderWidth / 2}
                y={wallTop + Math.max(36, Math.min(90, wallRenderHeight * 0.18))}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#334155"
                fontSize="20"
                fontWeight="700"
                pointerEvents="none"
              >
                {isIslandWall(wall) ? "Island" : "Peninsula Wall"}
              </text>
            )}

            {selfPeninWallRenderItem && (
              <ElevationPeninWallFace
                key={selfPeninWallRenderItem.key}
                x={selfPeninWallRenderItem.left}
                y={selfPeninWallRenderItem.top}
                width={selfPeninWallRenderItem.width}
                height={selfPeninWallRenderItem.height}
              />
            )}

            {peninWallRenderItems.map((item) => {
              const selected = item.placement.wall.id === selectedWallId;
              return (
                <ElevationPeninWallFace
                  key={item.key}
                  x={item.left}
                  y={item.top}
                  width={item.width}
                  height={item.height}
                  selected={selected}
                  className={isElevationDragging ? "cursor-grabbing" : "cursor-move"}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const startPointer = getElevationSvgPoint(event);
                    const attachment = getPeninWallAttachmentToWall(item.placement.wall, wall);
                    onSelectWall(item.placement.wall.id);
                    if (!startPointer || !attachment) return;
                    beginElevationDrag(event, {
                      kind: "penin-wall",
                      id: item.placement.wall.id,
                      pointerId: event.pointerId,
                      startPointer,
                      startWall: item.placement.wall,
                      hostWallId: wall.id,
                      anchorEndpoint: attachment.endpoint,
                      normalSign: attachment.normalSign,
                      length: attachment.length,
                      grabOffsetCenterXInches: (startPointer.x - (item.left + item.width / 2)) / renderScale,
                      widthInches: item.placement.widthInches,
                      startWalls: calculationWalls,
                    });
                  }}
                />
              );
            })}

            {reservationRenderItems.map((item) => {
              const isTaken = item.reservation.severity === "taken";
              const fill = "rgba(148, 163, 184, 0.18)";
              const hatch = "url(#elevation-reservation-cabinet-hatch)";
              const stroke = "#64748b";
              const labelColor = "#334155";
              const lineGap = Math.min(22, Math.max(14, item.height * 0.18));
              const titleY = item.top + item.height / 2 - lineGap / 2;
              const subtitleY = item.top + item.height / 2 + lineGap / 2;
              const titleFontSize = Math.max(10, Math.min(16, item.width * 0.08));
              const subtitleFontSize = Math.max(9, titleFontSize - 2);
              return (
                <g key={item.key} pointerEvents="none">
                  <rect
                    x={item.left}
                    y={item.top}
                    width={item.width}
                    height={item.height}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="2"
                    strokeDasharray="10 8"
                    vectorEffect="non-scaling-stroke"
                  />
                  <rect
                    x={item.left}
                    y={item.top}
                    width={item.width}
                    height={item.height}
                    fill={hatch}
                    opacity={isTaken ? 1 : 0.95}
                  />
                  <text
                    x={item.left + item.width / 2}
                    y={titleY}
                    textAnchor="middle"
                    fontSize={titleFontSize}
                    fontWeight="700"
                    fill={labelColor}
                  >
                    {item.reservation.title}
                  </text>
                  <text
                    x={item.left + item.width / 2}
                    y={subtitleY}
                    textAnchor="middle"
                    fontSize={subtitleFontSize}
                    fontStyle="italic"
                    fill={labelColor}
                    opacity="0.95"
                  >
                    {isTaken ? "taken area" : "cabinet here"}
                  </text>
                </g>
              );
            })}

            {showMeasurements && (
              <>
                <ElevationDimensionLine
                  x1={wallLeft}
                  y1={topOverallDimensionY}
                  x2={wallLeft + wallRenderWidth}
                  y2={topOverallDimensionY}
                  label={overallLengthLabel}
                  textOffset={-12}
                />

                <ElevationDimensionLine
                  x1={wallLeft}
                  y1={bottomOverallDimensionY}
                  x2={wallLeft + wallRenderWidth}
                  y2={bottomOverallDimensionY}
                  label={overallLengthLabel}
                  textOffset={16}
                />

                <ElevationDimensionLine
                  x1={leftOverallDimensionX}
                  y1={wallTop}
                  x2={leftOverallDimensionX}
                  y2={wallBottom}
                  label={overallHeightLabel}
                  rotateText
                  textOffset={-30}
                />
              </>
            )}

            {windowRenderItems.map((windowItem) => {
              const selected = windowItem.key === selectedWindowId;
              const stroke = selected ? "#22bfd6" : "#111827";
              const strokeWidth = selected ? 3 : 2;
              return (
                <g
                  key={windowItem.key}
                  className={isElevationDragging ? "cursor-grabbing" : "cursor-move"}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const startPointer = getElevationSvgPoint(event);
                    onSelectWindow(windowItem.key);
                    if (!startPointer) return;
                    beginElevationDrag(event, {
                      kind: "window",
                      id: windowItem.key,
                      pointerId: event.pointerId,
                      startPointer,
                      startCenterInches: windowItem.layout.centerInches,
                      startDistanceFromFloorInches: windowItem.windowItem.distanceFromFloorInches,
                      grabOffsetCenterXInches: (startPointer.x - (wallLeft + windowItem.layout.centerInches * renderScale)) / renderScale,
                      grabOffsetBottomYInches: ((wallBottom - windowItem.windowItem.distanceFromFloorInches * renderScale) - startPointer.y) / renderScale,
                      widthInches: windowItem.layout.widthInches,
                      heightInches: windowItem.windowItem.heightInches,
                    });
                  }}
                >
                  <rect x={windowItem.left} y={windowItem.top} width={windowItem.width} height={windowItem.height} fill="#f1ede4" stroke={stroke} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
                  <rect x={windowItem.left + 8} y={windowItem.top + 8} width={Math.max(0, windowItem.width - 16)} height={Math.max(0, windowItem.height - 16)} fill="#fafaf9" stroke={stroke} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  <line x1={windowItem.left + windowItem.width / 2} y1={windowItem.top + 8} x2={windowItem.left + windowItem.width / 2} y2={windowItem.top + windowItem.height - 8} stroke="#111827" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                  <line x1={windowItem.left + 8} y1={windowItem.top + windowItem.height / 2} x2={windowItem.left + windowItem.width - 8} y2={windowItem.top + windowItem.height / 2} stroke="#111827" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                </g>
              );
            })}

            {doorRenderItems.map((doorItem) => {
              const selected = doorItem.key === selectedDoorId;
              const stroke = selected ? "#22bfd6" : "#111827";
              const strokeWidth = selected ? 3 : 2;
              return (
                <g
                  key={doorItem.key}
                  className={isElevationDragging ? "cursor-grabbing" : "cursor-move"}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const startPointer = getElevationSvgPoint(event);
                    onSelectDoor(doorItem.key);
                    if (!startPointer) return;
                    beginElevationDrag(event, {
                      kind: "door",
                      id: doorItem.key,
                      pointerId: event.pointerId,
                      startPointer,
                      startCenterInches: doorItem.layout.centerInches,
                      startDistanceFromFloorInches: doorItem.doorItem.distanceFromFloorInches,
                      grabOffsetCenterXInches: (startPointer.x - (wallLeft + doorItem.layout.centerInches * renderScale)) / renderScale,
                      grabOffsetBottomYInches: ((wallBottom - doorItem.doorItem.distanceFromFloorInches * renderScale) - startPointer.y) / renderScale,
                      widthInches: doorItem.layout.widthInches,
                      heightInches: doorItem.doorItem.heightInches,
                    });
                  }}
                >
                  <rect x={doorItem.left} y={doorItem.top} width={doorItem.width} height={doorItem.height} fill="#d6dee8" stroke={stroke} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
                  <rect x={doorItem.left + 10} y={doorItem.top + 10} width={Math.max(0, doorItem.width - 20)} height={Math.max(0, doorItem.height - 20)} fill="#f8fafc" opacity="0.65" />
                  <circle cx={doorItem.left + doorItem.width - 14} cy={doorItem.top + doorItem.height / 2} r="4" fill="#6b7280" />
                </g>
              );
            })}

            {placementDrawItems.map((placementItem) => {
              const selected = placementItem.key === selectedPlacementId;
              return (
                <g
                  key={`elevation-placement-body-${placementItem.key}`}
                  className={isElevationDragging ? "cursor-grabbing" : "cursor-move"}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const startPointer = getElevationSvgPoint(event);
                    onSelectPlacement(placementItem.key);
                    if (!startPointer) return;
                    beginElevationDrag(event, {
                      kind: "placement",
                      id: placementItem.key,
                      pointerId: event.pointerId,
                      startPointer,
                      startCenter: placementItem.placement.placement.center,
                      startStartInches: placementItem.relativeStartInches,
                      startDisplayStartInches: placementItem.displayStartInches,
                      depthVisualOffsetInches: placementItem.depthShiftXInches,
                      startDistanceFromFloorInches: placementItem.placement.distanceFromFloorInches,
                      grabOffsetXInches: (startPointer.x - (wallLeft + placementItem.displayStartInches * renderScale)) / renderScale,
                      grabOffsetBottomYInches: ((wallBottom - placementItem.placement.distanceFromFloorInches * renderScale) - startPointer.y) / renderScale,
                      widthInches: placementItem.placement.widthInches,
                      heightInches: placementItem.placement.heightInches,
                      category: placementItem.placement.category,
                      startPlacements: placements,
                    });
                  }}
                >
                  <ElevationPlacementOnWall
                    x={placementItem.left}
                    y={placementItem.top}
                    width={placementItem.width}
                    height={placementItem.height}
                    category={placementItem.placement.category}
                    image={placementItem.placement.placement.image}
                    placement={placementItem.placement.placement}
                    selected={selected}
                    invalid={Boolean(placementItem.placement.stackOverflow) || elevationInvalidPlacementDrag?.id === placementItem.key}
                  />
                </g>
              );
            })}

            {elevationAlignmentGuides.map((guideItem, index) => (
              <ElevationAlignmentGuideOverlay key={`elevation-alignment-${index}`} guide={guideItem} />
            ))}

            {showMeasurements && topHorizontalDimensionItems.map((dimensionItem) => (
              <g key={dimensionItem.key} pointerEvents="none">
                <line x1={dimensionItem.left} y1={dimensionItem.anchorY} x2={dimensionItem.left} y2={topDetailDimensionY} stroke="#4f46e5" strokeWidth="1.4" opacity="0.75" />
                <line x1={dimensionItem.right} y1={dimensionItem.anchorY} x2={dimensionItem.right} y2={topDetailDimensionY} stroke="#4f46e5" strokeWidth="1.4" opacity="0.75" />
                <ElevationDimensionLine
                  x1={dimensionItem.left}
                  y1={topDetailDimensionY}
                  x2={dimensionItem.right}
                  y2={topDetailDimensionY}
                  label={dimensionItem.label}
                  textOffset={-10}
                  extensionTop={10}
                  extensionBottom={10}
                />
              </g>
            ))}

            {showMeasurements && bottomHorizontalDimensionItems.map((dimensionItem) => (
              <g key={dimensionItem.key} pointerEvents="none">
                <line x1={dimensionItem.left} y1={dimensionItem.anchorY} x2={dimensionItem.left} y2={bottomDetailDimensionY} stroke="#4f46e5" strokeWidth="1.4" opacity="0.75" />
                <line x1={dimensionItem.right} y1={dimensionItem.anchorY} x2={dimensionItem.right} y2={bottomDetailDimensionY} stroke="#4f46e5" strokeWidth="1.4" opacity="0.75" />
                <ElevationDimensionLine
                  x1={dimensionItem.left}
                  y1={bottomDetailDimensionY}
                  x2={dimensionItem.right}
                  y2={bottomDetailDimensionY}
                  label={dimensionItem.label}
                  textOffset={16}
                  extensionTop={10}
                  extensionBottom={10}
                />
              </g>
            ))}

            {showMeasurements && verticalDetailDimensionItems.map((dimensionItem) => (
              <g key={dimensionItem.key} pointerEvents="none">
                <line x1={leftDetailDimensionX} y1={dimensionItem.top} x2={wallLeft} y2={dimensionItem.top} stroke="#4f46e5" strokeWidth="1.4" opacity="0.75" />
                <line x1={leftDetailDimensionX} y1={dimensionItem.bottom} x2={wallLeft} y2={dimensionItem.bottom} stroke="#4f46e5" strokeWidth="1.4" opacity="0.75" />
                <ElevationDimensionLine
                  x1={leftDetailDimensionX}
                  y1={dimensionItem.top}
                  x2={leftDetailDimensionX}
                  y2={dimensionItem.bottom}
                  label={dimensionItem.label}
                  rotateText
                  textOffset={-32}
                  extensionTop={8}
                  extensionBottom={8}
                />
              </g>
            ))}

            <text
              x={ELEVATION_VIEWBOX_WIDTH / 2}
              y={ELEVATION_VIEWBOX_HEIGHT - 38}
              textAnchor="middle"
              className="fill-slate-700 text-[20px] font-semibold"
            >
              Wall {activeIndex + 1}
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}

export function ElevationDimensionLine({
  x1,
  y1,
  x2,
  y2,
  label,
  rotateText = false,
  textOffset = -10,
  extensionTop = 12,
  extensionBottom = 12,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  rotateText?: boolean;
  textOffset?: number;
  extensionTop?: number;
  extensionBottom?: number;
}) {
  const isVertical = Math.abs(x1 - x2) < Math.abs(y1 - y2);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const labelX = rotateText ? midX + textOffset : midX;
  const labelY = rotateText ? midY : midY + textOffset;
  const approxLabelWidth = Math.max(34, label.length * 12);
  const labelPaddingX = 8;
  const labelPaddingY = 5;
  const labelBoxWidth = approxLabelWidth + labelPaddingX * 2;
  const labelBoxHeight = rotateText ? 46 : 22 + labelPaddingY * 2;

  return (
    <g pointerEvents="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4f46e5" strokeWidth="1.6" />
      {isVertical ? (
        <>
          <line x1={x1 - extensionBottom / 2} y1={y1} x2={x1 + extensionBottom / 2} y2={y1} stroke="#4f46e5" strokeWidth="1.6" />
          <line x1={x2 - extensionTop / 2} y1={y2} x2={x2 + extensionTop / 2} y2={y2} stroke="#4f46e5" strokeWidth="1.6" />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - extensionBottom / 2} x2={x1} y2={y1 + extensionBottom / 2} stroke="#4f46e5" strokeWidth="1.6" />
          <line x1={x2} y1={y2 - extensionTop / 2} x2={x2} y2={y2 + extensionTop / 2} stroke="#4f46e5" strokeWidth="1.6" />
        </>
      )}
      <g transform={rotateText ? `rotate(-90 ${labelX} ${labelY})` : undefined}>
        <rect
          x={labelX - labelBoxWidth / 2}
          y={labelY - labelBoxHeight / 2}
          width={labelBoxWidth}
          height={labelBoxHeight}
          rx="4"
          fill="#ffffff"
          fillOpacity="0.96"
          pointerEvents="none"
        />
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white text-[20px] font-semibold"
          stroke="#ffffff"
          strokeWidth="5"
          strokeLinejoin="round"
        >
          {label}
        </text>
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-indigo-700 text-[20px] font-semibold"
        >
          {label}
        </text>
      </g>
    </g>
  );
}

export function ElevationAlignmentGuideOverlay({ guide }: { guide: ElevationAlignmentGuide }) {
  const stroke = "#d946ef";

  return (
    <g pointerEvents="none">
      {guide.kind === "vertical" ? (
        <line
          x1={guide.x}
          y1={guide.y1}
          x2={guide.x}
          y2={guide.y2}
          stroke={stroke}
          strokeWidth="1.5"
          strokeDasharray="5 5"
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <line
          x1={guide.x1}
          y1={guide.y}
          x2={guide.x2}
          y2={guide.y}
          stroke={stroke}
          strokeWidth="1.5"
          strokeDasharray="5 5"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {guide.label && guide.labelX !== undefined && guide.labelY !== undefined && (
        <g>
          <rect
            x={guide.labelX - 22}
            y={guide.labelY - 13}
            width={44}
            height={26}
            rx="10"
            fill={stroke}
            opacity="0.95"
          />
          <text
            x={guide.labelX}
            y={guide.labelY}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-white text-[14px] font-bold"
          >
            {guide.label}
          </text>
        </g>
      )}
    </g>
  );
}
