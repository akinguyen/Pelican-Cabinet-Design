type Point = {
  x: number;
  y: number;
};

export function getRotatedRectCorners(center: Point, width: number, depth: number, rotation: number) {
  const radians = degreesToRadians(rotation);
  const cosValue = Math.cos(radians);
  const sinValue = Math.sin(radians);
  const localCorners = [
    { x: -width / 2, y: -depth / 2 },
    { x: width / 2, y: -depth / 2 },
    { x: width / 2, y: depth / 2 },
    { x: -width / 2, y: depth / 2 },
  ];

  return localCorners.map((corner) => ({
    x: center.x + corner.x * cosValue - corner.y * sinValue,
    y: center.y + corner.x * sinValue + corner.y * cosValue,
  }));
}

export function getRotatedRectBounds(center: Point, width: number, depth: number, rotation: number) {
  const corners = getRotatedRectCorners(center, width, depth, rotation);
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

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

export function cabinetPolarPoint(origin: Point, radius: number, angleDegrees: number): Point {
  const radians = (angleDegrees * Math.PI) / 180;

  return {
    x: origin.x + Math.cos(radians) * radius,
    y: origin.y - Math.sin(radians) * radius,
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

export function closestPointOnSegment(point: Point, start: Point, end: Point): Point {
  const segment = sub(end, start);
  const segmentLengthSquared = dot(segment, segment);

  if (segmentLengthSquared === 0) return start;

  const t = clamp(dot(sub(point, start), segment) / segmentLengthSquared, 0, 1);

  return {
    x: start.x + segment.x * t,
    y: start.y + segment.y * t,
  };
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
