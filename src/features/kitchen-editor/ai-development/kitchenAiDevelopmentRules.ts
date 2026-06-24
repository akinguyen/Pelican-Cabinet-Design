import type { KitchenAiRules } from "../ai/kitchenAiTypes";
import type { KitchenAiDevelopmentRules } from "./kitchenAiPreDesignedTypes";

const sharedKitchenAiDevelopmentRuleValues = {
  baseCabinetHeightInches: 34.5,
  baseCabinetDepthInches: 24,
  wallCabinetBottomInchesFromFloor: 54,
  wallCabinetHeightInches: 30,
  wallCabinetDepthInches: 12,
  baseCornerSizeInches: {
    widthInches: 24,
    depthInches: 24,
    heightInches: 34.5,
  },
  baseCornerFillerSizeInches: {
    widthInches: 3,
    depthInches: 24,
    heightInches: 34.5,
  },
  wallCornerSizeInches: {
    widthInches: 12,
    depthInches: 12,
    heightInches: 30,
  },
  wallCornerFillerSizeInches: {
    widthInches: 3,
    depthInches: 12,
    heightInches: 30,
  },
  preferStandardCatalogWidths: true,
  allowCustomCabinetWidths: false,
  generateClearanceZonesForRequiredClearances: true,
  generateLeftoverZonesForUnresolvedRunSpace: true,
  generatePanelZonesForExposedCabinetEnds: true,
  exposedEndPanelWidthInches: 1.5,
  targetLeftoverInches: 0,
  negligibleLeftoverThresholdInches: 0.3,
  preferDefaultCornerFillerWidthFirst: true,
  solveTwoAnchorRunsAsSingleSpan: true,
  cornerFillerAllowedWidthsInches: [3, 4, 5, 6],
} as const;

export const kitchenAiDevelopmentRules: KitchenAiDevelopmentRules = {
  generateAppliances: true,
  generateFixtures: true,
  generateCountertops: true,
  generateRealFillers: false,
  generateRealPanels: false,
  allowExistingObjectUpdates: false,
  allowExistingObjectDeletion: false,
  allowCustomWidths: false,
  ...sharedKitchenAiDevelopmentRuleValues,
};

export const kitchenAiDevelopmentCornerDetectionRules: KitchenAiRules = {
  generateAppliances: false,
  generateFixtures: false,
  generateCountertops: false,
  generateRealFillers: false,
  generateRealPanels: false,
  ...sharedKitchenAiDevelopmentRuleValues,
};
