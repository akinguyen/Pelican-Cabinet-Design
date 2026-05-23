import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SimpleGenerateSmartKitchenScreen } from '../screens/SimpleGenerateSmartKitchenScreen';

describe('Simple Generate Smart Kitchen screen', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the polished simplified workspace interface', () => {
    const markup = renderToStaticMarkup(
      <SimpleGenerateSmartKitchenScreen projectId="simple-project-001" />,
    );

    expect(markup).toContain('AI Kitchen Pro');
    expect(markup).toContain('Back to Editor');
    expect(markup).toContain('Exit Workspace');
    expect(markup).toContain('Generate Smart Kitchen Images');
    expect(markup).toContain('Enter your design instructions and use the attached project file');
    expect(markup).toContain('Attached File');
    expect(markup).toContain('Current Floor Plan / Project Data');
    expect(markup).toContain('Project file • 2.4 MB');
    expect(markup).toContain('Attached');
    expect(markup).toContain('Instructions');
    expect(markup).toContain('Describe the kitchen style, materials, colors, layout ideas, appliances, and');
    expect(markup).toContain('0 / 1000');
    expect(markup).toContain('Generate Images');
  });

  it('keeps project id available for route-level state without showing old workflow chrome', () => {
    const markup = renderToStaticMarkup(
      <SimpleGenerateSmartKitchenScreen projectId="simple-project-001" />,
    );

    expect(markup).toContain('data-project-id="simple-project-001"');
    expect(markup).not.toContain('Review &amp; Confirm Kitchen');
    expect(markup).not.toContain('AI Kitchen Studio');
    expect(markup).not.toContain('Compare &amp; Choose');
    expect(markup).not.toContain('Estimate Review');
    expect(markup).not.toContain('Final Review &amp; Export');
  });

  it('does not call any API when rendered', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    renderToStaticMarkup(<SimpleGenerateSmartKitchenScreen projectId="simple-project-001" />);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
