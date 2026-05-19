import { SMART_KITCHEN_REQUESTED_DESIGN_COUNT } from './constants';
import type {
  ApplianceRequirement,
  BudgetData,
  CabinetRequirement,
  CustomerRating,
  DesignSet,
  Estimate,
  EstimateBreakdownItem,
  KitchenDesign,
  MeasurementData,
  OptionalEstimateItem,
  ProductionHandoffFormData,
  ReviewData,
  SmartKitchenProject,
  StyleSelection,
  VersionHistoryItem,
} from './types';

export const MOCK_SMART_KITCHEN_PROJECT_ID = 'smart-kitchen-project-001';
export const MOCK_SMART_KITCHEN_DESIGN_SET_ID = 'smart-kitchen-design-set-001';
export const MOCK_SMART_KITCHEN_DATE_ISO = '2026-05-18T12:00:00.000Z';

const imageBasePath = '/mock/smart-kitchen';

export const mockMeasurementData: MeasurementData = {
  shape: 'lShape',
  roomWidth: { value: 156, unit: 'in' },
  roomLength: { value: 192, unit: 'in' },
  ceilingHeight: { value: 96, unit: 'in' },
  totalAreaSqFt: 208,
  walls: [
    { id: 'wall-north', label: 'North Wall', length: { value: 192, unit: 'in' } },
    { id: 'wall-east', label: 'East Wall', length: { value: 156, unit: 'in' } },
    { id: 'wall-south', label: 'South Wall', length: { value: 192, unit: 'in' } },
    { id: 'wall-west', label: 'West Wall', length: { value: 156, unit: 'in' } },
  ],
  openings: [
    {
      id: 'window-sink-wall',
      label: 'Sink Wall Window',
      type: 'window',
      width: { value: 42, unit: 'in' },
      height: { value: 36, unit: 'in' },
      wallId: 'wall-north',
    },
    {
      id: 'door-dining',
      label: 'Dining Opening',
      type: 'opening',
      width: { value: 48, unit: 'in' },
      height: { value: 84, unit: 'in' },
      wallId: 'wall-west',
    },
  ],
};

export const mockStyleSelection: StyleSelection = {
  name: 'Modern Transitional',
  palette: ['#F8FAFC', '#E7DED2', '#A68A64', '#0B223A'],
  tags: ['Warm', 'Timeless', 'Inviting'],
  materials: {
    cabinetDoorStyle: 'Shaker',
    cabinetFinish: 'Warm white painted finish',
    countertop: 'White quartz with soft veining',
    backsplash: 'Handmade subway tile',
    hardware: 'Brushed nickel pulls',
    flooring: 'Light natural oak',
  },
};

export const mockApplianceRequirements: readonly ApplianceRequirement[] = [
  {
    id: 'appliance-refrigerator',
    kind: 'refrigerator',
    label: '36 inch French door refrigerator',
    quantity: 1,
    required: true,
  },
  {
    id: 'appliance-range',
    kind: 'range',
    label: '30 inch gas range',
    quantity: 1,
    required: true,
  },
  {
    id: 'appliance-dishwasher',
    kind: 'dishwasher',
    label: 'Panel-ready dishwasher',
    quantity: 1,
    required: true,
  },
  {
    id: 'appliance-microwave',
    kind: 'microwave',
    label: 'Built-in microwave drawer',
    quantity: 1,
    required: false,
  },
  {
    id: 'appliance-sink',
    kind: 'sink',
    label: 'Single bowl undermount sink',
    quantity: 1,
    required: true,
  },
];

export const mockCabinetRequirements: readonly CabinetRequirement[] = [
  {
    id: 'cabinet-base-storage',
    kind: 'baseCabinet',
    label: 'Base cabinet storage',
    quantity: 8,
    required: true,
  },
  {
    id: 'cabinet-wall-storage',
    kind: 'wallCabinet',
    label: 'Upper wall storage',
    quantity: 7,
    required: true,
  },
  {
    id: 'cabinet-drawer-stack',
    kind: 'drawerBase',
    label: 'Wide drawer base for cookware',
    quantity: 2,
    required: true,
  },
  {
    id: 'cabinet-trash-pullout',
    kind: 'trashPullOut',
    label: 'Trash pull-out drawer',
    quantity: 1,
    required: false,
  },
  {
    id: 'cabinet-island',
    kind: 'island',
    label: 'Island with seating',
    quantity: 1,
    required: false,
  },
];

export const mockBudgetData: BudgetData = {
  targetBudget: 48000,
  currency: 'USD',
  budgetLevel: 'balanced',
  notes: 'Customer prefers a balanced option with room for selected upgrades.',
};

