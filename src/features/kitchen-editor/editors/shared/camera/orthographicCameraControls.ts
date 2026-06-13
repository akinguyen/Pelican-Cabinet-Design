import type { OrthographicCamera } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { OrthographicCameraState } from "@/engine/scene/sceneCameraStateTypes";

export type OrthographicZoomRange = Readonly<{
  minZoom: number;
  maxZoom: number;
}>;

export type CameraUpVector = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

export function applyOrthographicCameraState(args: {
  camera: OrthographicCamera;
  controls: OrbitControlsImpl | null;
  cameraState: OrthographicCameraState;
  cameraUpVector: CameraUpVector;
  zoomRange: OrthographicZoomRange;
}): void {
  args.camera.up.set(
    args.cameraUpVector.x,
    args.cameraUpVector.y,
    args.cameraUpVector.z,
  );
  args.camera.position.set(
    args.cameraState.cameraPositionInches.xInches,
    args.cameraState.cameraPositionInches.yInches,
    args.cameraState.cameraPositionInches.zInches,
  );
  updateOrthographicCameraZoom({
    camera: args.camera,
    zoom: args.cameraState.zoom,
    zoomRange: args.zoomRange,
  });
  args.controls?.target.set(
    args.cameraState.cameraTargetInches.xInches,
    args.cameraState.cameraTargetInches.yInches,
    args.cameraState.cameraTargetInches.zInches,
  );
  args.controls?.update();
}

export function readOrthographicCameraState(
  camera: OrthographicCamera,
  controls: OrbitControlsImpl,
): OrthographicCameraState {
  return {
    cameraPositionInches: {
      xInches: camera.position.x,
      yInches: camera.position.y,
      zInches: camera.position.z,
    },
    cameraTargetInches: {
      xInches: controls.target.x,
      yInches: controls.target.y,
      zInches: controls.target.z,
    },
    zoom: camera.zoom,
  };
}

export function updateOrthographicCameraZoom(args: {
  camera: OrthographicCamera;
  zoom: number;
  zoomRange: OrthographicZoomRange;
}): void {
  args.camera.zoom = Math.min(
    Math.max(args.zoom, args.zoomRange.minZoom),
    args.zoomRange.maxZoom,
  );
  args.camera.updateProjectionMatrix();
}
