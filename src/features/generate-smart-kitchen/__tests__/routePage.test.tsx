import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GenerateSmartKitchenProjectPage from '../../../../app/generate-smart-kitchen/[projectId]/page';

describe('Generate Smart Kitchen route page', () => {
  it('reads projectId from route params and renders the Review & Confirm workspace first', () => {
    const markup = renderToStaticMarkup(
      <GenerateSmartKitchenProjectPage params={{ projectId: 'route-project-001' }} />,
    );

    expect(markup).toContain('Project route-project-001');
    expect(markup).toContain('Generate Smart Kitchen');
    expect(markup).toContain('Review &amp; Confirm Kitchen');
    expect(markup).toContain('Generate 10 AI Designs');
  });

  it('does not render the generation progress screen before the user starts generation', () => {
    const markup = renderToStaticMarkup(
      <GenerateSmartKitchenProjectPage params={{ projectId: 'route-project-001' }} />,
    );

    expect(markup).not.toContain('Generating Smart Kitchen Designs');
  });
});