export function createMockReviewData(overrides: Partial<ReviewData> = {}): ReviewData {
  return {
    projectName: 'Smith Residence - Main Kitchen',
    customerName: 'Smith Residence',
    roomName: 'Main Kitchen',
    measurements: mockMeasurementData,
    style: mockStyleSelection,
    appliances: mockApplianceRequirements,
    cabinetRequirements: mockCabinetRequirements,
    storageNeeds: ['More pantry storage', 'Deep drawers for cookware', 'Island seating for three'],
    specialFeatures: ['Under-cabinet lighting', 'Trash pull-out', 'Microwave drawer'],
    budget: mockBudgetData,
    customerNotes: 'Customer likes bright kitchens with warm accents and a practical island layout.',
    sourceFloorPlanJson: {
      source: 'mock-editor-export',
      version: 1,
      wallCount: mockMeasurementData.walls.length,
      openingCount: mockMeasurementData.openings.length,
    },
    ...overrides,
  };
}

const designStyleNames = [
  'Modern Transitional',
  'Bright Classic',
  'Warm Minimalist',
  'Soft Contemporary',
  'Family Storage Focus',
  'Entertainer Island',
  'Budget Balanced',
  'Premium Quartz Look',
  'Open Shelf Accent',
  'Clean Contractor Ready',
] as const;

function padOptionNumber(optionNumber: number): string {
  return optionNumber.toString().padStart(2, '0');
}

export function createMockKitchenDesign(
  optionNumber = 1,
  overrides: Partial<KitchenDesign> = {},
): KitchenDesign {
  const optionLabel = padOptionNumber(optionNumber);
  const minPrice = 36000 + optionNumber * 850;
  const maxPrice = minPrice + 5600;
  const styleName = designStyleNames[(optionNumber - 1) % designStyleNames.length];
  const id = `design-${optionLabel}`;

  return {
    id,
    projectId: MOCK_SMART_KITCHEN_PROJECT_ID,
    optionNumber,
    versionId: `${id}-v1`,
    status: 'generated',
    title: `Design ${optionLabel}`,
    styleName,
    description: `${styleName} concept with a practical work triangle, warm materials, and customer-friendly storage.`,
    tags: ['Warm', 'Functional', optionNumber % 2 === 0 ? 'Budget Fit' : 'Storage Focus'],
    imageUrl: `${imageBasePath}/design-${optionLabel}.jpg`,
    thumbnailUrl: `${imageBasePath}/design-${optionLabel}-thumb.jpg`,
    estimatedPriceRange: {
      min: minPrice,
      max: maxPrice,
      currency: 'USD',
    },
    keyFeatures: [
      'Large island work surface',
      'Improved pantry storage',
      'Balanced appliance triangle',
      'Quartz countertop allowance',
    ],
    pros: [
      'Clear customer presentation story',
      'Good balance of storage and walking space',
      'Uses standard material assumptions',
    ],
    cons: [
      'Final cabinet list needs production review',
      'Appliance clearances need field verification',
    ],
    materials: {
      cabinet: optionNumber % 2 === 0 ? 'White shaker cabinetry' : 'Warm white shaker cabinetry',
      countertop: 'White quartz with subtle veining',
      backsplash: 'Soft white subway tile',
      hardware: 'Brushed nickel pulls',
      flooring: 'Light natural oak',
    },
    layoutSummary: 'L-shaped working zone with island seating and a clear path to the dining opening.',
    storageSummary: 'Adds drawer bases near the range and pantry storage near the refrigerator zone.',
    scores: {
      storage: Math.min(100, 78 + optionNumber),
      styleMatch: Math.min(100, 82 + optionNumber),
      budgetFit: Math.max(60, 95 - optionNumber),
      layoutEfficiency: Math.min(100, 76 + optionNumber),
    },
    designJson: {
      mockDesignVersion: 1,
      optionNumber,
      cabinetCount: 17 + optionNumber,
      hasIsland: true,
      styleName,
    },
    createdAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
    updatedAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
    ...overrides,
  };
}

export function createMockKitchenDesigns(
  count = SMART_KITCHEN_REQUESTED_DESIGN_COUNT,
): readonly KitchenDesign[] {
  return Array.from({ length: count }, (_, index) => createMockKitchenDesign(index + 1));
}

export function createMockDesignSet(overrides: Partial<DesignSet> = {}): DesignSet {
  return {
    id: MOCK_SMART_KITCHEN_DESIGN_SET_ID,
    projectId: MOCK_SMART_KITCHEN_PROJECT_ID,
    generatedAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
    designs: createMockKitchenDesigns(),
    ...overrides,
  };
}

const baseEstimateBreakdown: readonly EstimateBreakdownItem[] = [
  { id: 'cabinets', label: 'Cabinets', amount: 18400, percentOfTotal: 43 },
  { id: 'countertop', label: 'Countertop', amount: 7200, percentOfTotal: 17 },
  { id: 'hardware', label: 'Hardware', amount: 1650, percentOfTotal: 4 },
  { id: 'installation', label: 'Installation', amount: 9200, percentOfTotal: 21 },
  { id: 'appliances', label: 'Appliances', amount: 4100, percentOfTotal: 10 },
  { id: 'accessories', label: 'Accessories & Misc.', amount: 2200, percentOfTotal: 5 },
];

