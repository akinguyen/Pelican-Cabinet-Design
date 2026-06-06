import { Plane, Ray, Vector3 } from "three";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { KitchenEditorView } from "../../editors/shared/editorViewTypes";

const dragIntersectionPoint = new Vector3();

export function createAssemblyDragPointerWorldPoint(
  editorView: KitchenEditorView,
  ray: Ray,
  elevationPlaneYInches: number,
): Point3DInches | null {
  const dragPlane = createDragPlane(editorView, elevationPlaneYInches);
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

function createDragPlane(editorView: KitchenEditorView, elevationPlaneYInches: number): Plane {
  if (editorView === "elevation") {
    return new Plane(new Vector3(0, 1, 0), -elevationPlaneYInches);
  }

  return new Plane(new Vector3(0, 0, 1), 0);
}
