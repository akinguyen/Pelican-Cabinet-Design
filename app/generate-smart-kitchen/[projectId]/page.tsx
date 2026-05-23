'use client';

import { useEffect, useMemo } from 'react';
import { SmartKitchenFlowShell } from '../../../src/features/generate-smart-kitchen/components/layout/SmartKitchenFlowShell';
import { PrimaryButton } from '../../../src/features/generate-smart-kitchen/components/shared/PrimaryButton';
import { SectionCard } from '../../../src/features/generate-smart-kitchen/components/shared/SectionCard';
import { SmartKitchenFlowProvider, useSmartKitchenFlow } from '../../../src/features/generate-smart-kitchen/state/SmartKitchenFlowProvider';
import { createMockProductionHandoffFormData } from '../../../src/features/generate-smart-kitchen/mockData';
import {
  canCompareSelectedDesigns,
  getActiveKitchenDesign,
  getKitchenDesignsByIds,
} from '../../../src/features/generate-smart-kitchen/utils/smartKitchenCalculations';
import type { SmartKitchenStepId } from '../../../src/features/generate-smart-kitchen/types';
import { editorToSmartKitchenData } from '../../../src/features/generate-smart-kitchen/utils/editorToSmartKitchenData';
import { GenerateDesignsScreen } from '../../../src/features/generate-smart-kitchen/screens/GenerateDesignsScreen';
import { CompareChooseScreen } from '../../../src/features/generate-smart-kitchen/screens/CompareChooseScreen';
import { EstimateReviewScreen } from '../../../src/features/generate-smart-kitchen/screens/EstimateReviewScreen';
import { FinalReviewExportScreen } from '../../../src/features/generate-smart-kitchen/screens/FinalReviewExportScreen';
import { KitchenStudioScreen } from '../../../src/features/generate-smart-kitchen/screens/KitchenStudioScreen';
import { PresentationScreen } from '../../../src/features/generate-smart-kitchen/screens/PresentationScreen';
import { ReviewConfirmScreen } from '../../../src/features/generate-smart-kitchen/screens/ReviewConfirmScreen';

export interface GenerateSmartKitchenProjectPageProps {
  readonly params: {
    readonly projectId: string;
  };
}

export default function GenerateSmartKitchenProjectPage({ params }: GenerateSmartKitchenProjectPageProps) {
  return (
    <SmartKitchenFlowProvider>
      <GenerateSmartKitchenWorkspaceContent projectId={params.projectId} />
    </SmartKitchenFlowProvider>
  );
}

export interface GenerateSmartKitchenWorkspaceContentProps {
  readonly projectId: string;
}

function getVisibleStepId(activeStepId: SmartKitchenStepId | undefined): SmartKitchenStepId {
  if (!activeStepId || activeStepId === 'review') {
    return 'review';
  }

  if (activeStepId === 'generating' || activeStepId === 'studio') {
    return 'generating';
  }

  return activeStepId;
}

