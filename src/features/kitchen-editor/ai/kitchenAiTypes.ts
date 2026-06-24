import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { AssemblyOptionValue } from "@/engine/assemblies/assemblyConfiguration";
import type { DesignReservationZonePurpose } from "@/engine/design-zones/designReservationZoneTypes";
import type { CabinetPlacementRequirement, WallFaceSide } from "@/engine/walls/placedWallSegmentTypes";

export type KitchenAiInputSchemaVersion = "kitchen-ai-input/v1";
export type KitchenAiOutputSchemaVersion = "kitchen-ai-output/v1";
export type KitchenAiDesignMode = "cabinet-body-debug";
export type KitchenAiLayer = "base" | "wall";

export type KitchenAiRules = Readonly<{
  generateAppliances: false;
  generateFixtures: false;
  generateCountertops: false;
  generateRealFillers: false;
  generateRealPanels: false;
  baseCabinetHeightInches: number;
  baseCabinetDepthInches: number;
  wallCabinetBottomInchesFromFloor: number;
  wallCabinetHeightInches: number;
  wallCabinetDepthInches: number;
  baseCornerSizeInches: Size3DInches;
  baseCornerFillerSizeInches: Size3DInches;
  wallCornerSizeInches: Size3DInches;
  wallCornerFillerSizeInches: Size3DInches;
  preferStandardCatalogWidths: true;
  allowCustomCabinetWidths: false;
  generateClearanceZonesForRequiredClearances: true;
  generateLeftoverZonesForUnresolvedRunSpace: true;
  generatePanelZonesForExposedCabinetEnds: true;
  exposedEndPanelWidthInches: number;
  targetLeftoverInches: 0;
  negligibleLeftoverThresholdInches: number;
  preferDefaultCornerFillerWidthFirst: true;
  solveTwoAnchorRunsAsSingleSpan: true;
  cornerFillerAllowedWidthsInches: readonly number[];
}>;

export type KitchenAiWallElevationAttachment = Readonly<{
  wallGraphId: string;
  wallSegmentId: string;
  faceSide: WallFaceSide;
  centerHorizontalInches: number;
  centerVerticalInches: number;
  distanceFromWallFaceInches: number;
}>;

export type KitchenAiCornerAttachment = Readonly<{
  cornerId: string;
  layer: KitchenAiLayer;
}>;

export type KitchenAiZoneAttachment = Readonly<{
  reservationZoneId: string;
  centerXInches: number;
  centerYInches: number;
  centerZInches: number;
}>;

export type KitchenAiWallFace = Readonly<{
  id: string;
  wallGraphId: string;
  wallSegmentId: string;
  faceSide: WallFaceSide;
  cabinetPlacementRequirement: CabinetPlacementRequirement;
  elevationFrame: {
    planeOriginInches: Point3DInches;
    faceDirectionInches: Point3DInches;
    outwardDirectionInches: Point3DInches;
    horizontalBoundsInches: {
      leftInches: number;
      rightInches: number;
    };
    verticalBoundsInches: {
      bottomInches: number;
      topInches: number;
    };
  };
}>;

export type KitchenAiCornerFaceRef = Readonly<{
  wallFaceId: string;
  wallGraphId: string;
  wallSegmentId: string;
  faceSide: WallFaceSide;
  cornerEnd: "left" | "right";
}>;

export type KitchenAiCornerZoneTarget = Readonly<{
  reservedFor: Extract<DesignReservationZonePurpose, "corner">;
  sizeInches: Size3DInches;
  worldPositionInches: Point3DInches;
  rotationDegrees: { zDegrees: number };
  cornerAttachment: KitchenAiCornerAttachment;
}>;

export type KitchenAiCornerResolutionKind = "corner-with-fillers" | "single-side-filler";

export type KitchenAiWallElevationZoneTarget = Readonly<{
  reservedFor: Extract<DesignReservationZonePurpose, "filler" | "panel" | "clearance" | "leftover">;
  sizeInches: Size3DInches;
  wallElevationAttachment: KitchenAiWallElevationAttachment;
  anchor?: {
    kind: "corner-filler-anchor";
    sourceCornerId: string;
    layer: KitchenAiLayer;
    resolutionKind: KitchenAiCornerResolutionKind;
    cornerEnd: "left" | "right";
    defaultWidthInches: number;
    allowedWidthsInches: readonly number[];
  };
}>;