const baseOptionalEstimateItems: readonly OptionalEstimateItem[] = [
  {
    id: 'premium-hardware',
    label: 'Premium Hardware',
    amount: 750,
    selected: true,
    description: 'Upgrade to premium cabinet pulls and knobs.',
  },
  {
    id: 'upgraded-countertop',
    label: 'Upgraded Countertop',
    amount: 1800,
    selected: false,
    description: 'Upgrade countertop allowance to a premium quartz tier.',
  },
  {
    id: 'under-cabinet-lighting',
    label: 'Under-Cabinet Lighting',
    amount: 1200,
    selected: true,
    description: 'Add under-cabinet lighting to the main prep zones.',
  },
  {
    id: 'trash-pull-out',
    label: 'Trash Pull-Out Drawer',
    amount: 650,
    selected: false,
    description: 'Add a dedicated pull-out trash and recycling cabinet.',
  },
];

function sumAmounts(items: readonly { readonly amount: number }[]): number {
  return items.reduce((total, item) => total + item.amount, 0);
}

export function createMockEstimate(
  designId = 'design-03',
  overrides: Partial<Estimate> = {},
): Estimate {
  const roughTotal = sumAmounts(baseEstimateBreakdown);
  const upgradesTotal = sumAmounts(baseOptionalEstimateItems.filter((item) => item.selected));
  const recalculatedTotal = roughTotal + upgradesTotal;

  return {
    id: `estimate-${designId}`,
    designId,
    currency: 'USD',
    roughTotal,
    upgradesTotal,
    recalculatedTotal,
    targetBudget: mockBudgetData.targetBudget,
    withinTargetBudget: recalculatedTotal <= mockBudgetData.targetBudget,
    breakdown: baseEstimateBreakdown,
    optionalItems: baseOptionalEstimateItems,
    disclaimer: 'Estimate is preliminary and may change after final production review.',
    ...overrides,
  };
}

export function createMockCustomerRatings(
  designIds: readonly string[] = ['design-01', 'design-02', 'design-03'],
): readonly CustomerRating[] {
  return designIds.map((designId, index) => ({
    designId,
    style: Math.min(5, 3 + index),
    priceFit: Math.max(1, 5 - index),
    storage: Math.min(5, 4 + (index % 2)),
    layout: Math.min(5, 3 + index),
    notes: index === 2 ? 'Customer responded best to this layout.' : undefined,
  }));
}

export function createMockVersionHistory(
  designId = 'design-03',
): readonly VersionHistoryItem[] {
  return [
    {
      id: `${designId}-history-001`,
      designId,
      versionLabel: 'Original AI concept',
      createdAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
      createdBy: 'ai',
      requestSummary: 'Initial generation from reviewed kitchen data.',
      changeSummary: 'Created a balanced kitchen concept with island storage.',
      locked: false,
    },
    {
      id: `${designId}-history-002`,
      designId,
      versionLabel: 'Storage refinement',
      createdAtIso: '2026-05-18T12:15:00.000Z',
      createdBy: 'salesperson',
      requestSummary: 'Increase storage and keep the island open for seating.',
      changeSummary: 'Added drawer bases and improved pantry placement.',
      locked: false,
    },
  ];
}

export function createMockProductionHandoffFormData(
  overrides: Partial<ProductionHandoffFormData> = {},
): ProductionHandoffFormData {
  return {
    assignedTo: 'Production Team',
    priority: 'normal',
    targetInstallDateIso: '2026-06-15',
    customerApprovalStatus: 'pending',
    paymentStatus: 'depositCollected',
    productionNotes: 'Review measurements and cabinet counts before final ordering.',
    specialRisks: ['Verify window height before sink wall cabinet finalization'],
    ...overrides,
  };
}

export function createMockSmartKitchenProject(
  overrides: Partial<SmartKitchenProject> = {},
): SmartKitchenProject {
  const designSet = createMockDesignSet();
  const selectedComparisonDesignIds = ['design-01', 'design-02', 'design-03'];

  return {
    id: MOCK_SMART_KITCHEN_PROJECT_ID,
    status: 'reviewing',
    activeStepId: 'review',
    completedStepIds: [],
    reviewData: createMockReviewData(),
    generationJob: undefined,
    designSet,
    activeDesignId: 'design-03',
    selectedComparisonDesignIds,
    customerFavoriteDesignId: 'design-03',
    customerRatings: createMockCustomerRatings(selectedComparisonDesignIds),
    activeEstimate: createMockEstimate('design-03'),
    handoffFormData: createMockProductionHandoffFormData(),
    createdAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
    updatedAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
    ...overrides,
  };
}

export const mockReviewData = createMockReviewData();
export const mockDesignSet = createMockDesignSet();
export const mockEstimate = createMockEstimate();
export const mockProductionHandoffFormData = createMockProductionHandoffFormData();
export const mockSmartKitchenProject = createMockSmartKitchenProject();
