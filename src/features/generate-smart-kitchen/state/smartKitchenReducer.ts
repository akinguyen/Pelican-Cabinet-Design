import type { SmartKitchenValidationResult } from '../api/smartKitchenApi';
import type {
  CustomerRating,
  DesignSet,
  Estimate,
  GenerationJob,
  KitchenDesign,
  ProductionHandoffFormData,
  ReviewData,
  SmartKitchenProject,
  SmartKitchenStepId,
} from '../types';

export type SmartKitchenRequestStatus = 'idle' | 'loading' | 'success' | 'error';
export type SmartKitchenFinalReviewSlide = 'customerPresentation' | 'productionHandoff';

export interface SmartKitchenFlowState {
  readonly project: SmartKitchenProject | null;
  readonly reviewData: ReviewData | null;
  readonly validationResult: SmartKitchenValidationResult | null;
  readonly generationJob: GenerationJob | null;
  readonly designSet: DesignSet | null;
  readonly activeDesignId: string | null;
  readonly selectedComparisonDesignIds: readonly string[];
  readonly customerRatings: readonly CustomerRating[];
  readonly customerFavoriteDesignId: string | null;
  readonly activeEstimate: Estimate | null;
  readonly finalReviewSlide: SmartKitchenFinalReviewSlide;
  readonly handoffFormData: ProductionHandoffFormData | null;
  readonly status: SmartKitchenRequestStatus;
  readonly errorMessage: string | null;
}

export type SmartKitchenFlowAction =
  | { readonly type: 'loadProjectStart' }
  | { readonly type: 'loadProjectSuccess'; readonly project: SmartKitchenProject }
  | { readonly type: 'loadProjectFailure'; readonly errorMessage: string }
  | { readonly type: 'setActiveStep'; readonly stepId: SmartKitchenStepId }
  | { readonly type: 'updateReviewData'; readonly reviewData: ReviewData }
  | { readonly type: 'setValidationResult'; readonly validationResult: SmartKitchenValidationResult }
  | { readonly type: 'startGeneration'; readonly job: GenerationJob }
  | { readonly type: 'setGenerationJob'; readonly job: GenerationJob }
  | { readonly type: 'setGeneratedDesigns'; readonly designSet: DesignSet }
  | { readonly type: 'appendDesignVersion'; readonly design: KitchenDesign }
  | { readonly type: 'setActiveDesign'; readonly designId: string }
  | { readonly type: 'addSelectedComparisonDesign'; readonly designId: string; readonly maxSelections: number }
  | { readonly type: 'removeSelectedComparisonDesign'; readonly designId: string }
  | { readonly type: 'setCustomerRating'; readonly rating: CustomerRating }
  | { readonly type: 'setCustomerRatings'; readonly ratings: readonly CustomerRating[] }
  | { readonly type: 'markFavorite'; readonly designId: string }
  | { readonly type: 'setEstimate'; readonly estimate: Estimate }
  | { readonly type: 'setFinalReviewSlide'; readonly slide: SmartKitchenFinalReviewSlide }
  | { readonly type: 'setHandoffFormData'; readonly handoffFormData: ProductionHandoffFormData }
  | { readonly type: 'setStatus'; readonly status: SmartKitchenRequestStatus }
  | { readonly type: 'setError'; readonly errorMessage: string }
  | { readonly type: 'clearError' };

export const initialSmartKitchenFlowState: SmartKitchenFlowState = {
  project: null,
  reviewData: null,
  validationResult: null,
  generationJob: null,
  designSet: null,
  activeDesignId: null,
  selectedComparisonDesignIds: [],
  customerRatings: [],
  customerFavoriteDesignId: null,
  activeEstimate: null,
  finalReviewSlide: 'customerPresentation',
  handoffFormData: null,
  status: 'idle',
  errorMessage: null,
};

function syncProject(state: SmartKitchenFlowState, patch: Partial<SmartKitchenProject>): SmartKitchenFlowState {
  if (!state.project) {
    return state;
  }

  return {
    ...state,
    project: {
      ...state.project,
      ...patch,
    },
  };
}

function appendUniqueSelection(
  currentSelections: readonly string[],
  designId: string,
  maxSelections: number,
): readonly string[] {
  if (currentSelections.includes(designId)) {
    return currentSelections;
  }

  if (currentSelections.length >= maxSelections) {
    return currentSelections;
  }

  return [...currentSelections, designId];
}

function upsertCustomerRating(
  ratings: readonly CustomerRating[],
  nextRating: CustomerRating,
): readonly CustomerRating[] {
  const existingIndex = ratings.findIndex((rating) => rating.designId === nextRating.designId);

  if (existingIndex === -1) {
    return [...ratings, nextRating];
  }

  return ratings.map((rating) => (rating.designId === nextRating.designId ? nextRating : rating));
}

function addDesignToDesignSet(designSet: DesignSet | null, design: KitchenDesign): DesignSet | null {
  if (!designSet) {
    return null;
  }

  return {
    ...designSet,
    designs: [...designSet.designs, design],
  };
}

