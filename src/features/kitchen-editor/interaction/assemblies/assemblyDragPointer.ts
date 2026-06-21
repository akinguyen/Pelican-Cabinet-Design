import { Plane, Ray, Vector3 } from "three";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneEntityElevationFrame } from "@/engine/scene/sceneDragTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";

const dragIntersectionPoint = new Vector3();

export function createAssemblyDragPointerWorldPoint(
  sceneViewMode: SceneViewMode,
  ray: Ray,
  elevationPlaneYInches: number,
  elevationMoveFrame?: SceneEntityElevationFrame,
): Point3DInches | null {
  const dragPlane = createDragPlane({
    sceneViewMode,
    elevationPlaneYInches,
    elevationMoveFrame,
  });
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

function createDragPlane(args: {
  sceneViewMode: SceneViewMode;
  elevationPlaneYInches: number;
  elevationMoveFrame?: SceneEntityElevationFrame;
}): Plane {
  if (args.sceneViewMode === "elevation" && args.elevationMoveFrame !== undefined) {
    const normal = new Vector3(
      args.elevationMoveFrame.outwardDirectionInches.xInches,
      args.elevationMoveFrame.outwardDirectionInches.yInches,
      args.elevationMoveFrame.outwardDirectionInches.zInches,
    ).normalize();
    const origin = new Vector3(
      args.elevationMoveFrame.planeOriginInches.xInches,
      args.elevationMoveFrame.planeOriginInches.yInches,
      args.elevationMoveFrame.planeOriginInches.zInches,
    );

    return new Plane().setFromNormalAndCoplanarPoint(normal, origin);
  }

  if (args.sceneViewMode === "elevation") {
    return new Plane(new Vector3(0, 1, 0), -args.elevationPlaneYInches);
  }

  return new Plane(new Vector3(0, 0, 1), 0);
}
