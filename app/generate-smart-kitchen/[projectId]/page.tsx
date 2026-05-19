'use client';

import { useEffect, useMemo } from 'react';
import { SmartKitchenFlowShell } from '../../../src/features/generate-smart-kitchen/components/layout/SmartKitchenFlowShell';
import { PrimaryButton } from '../../../src/features/generate-smart-kitchen/components/shared/PrimaryButton';
import { SectionCard } from '../../../src/features/generate-smart-kitchen/components/shared/SectionCard';
import { SmartKitchenFlowProvider, useSmartKitchenFlow } from '../../../src/features/generate-smart-kitchen/state/SmartKitchenFlowProvider';
import type { SmartKitchenStepId } from '../../../src/features/generate-smart-kitchen/types';
import { editorToSmartKitchenData } from '../../../src/features/generate-smart-kitchen/utils/editorToSmartKitchenData';
import { GenerateDesignsScreen } from '../../../src/features/generate-smart-kitchen/screens/GenerateDesignsScreen';
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
  const activeStepId = getVisibleStepId(state.project?.activeStepId);
  const completedStepIds = state.project?.completedStepIds ?? [];
  const projectName = state.project?.reviewData.projectName ?? reviewData.projectName;
  const shouldShowGeneration = activeStepId === 'generating' || Boolean(state.generationJob);

  useEffect(() => {
    void actions.loadProject(projectId);
  }, [actions, projectId]);

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
