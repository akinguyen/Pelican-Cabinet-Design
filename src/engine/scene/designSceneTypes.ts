import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { CountertopOpening } from "@/engine/countertops/countertopOpeningTypes";
import type { PlacedWall } from "@/engine/walls/wallTypes";
import type { SceneOperation } from "./sceneOperationTypes";
import type { SceneSelection } from "./sceneSelectionTypes";

export type DesignScene = Readonly<{
  placedAssemblies: readonly PlacedAssembly[];
  placedWalls: readonly PlacedWall[];
  countertopOpenings: readonly CountertopOpening[];
  activeSelection: SceneSelection | null;
  activeSceneOperation: SceneOperation | null;
}>;

export function createEmptyDesignScene(): DesignScene {
  return {
    placedAssemblies: [],
    placedWalls: [],
    countertopOpenings: [],
    activeSelection: null,
    activeSceneOperation: null,
  };
}
