export type SmartKitchenStepId =
  | 'review'
  | 'generating'
  | 'studio'
  | 'compare'
  | 'estimate'
  | 'presentation'
  | 'export';

export type SmartKitchenStepStatus = 'locked' | 'available' | 'active' | 'completed';

export interface SmartKitchenStepDefinition {
  readonly id: SmartKitchenStepId;
  readonly order: number;
  readonly title: string;
  readonly description: string;
  readonly routeSegment: string;
  readonly primaryActionLabel: string;
}

export type ProjectStatus =
  | 'draft'
  | 'reviewing'
  | 'generating'
  | 'designsReady'
  | 'comparing'
  | 'estimateReview'
  | 'presentationReady'
  | 'exportReady'
  | 'handoffSubmitted';

export type CurrencyCode = 'USD';

export interface PriceRange {
  readonly min: number;
  readonly max: number;
  readonly currency: CurrencyCode;
}

export type KitchenShape = 'lShape' | 'uShape' | 'galley' | 'oneWall' | 'island' | 'unknown';

export interface DimensionValue {
  readonly value: number;
  readonly unit: 'in' | 'ft';
}

export interface WallMeasurement {
  readonly id: string;
  readonly label: string;
  readonly length: DimensionValue;
}

export interface OpeningMeasurement {
  readonly id: string;
  readonly label: string;
  readonly type: 'door' | 'window' | 'opening';
  readonly width: DimensionValue;
  readonly height: DimensionValue;
  readonly wallId?: string;
}

export interface MeasurementData {
  readonly shape: KitchenShape;
  readonly roomWidth: DimensionValue;
  readonly roomLength: DimensionValue;
  readonly ceilingHeight: DimensionValue;
  readonly totalAreaSqFt: number;
  readonly walls: readonly WallMeasurement[];
  readonly openings: readonly OpeningMeasurement[];
}

export interface MaterialSelection {
  readonly cabinetDoorStyle: string;
  readonly cabinetFinish: string;
  readonly countertop: string;
  readonly backsplash: string;
  readonly hardware: string;
  readonly flooring: string;
}

export interface StyleSelection {
  readonly name: string;
  readonly palette: readonly string[];
  readonly tags: readonly string[];
  readonly materials: MaterialSelection;
}

export type ApplianceKind =
  | 'refrigerator'
  | 'range'
  | 'cooktop'
  | 'wallOven'
  | 'microwave'
  | 'dishwasher'
  | 'sink'
  | 'hood';

export interface ApplianceRequirement {
  readonly id: string;
  readonly kind: ApplianceKind;
  readonly label: string;
  readonly quantity: number;
  readonly required: boolean;
  readonly notes?: string;
}

export type CabinetRequirementKind =
  | 'baseCabinet'
  | 'wallCabinet'
  | 'drawerBase'
  | 'pantry'
  | 'island'
  | 'trashPullOut'
  | 'cornerSolution';

export interface CabinetRequirement {
  readonly id: string;
  readonly kind: CabinetRequirementKind;
  readonly label: string;
  readonly quantity: number;
  readonly required: boolean;
  readonly notes?: string;
}

export interface BudgetData {
  readonly targetBudget: number;
  readonly currency: CurrencyCode;
  readonly budgetLevel: 'value' | 'balanced' | 'premium';
  readonly notes?: string;
}

export interface ReviewData {
  readonly projectName: string;
  readonly customerName: string;
  readonly roomName: string;
  readonly measurements: MeasurementData;
  readonly style: StyleSelection;
  readonly appliances: readonly ApplianceRequirement[];
  readonly cabinetRequirements: readonly CabinetRequirement[];
  readonly storageNeeds: readonly string[];
  readonly specialFeatures: readonly string[];
  readonly budget: BudgetData;
  readonly customerNotes: string;
  readonly sourceFloorPlanJson: Record<string, unknown>;
}

export type DesignStatus = 'generated' | 'refined' | 'favorite' | 'locked' | 'submitted';

export interface DesignScores {
  readonly storage: number;
  readonly styleMatch: number;
  readonly budgetFit: number;
  readonly layoutEfficiency: number;
}

export interface DesignMaterials {
  readonly cabinet: string;
  readonly countertop: string;
  readonly backsplash: string;
  readonly hardware: string;
  readonly flooring: string;
}

