import {
  SMART_KITCHEN_EXPORT_FILE_TYPES,
  SMART_KITCHEN_GENERATION_PHASES,
  SMART_KITCHEN_REQUESTED_DESIGN_COUNT,
} from '../constants';
import {
  createMockDesignSet,
  createMockEstimate,
  createMockKitchenDesign,
  createMockProductionHandoffFormData,
  createMockSmartKitchenProject,
  createMockVersionHistory,
  MOCK_SMART_KITCHEN_DATE_ISO,
  MOCK_SMART_KITCHEN_PROJECT_ID,
} from '../mockData';
import type {
  CustomerRating,
  DesignSet,
  Estimate,
  ExportFileType,
  GenerationJob,
  KitchenDesign,
  OptionalEstimateItem,
  ProductionHandoffFormData,
  ReviewData,
  SmartKitchenProject,
  SmartKitchenStepId,
  VersionHistoryItem,
} from '../types';

export interface SmartKitchenValidationIssue {
  readonly id: string;
  readonly fieldPath: string;
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

export interface SmartKitchenValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly SmartKitchenValidationIssue[];
  readonly warnings: readonly SmartKitchenValidationIssue[];
}

export interface StartGenerationResult {
  readonly jobId: string;
  readonly job: GenerationJob;
}

export interface RefineDesignPayload {
  readonly suggestionTags: readonly string[];
  readonly promptText: string;
}

export interface DuplicateVersionPayload {
  readonly name?: string;
}

export interface PresentationResult {
  readonly presentationId: string;
  readonly designId: string;
  readonly downloadUrl: string;
}

export interface ExportFileResult {
  readonly fileType: ExportFileType;
  readonly fileName: string;
  readonly downloadUrl: string;
}

export interface InternalHandoffResult {
  readonly success: boolean;
  readonly projectId: string;
  readonly status: SmartKitchenProject['status'];
  readonly submittedAtIso: string;
}

export interface SmartKitchenApi {
  readonly getProject: (projectId: string) => Promise<SmartKitchenProject>;
  readonly saveReviewData: (projectId: string, reviewData: ReviewData) => Promise<SmartKitchenProject>;
  readonly validateProject: (projectId: string) => Promise<SmartKitchenValidationResult>;
  readonly startGeneration: (projectId: string) => Promise<StartGenerationResult>;
  readonly getGenerationJob: (jobId: string) => Promise<GenerationJob>;
  readonly getDesigns: (projectId: string) => Promise<DesignSet>;
  readonly refineDesign: (designId: string, payload: RefineDesignPayload) => Promise<KitchenDesign>;
  readonly getVersionHistory: (designId: string) => Promise<readonly VersionHistoryItem[]>;
  readonly duplicateVersion: (versionId: string, payload: DuplicateVersionPayload) => Promise<KitchenDesign>;
  readonly markCustomerFavorite: (projectId: string, designId: string) => Promise<SmartKitchenProject>;
  readonly saveCustomerRatings: (
    projectId: string,
    ratings: readonly CustomerRating[],
  ) => Promise<SmartKitchenProject>;
  readonly recalculateEstimate: (
    designId: string,
    optionalItems: readonly OptionalEstimateItem[],
  ) => Promise<Estimate>;
  readonly savePreferredBudgetVersion: (designId: string, estimate: Estimate) => Promise<Estimate>;
  readonly createPresentation: (designId: string) => Promise<PresentationResult>;
  readonly exportFile: (projectId: string, fileType: ExportFileType) => Promise<ExportFileResult>;
  readonly sendInternalHandoff: (
    projectId: string,
    formData: ProductionHandoffFormData,
  ) => Promise<InternalHandoffResult>;
}

type MutableProjectStore = Map<string, SmartKitchenProject>;
type VersionHistoryStore = Map<string, readonly VersionHistoryItem[]>;

const DEFAULT_FAKE_DELAY_MS = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function getExportDefinition(fileType: ExportFileType) {
  const definition = SMART_KITCHEN_EXPORT_FILE_TYPES.find((item) => item.type === fileType);

  if (!definition) {
    throw new Error(`Unsupported Smart Kitchen export file type: ${fileType}`);
  }

  return definition;
}

function getProjectOrThrow(projects: MutableProjectStore, projectId: string): SmartKitchenProject {
  const project = projects.get(projectId);

  if (!project) {
    throw new Error(`Smart Kitchen project not found: ${projectId}`);
  }

  return project;
}

function findDesignOrThrow(projects: MutableProjectStore, designId: string): KitchenDesign {
  for (const project of projects.values()) {
    const design = project.designSet?.designs.find((candidate) => candidate.id === designId);

    if (design) {
      return design;
    }
  }

  throw new Error(`Smart Kitchen design not found: ${designId}`);
}

