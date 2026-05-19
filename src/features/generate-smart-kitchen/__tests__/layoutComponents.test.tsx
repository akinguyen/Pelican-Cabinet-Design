import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  PrimaryButton,
  SmartKitchenFlowShell,
  SmartKitchenStepSidebar,
  SmartKitchenTopBar,
} from '../index';

describe('Generate Smart Kitchen layout components', () => {
  it('renders the seven-step sidebar with active and completed states', () => {
    const markup = renderToStaticMarkup(
      <SmartKitchenStepSidebar
        activeStepId="studio"
        completedStepIds={['review', 'generating']}
      />,
    );

    expect(markup).toContain('Generate Smart Kitchen');
    expect(markup).toContain('Review &amp; Confirm');
    expect(markup).toContain('Generate Designs');
    expect(markup).toContain('AI Kitchen Studio');
    expect(markup).toContain('Final Review &amp; Export');
    expect(markup).toContain('aria-current="step"');
    expect(markup).toContain('✓');
  });

  it('renders the workspace top bar with project controls', () => {
    const markup = renderToStaticMarkup(
      <SmartKitchenTopBar
        projectName="Smith Residence - Main Kitchen"
        secondaryActions={<PrimaryButton variant="ghost">Help</PrimaryButton>}
      />,
    );

    expect(markup).toContain('Smith Residence - Main Kitchen');
    expect(markup).toContain('Back to Editor');
    expect(markup).toContain('Save Draft');
    expect(markup).toContain('Exit Workspace');
    expect(markup).toContain('Help');
  });

  it('renders the flow shell with sidebar, top bar, main content, and right panel', () => {
    const markup = renderToStaticMarkup(
      <SmartKitchenFlowShell
        activeStepId="review"
        completedStepIds={[]}
        projectName="Smith Residence - Main Kitchen"
        rightPanel={<div>Project Summary</div>}
      >
        <h1>Review & Confirm Kitchen</h1>
      </SmartKitchenFlowShell>,
    );

    expect(markup).toContain('Generate Smart Kitchen');
    expect(markup).toContain('Smith Residence - Main Kitchen');
    expect(markup).toContain('Review &amp; Confirm Kitchen');
    expect(markup).toContain('Project Summary');
  });
});
