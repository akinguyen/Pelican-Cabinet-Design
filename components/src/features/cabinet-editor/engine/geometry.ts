import { getPlacementPlanOccupiedBounds } from "../components/placements/PlacementViews";
import { PLACEMENT_ROTATION_SNAP_ENTER_DEGREES, PLACEMENT_ROTATION_SNAP_STEP_DEGREES } from "../constants/placementConstants";
import { GRID_SIZE } from "../constants/editorConstants";
import { WALL_ATTACH_THRESHOLD } from "../constants/wallConstants";
import { closestPointOnSegment, getClosestEndpointPoint } from "./wallEngine";
import type { PlacementElement, MeasurementDisplayUnit, Point, SelectionRect, Wall } from "../types/editorTypes";

export function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;

  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index++) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y || 0.000001) + current.x;

    if (intersects) inside = !inside;
  }

  return inside;
}

export function segmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  const orientation = (p1: Point, p2: Point, p3: Point) => Math.sign(cross(sub(p2, p1), sub(p3, p1)));
  const onSegment = (p1: Point, p2: Point, p3: Point) =>
    Math.min(p1.x, p3.x) - 0.001 <= p2.x &&
    p2.x <= Math.max(p1.x, p3.x) + 0.001 &&
    Math.min(p1.y, p3.y) - 0.001 <= p2.y &&
    p2.y <= Math.max(p1.y, p3.y) + 0.001;

  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;

  return false;
}

export function normalizeDegrees(angle: number) {
  return ((angle % 360) + 360) % 360;
}

export function degreesToRadians(angle: number) {
  return (angle * Math.PI) / 180;
}

export function getAngleDegrees(center: Point, point: Point) {
  return (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI;
}

export function polarPoint(centerX: number, centerY: number, radius: number, angleDegrees: number) {
  const radians = degreesToRadians(angleDegrees);
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  };
}

export function placementSnapRotationToTick(
  rawRotation: number,
  currentSnappedRotation: number | null
): { rotation: number; snappedRotation: number | null } {
  void currentSnappedRotation;

  const normalizedRotation = normalizeDegrees(rawRotation);
  const nearestSnap = normalizeDegrees(
    Math.round(normalizedRotation / PLACEMENT_ROTATION_SNAP_STEP_DEGREES) * PLACEMENT_ROTATION_SNAP_STEP_DEGREES
  );

  if (placementShortestAngleDistance(normalizedRotation, nearestSnap) <= PLACEMENT_ROTATION_SNAP_ENTER_DEGREES) {
    return { rotation: nearestSnap, snappedRotation: nearestSnap };
  }

  return { rotation: normalizedRotation, snappedRotation: null };
}

export function placementShortestAngleDistance(leftAngle: number, rightAngle: number) {
  const difference = Math.abs(normalizeDegrees(leftAngle) - normalizeDegrees(rightAngle));
  return Math.min(difference, 360 - difference);
}

export function describeArc(centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarPoint(centerX, centerY, radius, startAngle);
  const end = polarPoint(centerX, centerY, radius, endAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export function interpolate(start: Point, end: Point, t: number): Point {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}

export function inchesToPixels(inches: number) {
  return (inches / 12) * GRID_SIZE;
}

export function pixelsToInches(pixelLength: number) {
  return (pixelLength / GRID_SIZE) * 12;
}

export function roundToQuarter(value: number) {
  return Math.round(value * 4) / 4;
}

export function formatDecimal(value: number) {
  return Number.isInteger(value) ? `${value}` : `${Number(value.toFixed(2))}`;
}

export function pointKey(point: Point) {
  return `${Math.round(point.x)}:${Math.round(point.y)}`;
}

export function samePoint(a: Point, b: Point) {
  return (
    Math.round(a.x) === Math.round(b.x) &&
    Math.round(a.y) === Math.round(b.y)
  );
}

export function getPreferredNormal(start: Point, end: Point): Point {
  const normal = getNormal(start, end);
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dy) < 0.001) return { x: 0, y: -1 };

  if (dy < 0) {
    return normal.y < 0 ? normal : { x: -normal.x, y: -normal.y };
  }

  if (dx >= 0) {
    return normal.y > 0 ? normal : { x: -normal.x, y: -normal.y };
  }

  return normal.y > 0 ? normal : { x: -normal.x, y: -normal.y };
}

export function placementPolarPoint(origin: Point, radius: number, angleDegrees: number): Point {
  const radians = (angleDegrees * Math.PI) / 180;

  return {
    x: origin.x + Math.cos(radians) * radius,
    y: origin.y - Math.sin(radians) * radius,
  };
}

