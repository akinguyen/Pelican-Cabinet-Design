import { Plane, Ray, Vector3 } from "three";
import type { Point3DInches } from "@/core/geometry/pointTypes";

const wallGroundPlaneIntersectionPoint = new Vector3();
const wallGroundPlane = new Plane(new Vector3(0, 0, 1), 0);

export function createWallGroundPlanePointerWorldPoint(ray: Ray): Point3DInches | null {
  const intersection = ray.intersectPlane(wallGroundPlane, wallGroundPlaneIntersectionPoint);

  if (intersection === null) {
    return null;
  }

  return {
    xInches: intersection.x,
    yInches: intersection.y,
    zInches: 0,
  };
}