export interface KitchenDesign {
  readonly id: string;
  readonly projectId: string;
  readonly optionNumber: number;
  readonly versionId: string;
  readonly parentDesignId?: string;
  readonly status: DesignStatus;
  readonly title: string;
  readonly styleName: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly imageUrl: string;
  readonly thumbnailUrl: string;
  readonly estimatedPriceRange: PriceRange;
  readonly keyFeatures: readonly string[];
  readonly pros: readonly string[];
  readonly cons: readonly string[];
  readonly materials: DesignMaterials;
  readonly layoutSummary: string;
  readonly storageSummary: string;
  readonly scores: DesignScores;
  readonly designJson: Record<string, unknown>;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
}

export interface DesignSet {
  readonly id: string;
  readonly projectId: string;
  readonly generatedAtIso: string;
  readonly designs: readonly KitchenDesign[];
}

export type GenerationJobStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed' | 'partialSuccess';

export interface GenerationPhaseDefinition {
  readonly id: string;
  readonly label: string;
  readonly completedProgress: number;
}

export interface GenerationJob {
  readonly id: string;
  readonly projectId: string;
  readonly status: GenerationJobStatus;
  readonly progressPercent: number;
  readonly activePhaseId: string;
  readonly completedDesignCount: number;
  readonly requestedDesignCount: number;
  readonly message?: string;
}

export interface VersionHistoryItem {
  readonly id: string;
  readonly designId: string;
  readonly versionLabel: string;
  readonly createdAtIso: string;
  readonly createdBy: 'ai' | 'salesperson' | 'system';
  readonly requestSummary: string;
  readonly changeSummary: string;
  readonly locked: boolean;
}

export interface CustomerRating {
  readonly designId: string;
  readonly style: number;
  readonly priceFit: number;
  readonly storage: number;
  readonly layout: number;
  readonly notes?: string;
}

export interface EstimateBreakdownItem {
  readonly id: string;
  readonly label: string;
  readonly amount: number;
  readonly percentOfTotal: number;
}

export interface OptionalEstimateItem {
  readonly id: string;
  readonly label: string;
  readonly amount: number;
  readonly selected: boolean;
  readonly description: string;
}

export interface Estimate {
  readonly id: string;
  readonly designId: string;
  readonly currency: CurrencyCode;
  readonly roughTotal: number;
  readonly upgradesTotal: number;
  readonly recalculatedTotal?: number;
  readonly targetBudget: number;
  readonly withinTargetBudget: boolean;
  readonly breakdown: readonly EstimateBreakdownItem[];
  readonly optionalItems: readonly OptionalEstimateItem[];
  readonly disclaimer: string;
}

export type ExportFileType =
  | 'designJson'
  | 'cabinetListCsv'
  | 'materialsListCsv'
  | 'pricingXlsx'
  | 'measurementsPdf'
  | 'floorPlanPng'
  | 'elevationsPdf'
  | 'imagesZip'
  | 'presentationPdf';

export interface ExportFileDefinition {
  readonly type: ExportFileType;
  readonly label: string;
  readonly extension: string;
  readonly description: string;
}

export type CustomerApprovalStatus = 'pending' | 'approved' | 'changesRequested';
export type PaymentStatus = 'notCollected' | 'depositCollected' | 'paidInFull';
export type HandoffPriority = 'normal' | 'rush' | 'hold';

export interface ProductionHandoffFormData {
  readonly assignedTo: string;
  readonly priority: HandoffPriority;
  readonly targetInstallDateIso: string;
  readonly customerApprovalStatus: CustomerApprovalStatus;
  readonly paymentStatus: PaymentStatus;
  readonly productionNotes: string;
  readonly specialRisks: readonly string[];
}

export interface SmartKitchenProject {
  readonly id: string;
  readonly status: ProjectStatus;
  readonly activeStepId: SmartKitchenStepId;
  readonly completedStepIds: readonly SmartKitchenStepId[];
  readonly reviewData: ReviewData;
  readonly generationJob?: GenerationJob;
  readonly designSet?: DesignSet;
  readonly activeDesignId?: string;
  readonly selectedComparisonDesignIds: readonly string[];
  readonly customerFavoriteDesignId?: string;
  readonly customerRatings: readonly CustomerRating[];
  readonly activeEstimate?: Estimate;
  readonly handoffFormData?: ProductionHandoffFormData;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
}