export function getSelectionRect(start: Point, end: Point): SelectionRect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);

  return {
    x,
    y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function pointToSegmentDistance(point: Point, start: Point, end: Point) {
  const segment = sub(end, start);
  const lengthSquared = dot(segment, segment);

  if (lengthSquared === 0) return distance(point, start);

  const t = clamp(dot(sub(point, start), segment) / lengthSquared, 0, 1);
  const projection = add(start, mul(segment, t));

  return distance(point, projection);
}

export function placementIntersectsSelectionRect(placementItem: PlacementElement, rect: SelectionRect) {
  const bounds = getPlacementPlanOccupiedBounds(placementItem);

  return (
    bounds.minX <= rect.x + rect.width &&
    bounds.maxX >= rect.x &&
    bounds.minY <= rect.y + rect.height &&
    bounds.maxY >= rect.y
  );
}

export function wallIntersectsSelectionRect(wall: Wall, rect: SelectionRect) {
  if (pointInSelectionRect(wall.start, rect) || pointInSelectionRect(wall.end, rect)) {
    return true;
  }

  const topLeft = { x: rect.x, y: rect.y };
  const topRight = { x: rect.x + rect.width, y: rect.y };
  const bottomRight = { x: rect.x + rect.width, y: rect.y + rect.height };
  const bottomLeft = { x: rect.x, y: rect.y + rect.height };

  return (
    placementSegmentsIntersect(wall.start, wall.end, topLeft, topRight) ||
    placementSegmentsIntersect(wall.start, wall.end, topRight, bottomRight) ||
    placementSegmentsIntersect(wall.start, wall.end, bottomRight, bottomLeft) ||
    placementSegmentsIntersect(wall.start, wall.end, bottomLeft, topLeft)
  );
}

export function pointInSelectionRect(point: Point, rect: SelectionRect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function placementSegmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  const orientation1 = segmentOrientation(a, b, c);
  const orientation2 = segmentOrientation(a, b, d);
  const orientation3 = segmentOrientation(c, d, a);
  const orientation4 = segmentOrientation(c, d, b);

  if (orientation1 !== orientation2 && orientation3 !== orientation4) return true;

  if (orientation1 === 0 && pointOnSegment(c, a, b)) return true;
  if (orientation2 === 0 && pointOnSegment(d, a, b)) return true;
  if (orientation3 === 0 && pointOnSegment(a, c, d)) return true;
  if (orientation4 === 0 && pointOnSegment(b, c, d)) return true;

  return false;
}

export function segmentOrientation(a: Point, b: Point, c: Point) {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);

  if (Math.abs(value) < 0.0001) return 0;

  return value > 0 ? 1 : 2;
}

export function pointOnSegment(point: Point, segmentStart: Point, segmentEnd: Point) {
  return (
    point.x <= Math.max(segmentStart.x, segmentEnd.x) + 0.0001 &&
    point.x >= Math.min(segmentStart.x, segmentEnd.x) - 0.0001 &&
    point.y <= Math.max(segmentStart.y, segmentEnd.y) + 0.0001 &&
    point.y >= Math.min(segmentStart.y, segmentEnd.y) - 0.0001
  );
}

export function getWallAttachPoint(point: Point, walls: Wall[]): Point | null {
  const closestEndpointPoint = getClosestEndpointPoint(point, walls);

  if (closestEndpointPoint) return closestEndpointPoint;

  let closestPoint: Point | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const wall of walls) {
    const projectedPoint = closestPointOnSegment(point, wall.start, wall.end);
    const projectedDistance = distance(point, projectedPoint);

    if (projectedDistance < closestDistance) {
      closestDistance = projectedDistance;
      closestPoint = projectedPoint;
    }
  }

  if (!closestPoint || closestDistance > WALL_ATTACH_THRESHOLD) return null;

  return closestPoint;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function add(a: Point, b: Point): Point {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
  };
}

export function sub(a: Point, b: Point): Point {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}

export function mul(point: Point, scalar: number): Point {
  return {
    x: point.x * scalar,
    y: point.y * scalar,
  };
}

export function perp(point: Point): Point {
  return {
    x: -point.y,
    y: point.x,
  };
}

export function dot(a: Point, b: Point) {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Point, b: Point) {
  return a.x * b.y - a.y * b.x;
}

export function vectorLength(point: Point) {
  return Math.sqrt(dot(point, point));
}

export function normalize(point: Point): Point {
  const length = vectorLength(point);

  if (!length) {
    return { x: 0, y: 0 };
  }

  return {
    x: point.x / length,
    y: point.y / length,
  };
}

export function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

export function getNormal(a: Point, b: Point): Point {
  const unit = getUnitVector(a, b);

  return {
    x: -unit.y,
    y: unit.x,
  };
}

export function getUnitVector(a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);

  if (length === 0) return { x: 1, y: 0 };

  return {
    x: dx / length,
    y: dy / length,
  };
}

export function getTextRotation(a: Point, b: Point) {
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

  return angle > 90 || angle < -90 ? angle + 180 : angle;
}

export function toSvgPoint(point: Point): string {
  return `${point.x},${point.y}`;
}

export function formatMeasurementFromInches(
  totalInchesValue: number,
  unit: MeasurementDisplayUnit = "feet-inches"
) {
  const totalInches = Math.max(1, Math.round(totalInchesValue));
  if (unit === "inches") return `${totalInches}"`;
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;

  if (feet === 0) return `${inches}"`;
  if (inches === 0) return `${feet}'`;

  return `${feet}' ${inches}"`;
}

export function formatFeetInches(
  pixelLength: number,
  unit: MeasurementDisplayUnit = "feet-inches"
) {
  const inchesPerGrid = 12;
  const totalInches = Math.max(
    1,
    Math.round((pixelLength / GRID_SIZE) * inchesPerGrid)
  );

  return formatMeasurementFromInches(totalInches, unit);
}
