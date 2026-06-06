import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { PlacedWall } from "@/engine/walls/wallTypes";
import type { SceneOperation } from "./sceneOperationTypes";
import type { SceneSelection } from "./sceneSelectionTypes";

export type DesignScene = Readonly<{
  placedAssemblies: readonly PlacedAssembly[];
  placedWalls: readonly PlacedWall[];
  activeSelection: SceneSelection | null;
  activeSceneOperation: SceneOperation | null;
}>;

export function createEmptyDesignScene(): DesignScene {
  return {
    placedAssemblies: [],
    placedWalls: [],
    activeSelection: null,
    activeSceneOperation: null,
  };
}
