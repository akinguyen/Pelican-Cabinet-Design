import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { DesignReservationZonePurpose } from "@/engine/design-zones/designReservationZoneTypes";
import type { CabinetPlacementFacePolicies, WallFaceSide } from "@/engine/walls/placedWallSegmentTypes";
import type {
  AssemblyComponentOverride,
  AssemblyOptionValue,
} from "@/engine/assemblies/assemblyConfiguration";

export const DESIGN_SCENE_DOCUMENT_SCHEMA_VERSION = "kitchen-editor-scene/v3" as const;

export type DesignSceneDocument = Readonly<{
  schemaVersion: typeof DESIGN_SCENE_DOCUMENT_SCHEMA_VERSION;
  units: "inches";
  coordinateSystem: DesignSceneCoordinateSystemDocument;
  catalog: DesignSceneCatalogReferenceDocument;
  scene: DesignSceneDocumentContent;
}>;

export type DesignSceneCoordinateSystemDocument = Readonly<{
  origin: "floor-plane";
  xAxis: "horizontal-left-right";
  yAxis: "horizontal-front-back";
  zAxis: "vertical-height";
  rotationUnit: "degrees";
  objectFrontAtZeroRotation: "+Y";
}>;

export type DesignSceneCatalogReferenceDocument = Readonly<{
  mode: "reference";
  requiredDefinitionIds: readonly string[];
}>;

export type DesignSceneDocumentContent = Readonly<{
  placedAssemblies: readonly PlacedAssemblyDocument[];
  placedWallGraphs: readonly PlacedWallGraphDocument[];
  designReservationZones: readonly DesignReservationZoneDocument[];
}>;

export type DesignReservationZoneDocument = Readonly<{
  id: string;
  reservedFor: DesignReservationZonePurpose;
  baseCenterPointInches: Point3DInches;
  rotationDegrees: Readonly<{
    zDegrees: number;
  }>;
  sizeInches: Size3DInches;
}>;

export type PlacedAssemblyDocument = Readonly<{
  id: string;
  definitionId: string;
  configuration: AssemblyConfigurationDocument;
  worldPositionInches: Point3DInches;
  rotationDegrees: Readonly<{
    zDegrees: number;
  }>;
}>;

export type AssemblyConfigurationDocument = Readonly<{
  sizeInches: Size3DInches;
  optionValues: Readonly<Record<string, AssemblyOptionValue>>;
  componentOverrides: readonly AssemblyComponentOverride[];
}>;

export type PlacedWallGraphDocument = Readonly<{
  id: string;
  name: string;
  nodes: readonly PlacedWallNodeDocument[];
  segments: readonly PlacedWallSegmentDocument[];
}>;

export type PlacedWallNodeDocument = Readonly<{
  id: string;
  positionInches: Point3DInches;
}>;

export type PlacedWallSegmentDocument = Readonly<{
  id: string;
  name: string;
  startNodeId: string;
  endNodeId: string;
  thicknessInches: number;
  heightInches: number;
  preferredViewFaceSide: WallFaceSide;
  cabinetPlacementFacePolicies: CabinetPlacementFacePolicies;
}>;
