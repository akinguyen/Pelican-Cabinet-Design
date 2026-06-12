import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { CountertopOpening } from "@/engine/countertops/countertopOpeningTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { SceneOperation } from "./sceneOperationTypes";
import type { SceneSelection } from "./sceneSelectionTypes";

export type DesignScene = Readonly<{
  placedAssemblies: readonly PlacedAssembly[];
  placedWallGraphs: readonly PlacedWallGraph[];
  countertopOpenings: readonly CountertopOpening[];
  activeSelection: SceneSelection | null;
  activeSceneOperation: SceneOperation | null;
}>;

export function createEmptyDesignScene(): DesignScene {
  return {
    placedAssemblies: [],
    placedWallGraphs: [],
    countertopOpenings: [],
    activeSelection: null,
    activeSceneOperation: null,
  };
}