export function smartKitchenReducer(
  state: SmartKitchenFlowState,
  action: SmartKitchenFlowAction,
): SmartKitchenFlowState {
  switch (action.type) {
    case 'loadProjectStart':
      return {
        ...state,
        status: 'loading',
        errorMessage: null,
      };

    case 'loadProjectSuccess':
      return {
        ...state,
        project: action.project,
        reviewData: action.project.reviewData,
        generationJob: action.project.generationJob ?? null,
        designSet: action.project.designSet ?? null,
        activeDesignId: action.project.activeDesignId ?? null,
        selectedComparisonDesignIds: action.project.selectedComparisonDesignIds,
        customerRatings: action.project.customerRatings,
        customerFavoriteDesignId: action.project.customerFavoriteDesignId ?? null,
        activeEstimate: action.project.activeEstimate ?? null,
        handoffFormData: action.project.handoffFormData ?? null,
        status: 'success',
        errorMessage: null,
      };

    case 'loadProjectFailure':
      return {
        ...state,
        status: 'error',
        errorMessage: action.errorMessage,
      };

    case 'setActiveStep':
      return syncProject(state, { activeStepId: action.stepId });

    case 'updateReviewData':
      return syncProject(
        {
          ...state,
          reviewData: action.reviewData,
        },
        { reviewData: action.reviewData },
      );

    case 'setValidationResult':
      return {
        ...state,
        validationResult: action.validationResult,
      };

    case 'startGeneration':
      return syncProject(
        {
          ...state,
          generationJob: action.job,
          status: 'loading',
          errorMessage: null,
        },
        {
          generationJob: action.job,
          activeStepId: 'generating',
          status: 'generating',
        },
      );

    case 'setGenerationJob':
      return syncProject(
        {
          ...state,
          generationJob: action.job,
        },
        {
          generationJob: action.job,
          activeStepId: action.job.status === 'completed' ? 'studio' : 'generating',
          status: action.job.status === 'completed' ? 'designsReady' : 'generating',
        },
      );

    case 'setGeneratedDesigns':
      return syncProject(
        {
          ...state,
          designSet: action.designSet,
          activeDesignId: action.designSet.designs[0]?.id ?? state.activeDesignId,
          status: 'success',
        },
        {
          designSet: action.designSet,
          activeDesignId: action.designSet.designs[0]?.id ?? state.activeDesignId ?? undefined,
          activeStepId: 'studio',
          status: 'designsReady',
        },
      );

    case 'appendDesignVersion':
      return appendSmartKitchenDesignVersion(state, action.design);

    case 'setActiveDesign':
      return syncProject(
        {
          ...state,
          activeDesignId: action.designId,
        },
        { activeDesignId: action.designId },
      );

    case 'addSelectedComparisonDesign': {
      const selectedComparisonDesignIds = appendUniqueSelection(
        state.selectedComparisonDesignIds,
        action.designId,
        action.maxSelections,
      );

      return syncProject(
        {
          ...state,
          selectedComparisonDesignIds,
        },
        { selectedComparisonDesignIds },
      );
    }

    case 'removeSelectedComparisonDesign': {
      const selectedComparisonDesignIds = state.selectedComparisonDesignIds.filter(
        (designId) => designId !== action.designId,
      );

      return syncProject(
        {
          ...state,
          selectedComparisonDesignIds,
        },
        { selectedComparisonDesignIds },
      );
    }

    case 'setCustomerRating': {
      const customerRatings = upsertCustomerRating(state.customerRatings, action.rating);

      return syncProject(
        {
          ...state,
          customerRatings,
        },
        { customerRatings },
      );
    }

    case 'setCustomerRatings':
      return syncProject(
        {
          ...state,
          customerRatings: action.ratings,
        },
        { customerRatings: action.ratings },
      );

    case 'markFavorite':
      return syncProject(
        {
          ...state,
          customerFavoriteDesignId: action.designId,
          activeDesignId: action.designId,
        },
        {
          customerFavoriteDesignId: action.designId,
          activeDesignId: action.designId,
        },
      );

    case 'setEstimate':
      return syncProject(
        {
          ...state,
          activeEstimate: action.estimate,
        },
        { activeEstimate: action.estimate },
      );

    case 'setFinalReviewSlide':
      return {
        ...state,
        finalReviewSlide: action.slide,
      };

    case 'setHandoffFormData':
      return syncProject(
        {
          ...state,
          handoffFormData: action.handoffFormData,
        },
        { handoffFormData: action.handoffFormData },
      );

    case 'setStatus':
      return {
        ...state,
        status: action.status,
      };

    case 'setError':
      return {
        ...state,
        status: 'error',
        errorMessage: action.errorMessage,
      };

    case 'clearError':
      return {
        ...state,
        errorMessage: null,
        status: state.status === 'error' ? 'idle' : state.status,
      };

    default: {
      const exhaustiveCheck: never = action;
      return exhaustiveCheck;
    }
  }
}

export function appendSmartKitchenDesignVersion(
  state: SmartKitchenFlowState,
  design: KitchenDesign,
): SmartKitchenFlowState {
  const designSet = addDesignToDesignSet(state.designSet, design);

  return syncProject(
    {
      ...state,
      designSet,
      activeDesignId: design.id,
    },
    {
      designSet: designSet ?? undefined,
      activeDesignId: design.id,
    },
  );
}
