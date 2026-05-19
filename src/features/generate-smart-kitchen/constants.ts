import type {
  ExportFileDefinition,
  GenerationPhaseDefinition,
  SmartKitchenStepDefinition,
  SmartKitchenStepId,
} from './types';

export const SMART_KITCHEN_FEATURE_ROOT = 'src/features/generate-smart-kitchen' as const;

export const SMART_KITCHEN_INITIAL_STEP_ID: SmartKitchenStepId = 'review';
export const SMART_KITCHEN_FINAL_STEP_ID: SmartKitchenStepId = 'export';

export const SMART_KITCHEN_STEPS = [
  {
    id: 'review',
    order: 1,
    title: 'Review & Confirm',
    description: 'Review your kitchen details',
    routeSegment: 'review',
    primaryActionLabel: 'Generate 10 AI Designs',
  },
  {
    id: 'generating',
    order: 2,
    title: 'Generate Designs',
    description: 'AI is creating 10 design options',
    routeSegment: 'generating',
    primaryActionLabel: 'Generating...',
  },
  {
    id: 'studio',
    order: 3,
    title: 'AI Kitchen Studio',
    description: 'Explore and refine designs',
    routeSegment: 'studio',
    primaryActionLabel: 'Refine This Design',
  },
  {
    id: 'compare',
    order: 4,
    title: 'Compare & Choose',
    description: 'Compare and rate your favorites',
    routeSegment: 'compare',
    primaryActionLabel: 'Review Estimates & Continue',
  },
  {
    id: 'estimate',
    order: 5,
    title: 'Estimate Review',
    description: 'Review pricing and options',
    routeSegment: 'estimate',
    primaryActionLabel: 'Save as Preferred Budget Version',
  },
  {
    id: 'presentation',
    order: 6,
    title: 'Presentation',
    description: 'Create a presentation',
    routeSegment: 'presentation',
    primaryActionLabel: 'Download PDF',
  },
  {
    id: 'export',
    order: 7,
    title: 'Final Review & Export',
    description: 'Export and handoff',
    routeSegment: 'export',
    primaryActionLabel: 'Send to Internal Team',
  },
] as const satisfies readonly SmartKitchenStepDefinition[];

export const SMART_KITCHEN_STEP_IDS = SMART_KITCHEN_STEPS.map((step) => step.id);

export const SMART_KITCHEN_REQUESTED_DESIGN_COUNT = 10;
export const SMART_KITCHEN_MIN_COMPARISON_DESIGNS = 2;
export const SMART_KITCHEN_MAX_COMPARISON_DESIGNS = 3;

export const SMART_KITCHEN_GENERATION_PHASES = [
  {
    id: 'readingFloorPlan',
    label: 'Reading floor plan',
    completedProgress: 15,
  },
  {
    id: 'analyzingMeasurements',
    label: 'Analyzing measurements',
    completedProgress: 30,
  },
  {
    id: 'understandingRequirements',
    label: 'Understanding requirements',
    completedProgress: 45,
  },
  {
    id: 'generatingConcepts',
    label: 'Generating kitchen concepts',
    completedProgress: 68,
  },
  {
    id: 'creatingDesignImages',
    label: 'Creating design images',
    completedProgress: 88,
  },
  {
    id: 'finalizingResults',
    label: 'Finalizing results',
    completedProgress: 100,
  },
] as const satisfies readonly GenerationPhaseDefinition[];

export const SMART_KITCHEN_EXPORT_FILE_TYPES = [
  {
    type: 'designJson',
    label: 'Design JSON',
    extension: '.json',
    description: 'Complete design data for backend and production systems.',
  },
  {
    type: 'cabinetListCsv',
    label: 'Cabinet List',
    extension: '.csv',
    description: 'Cabinet summary for purchasing and production review.',
  },
  {
    type: 'materialsListCsv',
    label: 'Materials List',
    extension: '.csv',
    description: 'Materials and finishes selected for the project.',
  },
  {
    type: 'pricingXlsx',
    label: 'Pricing',
    extension: '.xlsx',
    description: 'Pricing workbook with category totals and optional upgrades.',
  },
  {
    type: 'measurementsPdf',
    label: 'Measurements',
    extension: '.pdf',
    description: 'Measurement packet for review and production handoff.',
  },
  {
    type: 'floorPlanPng',
    label: 'Floor Plan',
    extension: '.png',
    description: 'Floor plan preview image for quick review.',
  },
  {
    type: 'elevationsPdf',
    label: 'Elevations',
    extension: '.pdf',
    description: 'Wall elevation packet for production review.',
  },
  {
    type: 'imagesZip',
    label: 'Images',
    extension: '.zip',
    description: 'Generated render images and thumbnails.',
  },
  {
    type: 'presentationPdf',
    label: 'Presentation PDF',
    extension: '.pdf',
    description: 'Customer-facing presentation package.',
  },
] as const satisfies readonly ExportFileDefinition[];
