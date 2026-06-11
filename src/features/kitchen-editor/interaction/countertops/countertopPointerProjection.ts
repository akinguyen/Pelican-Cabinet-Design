import type { Ray } from "three";
import type { Point2DInches, Point3DInches } from "@/core/geometry/pointTypes";
import { degreesToUserFacingZRadians } from "@/core/geometry/rotationTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";

const PARALLEL_RAY_EPSILON = 0.000001;

export function createCountertopLocalPointFromWorld(
  countertop: PlacedAssembly,
  worldPointInches: Point3DInches,
): Point2DInches {
  const deltaXInches = worldPointInches.xInches - countertop.worldPositionInches.xInches;
  const deltaYInches = worldPointInches.yInches - countertop.worldPositionInches.yInches;
  const radians = -degreesToUserFacingZRadians(countertop.rotationDegrees.zDegrees ?? 0);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    xInches: deltaXInches * cos - deltaYInches * sin,
    yInches: deltaXInches * sin + deltaYInches * cos,
  };
}

export function createCountertopWorldPointFromLocal(
  countertop: PlacedAssembly,
  localPointInches: Point2DInches,
  zOffsetInches = 0,
): Point3DInches {
  const radians = degreesToUserFacingZRadians(countertop.rotationDegrees.zDegrees ?? 0);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const topZInches =
    countertop.worldPositionInches.zInches + countertop.configuration.sizeInches.heightInches / 2;

  return {
    xInches:
      countertop.worldPositionInches.xInches +
      localPointInches.xInches * cos -
      localPointInches.yInches * sin,
    yInches:
      countertop.worldPositionInches.yInches +
      localPointInches.xInches * sin +
      localPointInches.yInches * cos,
    zInches: topZInches + zOffsetInches,
  };
}

export function createCountertopLocalPointFromRay(
  countertop: PlacedAssembly,
  ray: Ray,
): Point2DInches | null {
  const topZInches =
    countertop.worldPositionInches.zInches + countertop.configuration.sizeInches.heightInches / 2;
  const directionZ = ray.direction.z;

  if (Math.abs(directionZ) < PARALLEL_RAY_EPSILON) {
    return null;
  }

  const distance = (topZInches - ray.origin.z) / directionZ;

  if (distance < 0) {
    return null;
  }

  const worldPointInches = ray.at(distance, ray.origin.clone());

  return createCountertopLocalPointFromWorld(countertop, {
    xInches: worldPointInches.x,
    yInches: worldPointInches.y,
    zInches: worldPointInches.z,
  });
}

export function isCountertopLocalPointInsideFootprint(
  countertop: PlacedAssembly,
  localPointInches: Point2DInches,
): boolean {
  return (
    localPointInches.xInches >= -countertop.configuration.sizeInches.widthInches / 2 &&
    localPointInches.xInches <= countertop.configuration.sizeInches.widthInches / 2 &&
    localPointInches.yInches >= -countertop.configuration.sizeInches.depthInches / 2 &&
    localPointInches.yInches <= countertop.configuration.sizeInches.depthInches / 2
  );
}
