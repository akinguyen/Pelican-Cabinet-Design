'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import {
  createFakeSmartKitchenApi,
  type DuplicateVersionPayload,
  type RefineDesignPayload,
  type SmartKitchenApi,
} from '../api/smartKitchenApi';
import type {
  CustomerRating,
  Estimate,
  ExportFileType,
  OptionalEstimateItem,
  ProductionHandoffFormData,
  ReviewData,
  SmartKitchenStepId,
} from '../types';
import {
  initialSmartKitchenFlowState,
  smartKitchenReducer,
  type SmartKitchenFinalReviewSlide,
  type SmartKitchenFlowState,
} from './smartKitchenReducer';

export interface SmartKitchenFlowActions {
  readonly loadProject: (projectId: string) => Promise<void>;
  readonly saveReviewData: (projectId: string, reviewData: ReviewData) => Promise<void>;
  readonly validateProject: (projectId: string) => Promise<void>;
  readonly startGeneration: (projectId: string) => Promise<void>;
  readonly refreshGenerationJob: (jobId: string) => Promise<void>;
  readonly loadDesigns: (projectId: string) => Promise<void>;
  readonly refineDesign: (designId: string, payload: RefineDesignPayload) => Promise<void>;
  readonly duplicateVersion: (versionId: string, payload: DuplicateVersionPayload) => Promise<void>;
  readonly markCustomerFavorite: (projectId: string, designId: string) => Promise<void>;
  readonly saveCustomerRatings: (
    projectId: string,
    ratings: readonly CustomerRating[],
  ) => Promise<void>;
  readonly recalculateEstimate: (
    designId: string,
    optionalItems: readonly OptionalEstimateItem[],
  ) => Promise<void>;
  readonly savePreferredBudgetVersion: (designId: string, estimate: Estimate) => Promise<void>;
  readonly createPresentation: (designId: string) => Promise<void>;
  readonly exportFile: (projectId: string, fileType: ExportFileType) => Promise<void>;
  readonly sendInternalHandoff: (
    projectId: string,
    formData: ProductionHandoffFormData,
  ) => Promise<void>;
  readonly setActiveStep: (stepId: SmartKitchenStepId) => void;
  readonly setActiveDesign: (designId: string) => void;
  readonly addSelectedComparisonDesign: (designId: string, maxSelections: number) => void;
  readonly removeSelectedComparisonDesign: (designId: string) => void;
  readonly setFinalReviewSlide: (slide: SmartKitchenFinalReviewSlide) => void;
  readonly clearError: () => void;
}

export interface SmartKitchenFlowContextValue {
  readonly state: SmartKitchenFlowState;
  readonly actions: SmartKitchenFlowActions;
  readonly api: SmartKitchenApi;
}

export interface SmartKitchenFlowProviderProps {
  readonly children: ReactNode;
  readonly api?: SmartKitchenApi;
  readonly initialState?: SmartKitchenFlowState;
}

const SmartKitchenFlowContext = createContext<SmartKitchenFlowContextValue | null>(null);

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unknown Smart Kitchen error occurred.';
}