export function GenerateSmartKitchenWorkspaceContent({ projectId }: GenerateSmartKitchenWorkspaceContentProps) {
  const { state, actions } = useSmartKitchenFlow();
  const fallbackReviewData = useMemo(
    () => editorToSmartKitchenData({ projectName: `Project ${projectId}`, sourceFloorPlanJson: { projectId } }),
    [projectId],
  );
  const reviewData = state.reviewData ?? fallbackReviewData;
  const projectActiveStepId = state.project?.activeStepId;
  const activeStepId = getVisibleStepId(projectActiveStepId);
  const completedStepIds = state.project?.completedStepIds ?? [];
  const projectName = state.project?.reviewData.projectName ?? reviewData.projectName;
  const shouldShowGeneration = projectActiveStepId === 'generating';

  useEffect(() => {
    void actions.loadProject(projectId);
  }, [actions, projectId]);

  useEffect(() => {
    if (!state.project) {
      return;
    }

    if (
      ['studio', 'compare', 'estimate', 'presentation', 'export'].includes(state.project.activeStepId) &&
      !state.designSet
    ) {
      void actions.loadDesigns(projectId);
    }
  }, [actions, projectId, state.designSet, state.project?.activeStepId]);

  async function handleGenerateDesigns(): Promise<void> {
    await actions.saveReviewData(projectId, reviewData);
    await actions.validateProject(projectId);
    await actions.startGeneration(projectId);
  }

  async function handleRefreshProgress(): Promise<void> {
    if (state.generationJob) {
      await actions.refreshGenerationJob(state.generationJob.id);
    }
  }

  const activeDesign = getActiveKitchenDesign(state.designSet?.designs ?? [], state.activeDesignId);
  const selectedComparisonDesigns = state.designSet
    ? getKitchenDesignsByIds(state.designSet.designs, state.selectedComparisonDesignIds)
    : [];
  const canOpenComparison = canCompareSelectedDesigns(state.selectedComparisonDesignIds);
  const handoffFormData = state.handoffFormData ?? state.project?.handoffFormData ?? createMockProductionHandoffFormData();
  const designSetReady = Boolean(state.designSet && state.designSet.designs.length > 0);

  return (
    <SmartKitchenFlowShell
      activeStepId={shouldShowGeneration ? 'generating' : activeStepId}
      completedStepIds={completedStepIds}
      projectName={projectName}
      onStepSelect={actions.setActiveStep}
      onSaveDraft={() => undefined}
      onBackToEditor={() => undefined}
      onExit={() => undefined}
      topBarSecondaryActions={<PrimaryButton variant="ghost">Help</PrimaryButton>}
    >
      {state.errorMessage ? (
        <SectionCard title="Workspace notice" className="mb-6 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">{state.errorMessage}</p>
        </SectionCard>
      ) : null}

      {shouldShowGeneration ? (
        <GenerateDesignsScreen
          generationJob={state.generationJob}
          reviewData={reviewData}
          onRefreshProgress={handleRefreshProgress}
        />
      ) : activeStepId === 'studio' ? (
        <KitchenStudioScreen
          designs={state.designSet?.designs ?? []}
          activeDesignId={state.activeDesignId}
          selectedComparisonDesignIds={state.selectedComparisonDesignIds}
          customerFavoriteDesignId={state.customerFavoriteDesignId}
          onActiveDesignChange={actions.setActiveDesign}
          onMarkCustomerFavorite={(designId) => {
            void actions.markCustomerFavorite(projectId, designId);
          }}
          onAddComparisonDesign={(designId) => {
            actions.addSelectedComparisonDesign(designId, 3);
          }}
          onRemoveComparisonDesign={actions.removeSelectedComparisonDesign}
          onOpenComparison={() => {
            if (canOpenComparison) {
              actions.setActiveStep('compare');
            }
          }}
        />
      ) : activeStepId === 'compare' ? (
        <CompareChooseScreen
          designs={selectedComparisonDesigns}
          customerFavoriteDesignId={state.customerFavoriteDesignId}
          onMarkCustomerFavorite={(designId) => {
            void actions.markCustomerFavorite(projectId, designId);
          }}
          onBackToStudio={() => {
            actions.setActiveStep('studio');
          }}
          onContinueToEstimate={() => {
            actions.setActiveStep('estimate');
          }}
        />
      ) : activeStepId === 'estimate' ? (
        activeDesign && state.activeEstimate ? (
          <EstimateReviewScreen
            design={activeDesign}
            estimate={state.activeEstimate}
            onBackToComparison={() => {
              actions.setActiveStep('compare');
            }}
            onRecalculateEstimate={(optionalItems) => actions.recalculateEstimate(activeDesign.id, optionalItems)}
            onSavePreferredBudgetVersion={(estimate) => actions.savePreferredBudgetVersion(activeDesign.id, estimate)}
            onCreatePresentation={() => {
              void actions.createPresentation(activeDesign.id);
            }}
          />
        ) : (
          <SectionCard title="Estimate Review" className="mx-auto max-w-4xl">
            <p className="text-sm text-slate-600">
              {designSetReady ? 'Estimate data is loading.' : 'No generated design estimate is available yet.'}
            </p>
          </SectionCard>
        )
      ) : activeStepId === 'presentation' ? (
        activeDesign && state.activeEstimate ? (
          <PresentationScreen
            design={activeDesign}
            estimate={state.activeEstimate}
            reviewData={reviewData}
            onDownloadPdf={() => {
              void actions.createPresentation(activeDesign.id);
            }}
            onExitPresentation={() => {
              actions.setActiveStep('estimate');
            }}
            onContinueToExport={() => {
              actions.setActiveStep('export');
            }}
          />
        ) : (
          <SectionCard title="Presentation" className="mx-auto max-w-4xl">
            <p className="text-sm text-slate-600">
              {designSetReady ? 'Presentation data is loading.' : 'No presentation package is available yet.'}
            </p>
          </SectionCard>
        )
      ) : activeStepId === 'export' ? (
        activeDesign && state.activeEstimate && state.project ? (
          <FinalReviewExportScreen
            project={state.project}
            design={activeDesign}
            estimate={state.activeEstimate}
            reviewData={reviewData}
            handoffFormData={handoffFormData}
            onBackToPresentation={() => {
              actions.setActiveStep('presentation');
            }}
            onExportFile={(fileType) => actions.exportFile(projectId, fileType)}
            onSendInternalTeam={() => {
              void actions.sendInternalHandoff(projectId, handoffFormData);
            }}
          />
        ) : (
          <SectionCard title="Final Review &amp; Export" className="mx-auto max-w-4xl">
            <p className="text-sm text-slate-600">
              {designSetReady ? 'Final export data is loading.' : 'No final export package is available yet.'}
            </p>
          </SectionCard>
        )
      ) : (
        <ReviewConfirmScreen
          reviewData={reviewData}
          validationResult={state.validationResult}
          isGenerating={state.status === 'loading'}
          onGenerateDesigns={() => {
            void handleGenerateDesigns();
          }}
        />
      )}
    </SmartKitchenFlowShell>
  );
}
