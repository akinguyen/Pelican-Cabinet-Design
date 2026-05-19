import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  FinalReviewExportScreen,
  SMART_KITCHEN_EXPORT_FILE_TYPES,
  createInitialExportActionState,
  createMockEstimate,
  createMockKitchenDesign,
  createMockSmartKitchenProject,
} from '../index';

describe('FinalReviewExportScreen', () => {
  it('renders final review cards and all independent export actions', () => {
    const project = createMockSmartKitchenProject();
    const design = createMockKitchenDesign(3);
    const estimate = createMockEstimate(design.id);
    const markup = renderToStaticMarkup(
      <FinalReviewExportScreen project={project} design={design} estimate={estimate} />,
    );

    expect(markup).toContain('Final Review &amp; Export');
    expect(markup).toContain('Project Summary');
    expect(markup).toContain('Key Measurements');
    expect(markup).toContain('Cabinet List Summary');
    expect(markup).toContain('Materials List Summary');
    expect(markup).toContain('Pricing Summary');
    expect(markup).toContain('Send to Internal Team');

    for (const definition of SMART_KITCHEN_EXPORT_FILE_TYPES) {
      expect(markup).toContain(definition.label);
      expect(markup).toContain(definition.description);
    }
  });

  it('keeps export action state independent per file type', () => {
    const exportState = createInitialExportActionState({
      designJson: { status: 'success', downloadUrl: '/mock/design.json' },
      pricingXlsx: { status: 'error', errorMessage: 'Pricing failed.' },
    });

    expect(exportState.designJson.status).toBe('success');
    expect(exportState.pricingXlsx.status).toBe('error');
    expect(exportState.cabinetListCsv.status).toBe('idle');
  });

  it('renders independent success and error export statuses', () => {
    const design = createMockKitchenDesign(3);
    const markup = renderToStaticMarkup(
      <FinalReviewExportScreen
        project={createMockSmartKitchenProject()}
        design={design}
        estimate={createMockEstimate(design.id)}
        initialExportActionState={{
          designJson: { status: 'success', downloadUrl: '/mock/design.json' },
          pricingXlsx: { status: 'error', errorMessage: 'Pricing failed.' },
        }}
      />,
    );

    expect(markup).toContain('Export ready');
    expect(markup).toContain('Pricing failed.');
    expect(markup).toContain('Cabinet List');
  });
});
