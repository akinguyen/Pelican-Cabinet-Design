import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { DesignScene } from "../designSceneTypes";
import {
  DESIGN_SCENE_DOCUMENT_SCHEMA_VERSION,
  type DesignSceneCatalogReferenceDocument,
  type DesignSceneCoordinateSystemDocument,
  type DesignSceneDocument,
  type PlacedAssemblyDocument,
  type PlacedWallGraphDocument,
} from "./designSceneDocumentTypes";

const DESIGN_SCENE_COORDINATE_SYSTEM_DOCUMENT: DesignSceneCoordinateSystemDocument = {
  origin: "floor-plane",
  xAxis: "horizontal-left-right",
  yAxis: "horizontal-front-back",
  zAxis: "vertical-height",
  rotationUnit: "degrees",
  objectFrontAtZeroRotation: "+Y",
};

export function createDesignSceneDocument(designScene: DesignScene): DesignSceneDocument {
  const placedAssemblies = designScene.placedAssemblies.map(createPlacedAssemblyDocument);

  return createDocument({
    placedAssemblies,
    placedWallGraphs: designScene.placedWallGraphs.map(createPlacedWallGraphDocument),
    catalog: {
      mode: "reference",
      requiredDefinitionIds: getRequiredDefinitionIds(placedAssemblies),
    },
  });
}

export function createWallOnlyDesignSceneDocument(designScene: DesignScene): DesignSceneDocument {
  return createDocument({
    placedAssemblies: [],
    placedWallGraphs: designScene.placedWallGraphs.map(createPlacedWallGraphDocument),
    catalog: {
      mode: "reference",
      requiredDefinitionIds: [],
    },
  });
}

function createDocument(args: {
  placedAssemblies: readonly PlacedAssemblyDocument[];
  placedWallGraphs: readonly PlacedWallGraphDocument[];
  catalog: DesignSceneCatalogReferenceDocument;
}): DesignSceneDocument {
  return {
    schemaVersion: DESIGN_SCENE_DOCUMENT_SCHEMA_VERSION,
    units: "inches",
    coordinateSystem: DESIGN_SCENE_COORDINATE_SYSTEM_DOCUMENT,
    catalog: args.catalog,
    scene: {
      placedAssemblies: args.placedAssemblies,
      placedWallGraphs: args.placedWallGraphs,
    },
  };
}

function createPlacedAssemblyDocument(placedAssembly: PlacedAssembly): PlacedAssemblyDocument {
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
      componentOverrides: placedAssembly.configuration.componentOverrides ?? [],
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

function createPlacedWallGraphDocument(placedWallGraph: PlacedWallGraph): PlacedWallGraphDocument {
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
      cabinetPlacementFaceSides: [...wallSegment.cabinetPlacementFaceSides],
    })),
  };
}

function getRequiredDefinitionIds(
  placedAssemblies: readonly PlacedAssemblyDocument[],
): readonly string[] {
  return [...new Set(placedAssemblies.map((placedAssembly) => placedAssembly.definitionId))].sort();
}
