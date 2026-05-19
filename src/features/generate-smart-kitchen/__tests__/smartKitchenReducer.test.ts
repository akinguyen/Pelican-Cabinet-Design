import { describe, expect, it } from 'vitest';
import {
  createMockDesignSet,
  createMockEstimate,
  createMockKitchenDesign,
  createMockProductionHandoffFormData,
  createMockReviewData,
  createMockSmartKitchenProject,
  initialSmartKitchenFlowState,
  smartKitchenReducer,
} from '../index';
import type { CustomerRating } from '../index';

describe('smartKitchenReducer', () => {
  it('loads a project into flow state', () => {
    const project = createMockSmartKitchenProject();
    const state = smartKitchenReducer(initialSmartKitchenFlowState, {
      type: 'loadProjectSuccess',
      project,
    });

    expect(state.project?.id).toBe(project.id);
    expect(state.reviewData?.projectName).toBe(project.reviewData.projectName);
    expect(state.designSet?.designs).toHaveLength(10);
    expect(state.status).toBe('success');
  });

  it('updates review data on state and project when loaded', () => {
    const loadedState = smartKitchenReducer(initialSmartKitchenFlowState, {
      type: 'loadProjectSuccess',
      project: createMockSmartKitchenProject(),
    });
    const reviewData = createMockReviewData({ projectName: 'Reducer Update' });
    const state = smartKitchenReducer(loadedState, {
      type: 'updateReviewData',
      reviewData,
    });

    expect(state.reviewData?.projectName).toBe('Reducer Update');
    expect(state.project?.reviewData.projectName).toBe('Reducer Update');
  });

  it('starts and updates generation state', () => {
    const loadedState = smartKitchenReducer(initialSmartKitchenFlowState, {
      type: 'loadProjectSuccess',
      project: createMockSmartKitchenProject(),
    });
    const job = {
      id: 'job-001',
      projectId: 'smart-kitchen-project-001',
      status: 'queued' as const,
      progressPercent: 0,
      activePhaseId: 'readingFloorPlan',
      completedDesignCount: 0,
      requestedDesignCount: 10,
    };
    const generatingState = smartKitchenReducer(loadedState, { type: 'startGeneration', job });
    const completedState = smartKitchenReducer(generatingState, {
      type: 'setGenerationJob',
      job: { ...job, status: 'completed', progressPercent: 100, completedDesignCount: 10 },
    });

    expect(generatingState.generationJob?.id).toBe('job-001');
    expect(generatingState.project?.activeStepId).toBe('generating');
    expect(completedState.project?.activeStepId).toBe('studio');
    expect(completedState.project?.status).toBe('designsReady');
  });

  it('sets generated designs and active design', () => {
    const project = createMockSmartKitchenProject({ designSet: undefined, activeDesignId: undefined });
    const loadedState = smartKitchenReducer(initialSmartKitchenFlowState, {
      type: 'loadProjectSuccess',
      project,
    });
    const designSet = createMockDesignSet();
    const state = smartKitchenReducer(loadedState, { type: 'setGeneratedDesigns', designSet });

    expect(state.designSet?.designs).toHaveLength(10);
    expect(state.activeDesignId).toBe('design-01');
    expect(state.project?.activeStepId).toBe('studio');
  });

  it('limits selected comparison designs and avoids duplicates', () => {
    const loadedState = smartKitchenReducer(initialSmartKitchenFlowState, {
      type: 'loadProjectSuccess',
      project: createMockSmartKitchenProject({ selectedComparisonDesignIds: [] }),
    });
    const first = smartKitchenReducer(loadedState, {
      type: 'addSelectedComparisonDesign',
      designId: 'design-01',
      maxSelections: 2,
    });
    const duplicate = smartKitchenReducer(first, {
      type: 'addSelectedComparisonDesign',
      designId: 'design-01',
      maxSelections: 2,
    });
    const second = smartKitchenReducer(duplicate, {
      type: 'addSelectedComparisonDesign',
      designId: 'design-02',
      maxSelections: 2,
    });
    const blockedThird = smartKitchenReducer(second, {
      type: 'addSelectedComparisonDesign',
      designId: 'design-03',
      maxSelections: 2,
    });

    expect(blockedThird.selectedComparisonDesignIds).toEqual(['design-01', 'design-02']);
  });

  it('upserts customer ratings', () => {
    const loadedState = smartKitchenReducer(initialSmartKitchenFlowState, {
      type: 'loadProjectSuccess',
      project: createMockSmartKitchenProject({ customerRatings: [] }),
    });
    const firstRating: CustomerRating = { designId: 'design-03', style: 4, priceFit: 4, storage: 4, layout: 4 };
    const updatedRating: CustomerRating = { designId: 'design-03', style: 5, priceFit: 5, storage: 5, layout: 5 };

    const first = smartKitchenReducer(loadedState, { type: 'setCustomerRating', rating: firstRating });
    const updated = smartKitchenReducer(first, { type: 'setCustomerRating', rating: updatedRating });

    expect(updated.customerRatings).toHaveLength(1);
    expect(updated.customerRatings[0]?.style).toBe(5);
  });

  it('marks favorite, sets estimate, and switches final review slide', () => {
    const loadedState = smartKitchenReducer(initialSmartKitchenFlowState, {
      type: 'loadProjectSuccess',
      project: createMockSmartKitchenProject(),
    });
    const estimate = createMockEstimate('design-03');
    const favoriteState = smartKitchenReducer(loadedState, { type: 'markFavorite', designId: 'design-03' });
    const estimateState = smartKitchenReducer(favoriteState, { type: 'setEstimate', estimate });
    const slideState = smartKitchenReducer(estimateState, {
      type: 'setFinalReviewSlide',
      slide: 'productionHandoff',
    });

    expect(slideState.customerFavoriteDesignId).toBe('design-03');
    expect(slideState.activeEstimate?.id).toBe(estimate.id);
    expect(slideState.finalReviewSlide).toBe('productionHandoff');
  });

  it('appends a refined design version without removing existing designs', () => {
    const loadedState = smartKitchenReducer(initialSmartKitchenFlowState, {
      type: 'loadProjectSuccess',
      project: createMockSmartKitchenProject(),
    });
    const originalCount = loadedState.designSet?.designs.length ?? 0;
    const newDesign = createMockKitchenDesign(11, {
      id: 'design-03-refined-11',
      parentDesignId: 'design-03',
      status: 'refined',
    });
    const state = smartKitchenReducer(loadedState, { type: 'appendDesignVersion', design: newDesign });

    expect(state.designSet?.designs).toHaveLength(originalCount + 1);
    expect(state.activeDesignId).toBe('design-03-refined-11');
    expect(state.designSet?.designs.some((design) => design.id === 'design-03')).toBe(true);
  });

  it('stores handoff data and handles error state', () => {
    const loadedState = smartKitchenReducer(initialSmartKitchenFlowState, {
      type: 'loadProjectSuccess',
      project: createMockSmartKitchenProject(),
    });
    const handoffFormData = createMockProductionHandoffFormData({ assignedTo: 'Ops Team' });
    const handoffState = smartKitchenReducer(loadedState, {
      type: 'setHandoffFormData',
      handoffFormData,
    });
    const errorState = smartKitchenReducer(handoffState, { type: 'setError', errorMessage: 'Failure' });
    const clearedState = smartKitchenReducer(errorState, { type: 'clearError' });

    expect(handoffState.handoffFormData?.assignedTo).toBe('Ops Team');
    expect(errorState.status).toBe('error');
    expect(clearedState.errorMessage).toBeNull();
    expect(clearedState.status).toBe('idle');
  });
});
