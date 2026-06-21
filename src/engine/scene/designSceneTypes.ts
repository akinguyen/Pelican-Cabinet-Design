import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { SceneOperation } from "./sceneOperationTypes";
import type { SceneSelection } from "./sceneSelectionTypes";

export type DesignScene = Readonly<{
  sceneEntities: readonly SceneEntity[];
  placedWallGraphs: readonly PlacedWallGraph[];
  activeSelection: SceneSelection | null;
  activeSceneOperation: SceneOperation | null;
}>;

export function createEmptyDesignScene(): DesignScene {
  return {
    sceneEntities: [],
    placedWallGraphs: [],
    activeSelection: null,
    activeSceneOperation: null,
  };
}
