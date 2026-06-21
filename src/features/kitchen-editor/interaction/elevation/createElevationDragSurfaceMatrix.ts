import { Matrix4, Vector3 } from "three";
import type { SceneEntityElevationFrame } from "@/engine/scene/sceneDragTypes";

export function createElevationDragSurfaceMatrix(
  elevationMoveFrame: SceneEntityElevationFrame,
): Matrix4 {
  const xAxis = new Vector3(
    elevationMoveFrame.faceDirectionInches.xInches,
    elevationMoveFrame.faceDirectionInches.yInches,
    elevationMoveFrame.faceDirectionInches.zInches,
  ).normalize();
  const yAxis = new Vector3(0, 0, 1);
  const zAxis = new Vector3(
    elevationMoveFrame.outwardDirectionInches.xInches,
    elevationMoveFrame.outwardDirectionInches.yInches,
    elevationMoveFrame.outwardDirectionInches.zInches,
  ).normalize();
  const origin = new Vector3(
    elevationMoveFrame.planeOriginInches.xInches,
    elevationMoveFrame.planeOriginInches.yInches,
    elevationMoveFrame.planeOriginInches.zInches,
  );

  return new Matrix4().makeBasis(xAxis, yAxis, zAxis).setPosition(origin);
}