function findProjectByDesignId(projects: MutableProjectStore, designId: string): SmartKitchenProject {
  for (const project of projects.values()) {
    const designExists = project.designSet?.designs.some((candidate) => candidate.id === designId) ?? false;

    if (designExists) {
      return project;
    }
  }

  throw new Error(`Smart Kitchen project not found for design: ${designId}`);
}

function findDesignByVersionIdOrThrow(projects: MutableProjectStore, versionId: string): KitchenDesign {
  for (const project of projects.values()) {
    const design = project.designSet?.designs.find((candidate) => candidate.versionId === versionId);

    if (design) {
      return design;
    }
  }

  throw new Error(`Smart Kitchen design version not found: ${versionId}`);
}

function getSelectedUpgradeTotal(optionalItems: readonly OptionalEstimateItem[]): number {
  return optionalItems.filter((item) => item.selected).reduce((total, item) => total + item.amount, 0);
}

function updateProjectDesignSet(
  project: SmartKitchenProject,
  updater: (designSet: DesignSet) => DesignSet,
): SmartKitchenProject {
  const existingDesignSet = project.designSet ?? createMockDesignSet({ projectId: project.id });

  return {
    ...project,
    designSet: updater(existingDesignSet),
    updatedAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
  };
}

function createGenerationJob(projectId: string, jobId: string): GenerationJob {
  return {
    id: jobId,
    projectId,
    status: 'queued',
    progressPercent: 0,
    activePhaseId: SMART_KITCHEN_GENERATION_PHASES[0]?.id ?? 'readingFloorPlan',
    completedDesignCount: 0,
    requestedDesignCount: SMART_KITCHEN_REQUESTED_DESIGN_COUNT,
    message: 'Generation queued.',
  };
}

function createPolledGenerationJob(job: GenerationJob, pollCount: number): GenerationJob {
  const phaseIndex = Math.min(pollCount, SMART_KITCHEN_GENERATION_PHASES.length - 1);
  const phase = SMART_KITCHEN_GENERATION_PHASES[phaseIndex];
  const completed = phaseIndex === SMART_KITCHEN_GENERATION_PHASES.length - 1;
  const completedDesignCount = completed
    ? SMART_KITCHEN_REQUESTED_DESIGN_COUNT
    : Math.floor((phase.completedProgress / 100) * SMART_KITCHEN_REQUESTED_DESIGN_COUNT);

  return {
    ...job,
    status: completed ? 'completed' : 'running',
    progressPercent: phase.completedProgress,
    activePhaseId: phase.id,
    completedDesignCount,
    message: completed ? 'Design generation completed.' : `${phase.label}.`,
  };
}

