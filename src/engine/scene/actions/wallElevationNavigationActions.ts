import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import {
  createWallElevationTargetFromFace,
  getActiveWallSegmentElevationFace,
  getWallSegmentElevationFaces,
} from "@/engine/walls/wallSegmentElevation";
import type { WallElevationTarget } from "@/engine/walls/wallSegmentElevationTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createWallElevationNavigationActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  "setActiveWallElevationTarget" | "showPreviousWallElevationFace" | "showNextWallElevationFace"
> {
  return {
    setActiveWallElevationTarget(target: WallElevationTarget) {
      set({ activeWallElevationTarget: target });
    },

    showPreviousWallElevationFace() {
      updateWallElevationFaceIndex(-1, get, set);
    },

    showNextWallElevationFace() {
      updateWallElevationFaceIndex(1, get, set);
    },
  };
}

function updateWallElevationFaceIndex(
  delta: number,
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): void {
  const state = get();
  const faces = state.designScene.placedWallGraphs.flatMap((wallGraph) => (
    getWallSegmentElevationFaces(buildConnectedWallGeometry(wallGraph))
  ));

  if (faces.length === 0) {
    set({ activeWallElevationTarget: null });
    return;
  }

  const activeFace = findActiveFace(state);
  const activeFaceIndex = Math.max(
    0,
    faces.findIndex((face) => face.id === activeFace?.id),
  );
  const nextFaceIndex = ((activeFaceIndex + delta) % faces.length + faces.length) % faces.length;

  set({ activeWallElevationTarget: createWallElevationTargetFromFace(faces[nextFaceIndex]) });
}

function findActiveFace(state: DesignSceneStore) {
  for (const wallGraph of state.designScene.placedWallGraphs) {
    const activeFace = getActiveWallSegmentElevationFace({
      topology: buildConnectedWallGeometry(wallGraph),
      activeWallElevationTarget: state.activeWallElevationTarget,
    });

    if (activeFace !== null) {
      return activeFace;
    }
  }

  return null;
}
