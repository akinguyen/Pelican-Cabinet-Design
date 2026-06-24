import type { DesignScene } from "@/engine/scene/designSceneTypes";
import type {
  KitchenAiExistingSceneEntity,
  KitchenAiWallCorner,
  KitchenAiWallFace,
} from "../ai/kitchenAiTypes";

export type KitchenAiPreDesignedSchemaVersion = "kitchen-ai-predesigned/v1";
export type KitchenAiPreDesignedDesignMode = "ai-chat-development";

export type KitchenAiPreDesignedRequirement = Readonly<{
  id: string;
  category: string;
  categoryLabel: string;
  quantity: number;
}>;

export type KitchenAiPreDesignedCabinetRequirement = KitchenAiPreDesignedRequirement & Readonly<{
  type?: string;
  typeLabel?: string;
}>;

export type KitchenAiPreDesignedUserRequirements = Readonly<{
  cabinets: readonly KitchenAiPreDesignedCabinetRequirement[];
  surfaces: readonly KitchenAiPreDesignedRequirement[];
  appliances: readonly KitchenAiPreDesignedRequirement[];
  fixtures: readonly KitchenAiPreDesignedRequirement[];
  prompt: string;
}>;

export type KitchenAiDevelopmentCatalogItemKind = "cabinet" | "surface" | "appliance" | "fixture";

export type KitchenAiDevelopmentCatalogItem = Readonly<{
  definitionId: string;
  label: string;
  catalogId: string;
  categoryId: string;
  semanticRole: string;
  itemKind: KitchenAiDevelopmentCatalogItemKind;
  defaultSizeInches: {
    widthInches: number;
    depthInches: number;
    heightInches: number;
  };
  allowedWidthsInches: readonly number[];
  canUseCustomWidth: boolean;
  defaultDistanceFromFloorInches: number;
}>;

export type KitchenAiDevelopmentRules = Readonly<{
  generateAppliances: true;
  generateFixtures: true;
  generateCountertops: true;
  generateRealFillers: false;
  generateRealPanels: false;
  allowExistingObjectUpdates: false;
  allowExistingObjectDeletion: false;
  baseCabinetHeightInches: number;
  baseCabinetDepthInches: number;
  wallCabinetBottomInchesFromFloor: number;
  wallCabinetHeightInches: number;
  wallCabinetDepthInches: number;
  baseCornerSizeInches: {
    widthInches: number;
    depthInches: number;
    heightInches: number;
  };
  baseCornerFillerSizeInches: {
    widthInches: number;
    depthInches: number;
    heightInches: number;
  };
  wallCornerSizeInches: {
    widthInches: number;
    depthInches: number;
    heightInches: number;
  };
  wallCornerFillerSizeInches: {
    widthInches: number;
    depthInches: number;
    heightInches: number;
  };
  preferStandardCatalogWidths: true;
  allowCustomCabinetWidths: false;
  allowCustomWidths: false;
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

export type KitchenAiPreDesigned = Readonly<{
  schemaVersion: KitchenAiPreDesignedSchemaVersion;
  requestId: string;
  units: "inches";
  designMode: KitchenAiPreDesignedDesignMode;
  createdAtMs: number;
  scene: {
    placedWallGraphs: DesignScene["placedWallGraphs"];
    sceneEntities: DesignScene["sceneEntities"];
  };
  wallFaces: readonly KitchenAiWallFace[];
  wallCorners: readonly KitchenAiWallCorner[];
  existingSceneEntities: readonly KitchenAiExistingSceneEntity[];
  userReservationZones: readonly (KitchenAiExistingSceneEntity & { reservedFor: NonNullable<KitchenAiExistingSceneEntity["reservedFor"]> })[];
  userRequirements: KitchenAiPreDesignedUserRequirements;
  catalog: readonly KitchenAiDevelopmentCatalogItem[];
  rules: KitchenAiDevelopmentRules;
}>;
