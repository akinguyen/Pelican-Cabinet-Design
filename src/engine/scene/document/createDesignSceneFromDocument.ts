import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { DesignScene } from "../designSceneTypes";
import type {
  DesignSceneDocument,
  PlacedAssemblyDocument,
  PlacedWallGraphDocument,
} from "./designSceneDocumentTypes";

export function createDesignSceneFromDocument(document: DesignSceneDocument): DesignScene {
  return {
    placedAssemblies: document.scene.placedAssemblies.map(createPlacedAssemblyFromDocument),
    placedWallGraphs: document.scene.placedWallGraphs.map(createPlacedWallGraphFromDocument),
    activeSelection: null,
    activeSceneOperation: null,
  };
}

function createPlacedAssemblyFromDocument(
  placedAssembly: PlacedAssemblyDocument,
): PlacedAssembly {
  return {
    id: placedAssembly.id,
    definitionId: placedAssembly.definitionId,
    configuration: {
      sizeInches: {
        widthInches: placedAssembly.configuration.sizeInches.widthInches,
        depthInches: placedAssembly.configuration.sizeInches.depthInches,
        heightInches: placedAssembly.configuration.sizeInches.heightInches,
      },
      optionValues: { ...placedAssembly.configuration.optionValues },
      componentOverrides: placedAssembly.configuration.componentOverrides,
    },
    worldPositionInches: {
      xInches: placedAssembly.worldPositionInches.xInches,
      yInches: placedAssembly.worldPositionInches.yInches,
      zInches: placedAssembly.worldPositionInches.zInches,
    },
    rotationDegrees: {
      zDegrees: placedAssembly.rotationDegrees.zDegrees,
    },
  };
}

function createPlacedWallGraphFromDocument(
  placedWallGraph: PlacedWallGraphDocument,
): PlacedWallGraph {
  return {
    id: placedWallGraph.id,
    name: placedWallGraph.name,
    nodes: placedWallGraph.nodes.map((wallNode) => ({
      id: wallNode.id,
      positionInches: {
        xInches: wallNode.positionInches.xInches,
        yInches: wallNode.positionInches.yInches,
        zInches: wallNode.positionInches.zInches,
      },
    })),
    segments: placedWallGraph.segments.map((wallSegment) => ({
      id: wallSegment.id,
      name: wallSegment.name,
      startNodeId: wallSegment.startNodeId,
      endNodeId: wallSegment.endNodeId,
      thicknessInches: wallSegment.thicknessInches,
      heightInches: wallSegment.heightInches,
      preferredViewFaceSide: wallSegment.preferredViewFaceSide,
      cabinetPlacementFaceSides: wallSegment.cabinetPlacementFaceSides,
    })),
  };
}
