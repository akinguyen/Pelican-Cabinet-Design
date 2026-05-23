import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GenerateSmartKitchenProjectPage from '../../../../app/generate-smart-kitchen/[projectId]/page';

describe('Generate Smart Kitchen route page', () => {
  it('reads projectId from route params and renders the simplified workspace screen', () => {
    const markup = renderToStaticMarkup(
      <GenerateSmartKitchenProjectPage params={{ projectId: 'route-project-001' }} />,
    );

    expect(markup).toContain('data-project-id="route-project-001"');
    expect(markup).toContain('Back to Editor');
    expect(markup).toContain('Generate Smart Kitchen Images');
    expect(markup).toContain('Current Floor Plan / Project Data');
    expect(markup).toContain('Describe the kitchen style, materials, colors, layout ideas, appliances, and');
    expect(markup).toContain('Generate Images');
  });

  it('does not render the previous multi-step workflow text', () => {
    const markup = renderToStaticMarkup(
      <GenerateSmartKitchenProjectPage params={{ projectId: 'route-project-001' }} />,
    );

    expect(markup).not.toContain('Review &amp; Confirm Kitchen');
    expect(markup).not.toContain('AI Kitchen Studio');
    expect(markup).not.toContain('Compare &amp; Choose');
    expect(markup).not.toContain('Estimate Review');
    expect(markup).not.toContain('Final Review &amp; Export');
  });
});