export type KitchenAiCornerResolutionTargets = Readonly<{
  layer: KitchenAiLayer;
  resolutionKind: KitchenAiCornerResolutionKind;
  cornerZone: KitchenAiCornerZoneTarget | null;
  fillerZones: readonly KitchenAiWallElevationZoneTarget[];
}>;

export type KitchenAiWallCorner = Readonly<{
  id: string;
  cornerType: "inside";
  angleDegrees: number;
  cornerPointInches: Point3DInches;
  wallFaceA: KitchenAiCornerFaceRef;
  wallFaceB: KitchenAiCornerFaceRef;
  baseResolution: KitchenAiCornerResolutionTargets | null;
  wallResolution: KitchenAiCornerResolutionTargets | null;
}>;

export type KitchenAiCatalogItem = Readonly<{
  definitionId: string;
  label: string;
  catalogId: string;
  categoryId: string;
  semanticRole: string;
  defaultSizeInches: Size3DInches;
  allowedWidthsInches: readonly number[];
  canUseCustomWidth: boolean;
  defaultDistanceFromFloorInches: number;
}>;

export type KitchenAiExistingSceneEntity = Readonly<{
  id: string;
  entityKind: "placed-assembly" | "design-reservation-zone";
  definitionId?: string;
  reservedFor?: DesignReservationZonePurpose;
  semanticRole: string;
  locked: true;
  sizeInches: Size3DInches;
  worldPositionInches: Point3DInches;
  rotationDegrees: { zDegrees: number };
  wallElevationAttachment?: KitchenAiWallElevationAttachment;
}>;

export type KitchenAiInput = Readonly<{
  schemaVersion: KitchenAiInputSchemaVersion;
  requestId: string;
  units: "inches";
  designMode: KitchenAiDesignMode;
  rules: KitchenAiRules;
  wallFaces: readonly KitchenAiWallFace[];
  wallCorners: readonly KitchenAiWallCorner[];
  existingSceneEntities: readonly KitchenAiExistingSceneEntity[];
  userReservationZones: readonly KitchenAiExistingSceneEntity[];
  catalog: readonly KitchenAiCatalogItem[];
}>;

export type KitchenAiGeneratedPlacedAssembly = Readonly<{
  id: string;
  entityKind: "placed-assembly";
  definitionId: string;
  semanticRole?: string;
  configuration: {
    sizeInches: Size3DInches;
    optionValues?: Readonly<Record<string, AssemblyOptionValue>>;
  };
  wallElevationAttachment?: KitchenAiWallElevationAttachment;
  zoneAttachment?: KitchenAiZoneAttachment;
  worldPositionInches?: Point3DInches;
  rotationDegrees?: { zDegrees: number };
  reason?: string;
}>;

export type KitchenAiGeneratedReservationZone = Readonly<{
  id: string;
  entityKind: "design-reservation-zone";
  reservedFor: Extract<DesignReservationZonePurpose, "corner" | "filler" | "panel" | "clearance" | "leftover">;
  sizeInches: Size3DInches;
  wallElevationAttachment?: KitchenAiWallElevationAttachment;
  cornerAttachment?: KitchenAiCornerAttachment;
  zoneAttachment?: KitchenAiZoneAttachment;
  worldPositionInches?: Point3DInches;
  rotationDegrees?: { zDegrees: number };
  aiMeta?: Readonly<Record<string, unknown>>;
  reason?: string;
}>;

export type KitchenAiGeneratedSceneEntity = KitchenAiGeneratedPlacedAssembly | KitchenAiGeneratedReservationZone;

export type KitchenAiOutput = Readonly<{
  schemaVersion: KitchenAiOutputSchemaVersion;
  sourceRequestId: string;
  status: "success" | "partial" | "failed";
  designSummary: string;
  scenePatch: {
    addSceneEntities: readonly KitchenAiGeneratedSceneEntity[];
    updateSceneEntities: readonly [];
    deleteSceneEntityIds: readonly [];
  };
  validationNotes: readonly string[];
}>;
