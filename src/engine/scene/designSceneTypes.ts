import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { SceneOperation } from "./sceneOperationTypes";
import type { SceneSelection } from "./sceneSelectionTypes";

export type DesignScene = Readonly<{
  placedAssemblies: readonly PlacedAssembly[];
  placedWallGraphs: readonly PlacedWallGraph[];
  designReservationZones: readonly DesignReservationZone[];
  activeSelection: SceneSelection | null;
  activeSceneOperation: SceneOperation | null;
}>;

export function createEmptyDesignScene(): DesignScene {
  return {
    placedAssemblies: [],
    placedWallGraphs: [],
    designReservationZones: [],
    activeSelection: null,
    activeSceneOperation: null,
  };
}
