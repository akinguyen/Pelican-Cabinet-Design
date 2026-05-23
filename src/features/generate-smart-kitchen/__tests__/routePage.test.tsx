import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GenerateSmartKitchenProjectPage from '../../../../app/generate-smart-kitchen/[projectId]/page';

describe('Generate Smart Kitchen route page', () => {
  it('reads projectId from route params and renders the simplified mockup screen', async () => {
    const page = await GenerateSmartKitchenProjectPage({
      params: Promise.resolve({ projectId: 'route-project-001' }),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain('AI Kitchen Pro');
    expect(markup).toContain('Generate Smart Kitchen');
    expect(markup).toContain('Generate Smart Kitchen Images');
    expect(markup).toContain('Attached File');
    expect(markup).toContain('Current Floor Plan / Project Data');
    expect(markup).toContain('Instructions');
    expect(markup).toContain('Generate Images');
    expect(markup).not.toContain('Review & Confirm Kitchen');
    expect(markup).not.toContain('AI Kitchen Studio');
    expect(markup).not.toContain('Compare & Choose');
    expect(markup).not.toContain('Estimate Review');
    expect(markup).not.toContain('Final Review & Export');
  });
});
