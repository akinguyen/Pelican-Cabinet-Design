import type { AiPoint } from "./types.ts";

export function add(a: AiPoint, b: AiPoint): AiPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: AiPoint, b: AiPoint): AiPoint {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function mul(point: AiPoint, scalar: number): AiPoint {
  return { x: point.x * scalar, y: point.y * scalar };
}

export function dot(a: AiPoint, b: AiPoint) {
  return a.x * b.x + a.y * b.y;
}

export function perp(point: AiPoint): AiPoint {
  return { x: -point.y, y: point.x };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function inchesToPixels(inches: number, gridSize: number) {
  return (inches / 12) * gridSize;
}

export function pixelsToInches(pixels: number, gridSize: number) {
  return (pixels / gridSize) * 12;
}

export function pointsMatch(a: AiPoint, b: AiPoint, tolerance = 0.5) {
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
}

export function pointKey(point: AiPoint) {
  return `${Math.round(point.x)}:${Math.round(point.y)}`;
}

export function samePoint(a: AiPoint, b: AiPoint) {
  return Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y);
}

export function uniquePoints(points: AiPoint[]) {
  const seen = new Set<string>();
  const result: AiPoint[] = [];

  for (const point of points) {
    const key = pointKey(point);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(point);
  }

  return result;
}
