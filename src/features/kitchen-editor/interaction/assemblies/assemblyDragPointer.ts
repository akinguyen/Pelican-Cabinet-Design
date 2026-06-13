import { Plane, Ray, Vector3 } from "three";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";

const dragIntersectionPoint = new Vector3();

export function createAssemblyDragPointerWorldPoint(
  sceneViewMode: SceneViewMode,
  ray: Ray,
  elevationPlaneYInches: number,
): Point3DInches | null {
  const dragPlane = createDragPlane(sceneViewMode, elevationPlaneYInches);
  const intersection = ray.intersectPlane(dragPlane, dragIntersectionPoint);

  if (intersection === null) {
    return null;
  }

  return {
    xInches: intersection.x,
    yInches: intersection.y,
    zInches: intersection.z,
  };
}

function createDragPlane(sceneViewMode: SceneViewMode, elevationPlaneYInches: number): Plane {
  if (sceneViewMode === "elevation") {
    return new Plane(new Vector3(0, 1, 0), -elevationPlaneYInches);
  }

  return new Plane(new Vector3(0, 0, 1), 0);
}