export function SmartKitchenFlowProvider({
  children,
  api: providedApi,
  initialState = initialSmartKitchenFlowState,
}: SmartKitchenFlowProviderProps) {
  const api = useMemo(() => providedApi ?? createFakeSmartKitchenApi(), [providedApi]);
  const [state, dispatch] = useReducer(smartKitchenReducer, initialState);

  const runAsync = useCallback(async (operation: () => Promise<void>): Promise<void> => {
    try {
      await operation();
    } catch (error) {
      dispatch({ type: 'setError', errorMessage: getErrorMessage(error) });
    }
  }, []);

  const actions = useMemo<SmartKitchenFlowActions>(
    () => ({
      async loadProject(projectId) {
        dispatch({ type: 'loadProjectStart' });
        await runAsync(async () => {
          const project = await api.getProject(projectId);
          dispatch({ type: 'loadProjectSuccess', project });
        });
      },

      async saveReviewData(projectId, reviewData) {
        await runAsync(async () => {
          const project = await api.saveReviewData(projectId, reviewData);
          dispatch({ type: 'loadProjectSuccess', project });
        });
      },

      async validateProject(projectId) {
        await runAsync(async () => {
          const validationResult = await api.validateProject(projectId);
          dispatch({ type: 'setValidationResult', validationResult });
        });
      },

      async startGeneration(projectId) {
        await runAsync(async () => {
          const result = await api.startGeneration(projectId);
          dispatch({ type: 'startGeneration', job: result.job });
        });
      },

      async refreshGenerationJob(jobId) {
        await runAsync(async () => {
          const job = await api.getGenerationJob(jobId);
          dispatch({ type: 'setGenerationJob', job });
        });
      },

      async loadDesigns(projectId) {
        await runAsync(async () => {
          const designSet = await api.getDesigns(projectId);
          dispatch({ type: 'setGeneratedDesigns', designSet });
        });
      },

      async refineDesign(designId, payload) {
        await runAsync(async () => {
          const design = await api.refineDesign(designId, payload);
          dispatch({ type: 'appendDesignVersion', design });
        });
      },

      async duplicateVersion(versionId, payload) {
        await runAsync(async () => {
          const design = await api.duplicateVersion(versionId, payload);
          dispatch({ type: 'appendDesignVersion', design });
        });
      },

      async markCustomerFavorite(projectId, designId) {
        await runAsync(async () => {
          const project = await api.markCustomerFavorite(projectId, designId);
          dispatch({ type: 'loadProjectSuccess', project });
        });
      },

      async saveCustomerRatings(projectId, ratings) {
        await runAsync(async () => {
          const project = await api.saveCustomerRatings(projectId, ratings);
          dispatch({ type: 'loadProjectSuccess', project });
        });
      },

      async recalculateEstimate(designId, optionalItems) {
        await runAsync(async () => {
          const estimate = await api.recalculateEstimate(designId, optionalItems);
          dispatch({ type: 'setEstimate', estimate });
        });
      },

      async savePreferredBudgetVersion(designId, estimate) {
        await runAsync(async () => {
          const savedEstimate = await api.savePreferredBudgetVersion(designId, estimate);
          dispatch({ type: 'setEstimate', estimate: savedEstimate });
        });
      },

      async createPresentation(designId) {
        await runAsync(async () => {
          await api.createPresentation(designId);
          dispatch({ type: 'setActiveStep', stepId: 'presentation' });
        });
      },

      async exportFile(projectId, fileType) {
        await runAsync(async () => {
          await api.exportFile(projectId, fileType);
        });
      },

      async sendInternalHandoff(projectId, formData) {
        await runAsync(async () => {
          await api.sendInternalHandoff(projectId, formData);
          dispatch({ type: 'setHandoffFormData', handoffFormData: formData });
          dispatch({ type: 'setActiveStep', stepId: 'export' });
        });
      },

      setActiveStep(stepId) {
        dispatch({ type: 'setActiveStep', stepId });
      },

      setActiveDesign(designId) {
        dispatch({ type: 'setActiveDesign', designId });
      },

      addSelectedComparisonDesign(designId, maxSelections) {
        dispatch({ type: 'addSelectedComparisonDesign', designId, maxSelections });
      },

      removeSelectedComparisonDesign(designId) {
        dispatch({ type: 'removeSelectedComparisonDesign', designId });
      },

      setFinalReviewSlide(slide) {
        dispatch({ type: 'setFinalReviewSlide', slide });
      },

      clearError() {
        dispatch({ type: 'clearError' });
      },
    }),
    [api, runAsync],
  );

  const value = useMemo<SmartKitchenFlowContextValue>(
    () => ({
      state,
      actions,
      api,
    }),
    [actions, api, state],
  );

  return <SmartKitchenFlowContext.Provider value={value}>{children}</SmartKitchenFlowContext.Provider>;
}

export function useSmartKitchenFlow(): SmartKitchenFlowContextValue {
  const value = useContext(SmartKitchenFlowContext);

  if (!value) {
    throw new Error('useSmartKitchenFlow must be used within SmartKitchenFlowProvider.');
  }

  return value;
}