function validateReviewData(reviewData: ReviewData): SmartKitchenValidationResult {
  const errors: SmartKitchenValidationIssue[] = [];
  const warnings: SmartKitchenValidationIssue[] = [];

  if (reviewData.projectName.trim().length === 0) {
    errors.push({
      id: 'project-name-required',
      fieldPath: 'reviewData.projectName',
      message: 'Project name is required before generation can start.',
      severity: 'error',
    });
  }

  if (reviewData.measurements.walls.length === 0) {
    warnings.push({
      id: 'walls-missing',
      fieldPath: 'reviewData.measurements.walls',
      message: 'No wall measurements were found in the reviewed kitchen data.',
      severity: 'warning',
    });
  }

  if (reviewData.budget.targetBudget <= 0) {
    warnings.push({
      id: 'budget-not-positive',
      fieldPath: 'reviewData.budget.targetBudget',
      message: 'Target budget should be greater than zero for estimate review.',
      severity: 'warning',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function createRefinedDesign(
  parentDesign: KitchenDesign,
  payload: RefineDesignPayload,
  versionNumber: number,
): KitchenDesign {
  const nextVersionLabel = versionNumber.toString().padStart(2, '0');
  const promptSummary = payload.promptText.trim() || payload.suggestionTags.join(', ') || 'AI refinement request';

  return {
    ...parentDesign,
    id: `${parentDesign.id}-refined-${nextVersionLabel}`,
    versionId: `${parentDesign.id}-v${versionNumber + 1}`,
    parentDesignId: parentDesign.parentDesignId ?? parentDesign.id,
    status: 'refined',
    title: `${parentDesign.title} Refined ${nextVersionLabel}`,
    description: `${parentDesign.description} Refinement request: ${promptSummary}`,
    tags: [...parentDesign.tags, 'Refined'],
    keyFeatures: [...parentDesign.keyFeatures, 'AI refinement version preserved separately'],
    designJson: {
      ...parentDesign.designJson,
      refinementVersion: versionNumber,
      suggestionTags: payload.suggestionTags,
      promptText: payload.promptText,
    },
    createdAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
    updatedAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
  };
}

function createDuplicatedDesign(parentDesign: KitchenDesign, versionNumber: number, name?: string): KitchenDesign {
  const nextVersionLabel = versionNumber.toString().padStart(2, '0');

  return {
    ...parentDesign,
    id: `${parentDesign.id}-duplicate-${nextVersionLabel}`,
    versionId: `${parentDesign.id}-duplicate-v${versionNumber}`,
    parentDesignId: parentDesign.parentDesignId ?? parentDesign.id,
    status: 'refined',
    title: name?.trim() || `${parentDesign.title} Copy ${nextVersionLabel}`,
    designJson: {
      ...parentDesign.designJson,
      duplicatedFromVersionId: parentDesign.versionId,
    },
    createdAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
    updatedAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
  };
}

function upsertVersionHistory(
  versionHistory: VersionHistoryStore,
  designId: string,
  item: VersionHistoryItem,
): void {
  const existing = versionHistory.get(designId) ?? createMockVersionHistory(designId);
  versionHistory.set(designId, [...existing, item]);
}

export function createFakeSmartKitchenApi(options: { readonly delayMs?: number } = {}): SmartKitchenApi {
  const delayMs = options.delayMs ?? DEFAULT_FAKE_DELAY_MS;
  const projects: MutableProjectStore = new Map([
    [MOCK_SMART_KITCHEN_PROJECT_ID, createMockSmartKitchenProject()],
  ]);
  const jobs = new Map<string, GenerationJob>();
  const jobPollCounts = new Map<string, number>();
  const versionHistory: VersionHistoryStore = new Map();

  async function withDelay<T>(valueFactory: () => T): Promise<T> {
    if (delayMs > 0) {
      await delay(delayMs);
    }

    return deepClone(valueFactory());
  }

  return {
    getProject(projectId) {
      return withDelay(() => getProjectOrThrow(projects, projectId));
    },

    saveReviewData(projectId, reviewData) {
      return withDelay(() => {
        const project = getProjectOrThrow(projects, projectId);
        const nextProject: SmartKitchenProject = {
          ...project,
          reviewData,
          updatedAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
        };

        projects.set(projectId, nextProject);
        return nextProject;
      });
    },

    validateProject(projectId) {
      return withDelay(() => validateReviewData(getProjectOrThrow(projects, projectId).reviewData));
    },

    startGeneration(projectId) {
      return withDelay(() => {
        const project = getProjectOrThrow(projects, projectId);
        const jobId = `generation-job-${projectId}`;
        const job = createGenerationJob(projectId, jobId);
        const nextProject: SmartKitchenProject = {
          ...project,
          status: 'generating',
          activeStepId: 'generating',
          completedStepIds: ['review'],
          generationJob: job,
          updatedAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
        };

        projects.set(projectId, nextProject);
        jobs.set(jobId, job);
        jobPollCounts.set(jobId, 0);

        return { jobId, job };
      });
    },

    getGenerationJob(jobId) {
      return withDelay(() => {
        const job = jobs.get(jobId);

        if (!job) {
          throw new Error(`Smart Kitchen generation job not found: ${jobId}`);
        }

        const currentPollCount = jobPollCounts.get(jobId) ?? 0;
        const nextPollCount = currentPollCount + 1;
        const nextJob = createPolledGenerationJob(job, currentPollCount);
        const project = getProjectOrThrow(projects, nextJob.projectId);
        const nextProject: SmartKitchenProject = {
          ...project,
          status: nextJob.status === 'completed' ? 'designsReady' : 'generating',
          activeStepId: nextJob.status === 'completed' ? 'studio' : 'generating',
          completedStepIds: nextJob.status === 'completed' ? ['review', 'generating'] : ['review'],
          generationJob: nextJob,
          designSet: nextJob.status === 'completed' ? createMockDesignSet({ projectId: project.id }) : project.designSet,
          updatedAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
        };

        jobs.set(jobId, nextJob);
        jobPollCounts.set(jobId, nextPollCount);
        projects.set(project.id, nextProject);

        return nextJob;
      });
    },

    getDesigns(projectId) {
      return withDelay(() => {
        const project = getProjectOrThrow(projects, projectId);
        const designSet = project.designSet ?? createMockDesignSet({ projectId });
        const nextProject: SmartKitchenProject = {
          ...project,
          designSet,
          updatedAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
        };

        projects.set(projectId, nextProject);
        return designSet;
      });
    },

    refineDesign(designId, payload) {
      return withDelay(() => {
        const project = findProjectByDesignId(projects, designId);
        const parentDesign = findDesignOrThrow(projects, designId);
        const existingDesignCount = project.designSet?.designs.length ?? 0;
        const refinedDesign = createRefinedDesign(parentDesign, payload, existingDesignCount + 1);
        const nextProject = updateProjectDesignSet(project, (designSet) => ({
          ...designSet,
          designs: [...designSet.designs, refinedDesign],
        }));
        const historyItem: VersionHistoryItem = {
          id: `${refinedDesign.id}-history`,
          designId: refinedDesign.id,
          versionLabel: refinedDesign.title,
          createdAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
          createdBy: 'salesperson',
          requestSummary: payload.promptText || payload.suggestionTags.join(', '),
          changeSummary: 'Created a new refinement version without overwriting the original design.',
          locked: false,
        };

        projects.set(project.id, {
          ...nextProject,
          activeDesignId: refinedDesign.id,
        });
        upsertVersionHistory(versionHistory, refinedDesign.id, historyItem);

        return refinedDesign;
      });
    },

    getVersionHistory(designId) {
      return withDelay(() => versionHistory.get(designId) ?? createMockVersionHistory(designId));
    },

    duplicateVersion(versionId, payload) {
      return withDelay(() => {
        const sourceDesign = findDesignByVersionIdOrThrow(projects, versionId);
        const project = findProjectByDesignId(projects, sourceDesign.id);
        const existingDesignCount = project.designSet?.designs.length ?? 0;
        const duplicatedDesign = createDuplicatedDesign(sourceDesign, existingDesignCount + 1, payload.name);
        const nextProject = updateProjectDesignSet(project, (designSet) => ({
          ...designSet,
          designs: [...designSet.designs, duplicatedDesign],
        }));

        projects.set(project.id, {
          ...nextProject,
          activeDesignId: duplicatedDesign.id,
        });

        return duplicatedDesign;
      });
    },

    markCustomerFavorite(projectId, designId) {
      return withDelay(() => {
        const project = getProjectOrThrow(projects, projectId);
        const nextProject = updateProjectDesignSet(project, (designSet) => ({
          ...designSet,
          designs: designSet.designs.map((design) => ({
            ...design,
            status: design.id === designId ? 'favorite' : design.status === 'favorite' ? 'generated' : design.status,
          })),
        }));
        const finalProject: SmartKitchenProject = {
          ...nextProject,
          customerFavoriteDesignId: designId,
          activeDesignId: designId,
          status: 'comparing',
          activeStepId: 'compare',
          completedStepIds: ['review', 'generating', 'studio'],
          updatedAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
        };

        projects.set(projectId, finalProject);
        return finalProject;
      });
    },

    saveCustomerRatings(projectId, ratings) {
      return withDelay(() => {
        const project = getProjectOrThrow(projects, projectId);
        const nextProject: SmartKitchenProject = {
          ...project,
          customerRatings: ratings,
          updatedAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
        };

        projects.set(projectId, nextProject);
        return nextProject;
      });
    },

    recalculateEstimate(designId, optionalItems) {
      return withDelay(() => {
        const baseEstimate = createMockEstimate(designId, { optionalItems });
        const upgradesTotal = getSelectedUpgradeTotal(optionalItems);
        const recalculatedTotal = baseEstimate.roughTotal + upgradesTotal;

        return {
          ...baseEstimate,
          upgradesTotal,
          recalculatedTotal,
          withinTargetBudget: recalculatedTotal <= baseEstimate.targetBudget,
        };
      });
    },

    savePreferredBudgetVersion(designId, estimate) {
      return withDelay(() => {
        const project = findProjectByDesignId(projects, designId);
        const nextProject: SmartKitchenProject = {
          ...project,
          status: 'estimateReview',
          activeStepId: 'estimate',
          activeEstimate: estimate,
          updatedAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
        };

        projects.set(project.id, nextProject);
        return estimate;
      });
    },

    createPresentation(designId) {
      return withDelay(() => ({
        presentationId: `presentation-${designId}`,
        designId,
        downloadUrl: `/mock/downloads/presentation-${designId}.pdf`,
      }));
    },

    exportFile(projectId, fileType) {
      return withDelay(() => {
        getProjectOrThrow(projects, projectId);
        const definition = getExportDefinition(fileType);

        return {
          fileType,
          fileName: `${projectId}-${fileType}${definition.extension}`,
          downloadUrl: `/mock/downloads/${projectId}-${fileType}${definition.extension}`,
        };
      });
    },

    sendInternalHandoff(projectId, formData) {
      return withDelay(() => {
        const project = getProjectOrThrow(projects, projectId);
        const nextProject: SmartKitchenProject = {
          ...project,
          status: 'handoffSubmitted',
          activeStepId: 'export' as SmartKitchenStepId,
          completedStepIds: ['review', 'generating', 'studio', 'compare', 'estimate', 'presentation', 'export'],
          handoffFormData: formData ?? createMockProductionHandoffFormData(),
          updatedAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
        };

        projects.set(projectId, nextProject);

        return {
          success: true,
          projectId,
          status: nextProject.status,
          submittedAtIso: MOCK_SMART_KITCHEN_DATE_ISO,
        };
      });
    },
  };
}
