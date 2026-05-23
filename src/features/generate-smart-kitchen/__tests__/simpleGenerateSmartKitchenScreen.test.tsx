import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  buildGeneratedImageConceptGroups,
  SimpleGenerateSmartKitchenScreen,
  formatInstructionCharacterCounter,
} from '../screens/SimpleGenerateSmartKitchenScreen';
import { createSmartKitchenWorkspaceDraft } from '../utils/workspaceDraftStorage';

describe('Simple Generate Smart Kitchen screen', () => {
  it('renders the mockup-style workspace shell and simplified input card', () => {
    const draft = createSmartKitchenWorkspaceDraft(
      {
        walls: [{ id: 'wall-1', start: { x: 0, y: 0 }, end: { x: 120, y: 0 } }],
        windows: [],
        doors: [],
        cabinets: [],
        catalog: [],
        wallChains: [],
        meta: {
          source: 'editor-export',
          gridSize: 28,
          wallThickness: 16,
          generatedAt: '2026-05-23T12:00:00.000Z',
        },
      },
      {
        fileName: 'pelican-smart-kitchen-editor-room-export.json',
        exportedAtIso: '2026-05-23T12:00:00.000Z',
      },
    );

    const markup = renderToStaticMarkup(
      <SimpleGenerateSmartKitchenScreen
        projectId="simple-project-001"
        initialDraft={draft}
      />,
    );

    expect(markup).toContain('AI Kitchen Pro');
    expect(markup).toContain('Generate Smart Kitchen');
    expect(markup).toContain('Generate Smart Kitchen Images');
    expect(markup).toContain('Attached File');
    expect(markup).toContain('Current Floor Plan / Project Data');
    expect(markup).toContain('Attached');
    expect(markup).toContain('Download Attached File');
    expect(markup).toContain('Instructions');
    expect(markup).toContain('0 / 1000');
    expect(markup).toContain('Generate Images');
  });

  it('formats the instruction character counter safely', () => {
    expect(formatInstructionCharacterCounter('')).toBe('0 / 1000');
    expect(formatInstructionCharacterCounter('kitchen')).toBe('7 / 1000');
    expect(formatInstructionCharacterCounter('x'.repeat(1200))).toBe('1000 / 1000');
  });

  it('groups fifteen generated images into five concepts with three separate images each', () => {
    const images = Array.from({ length: 15 }, (_, index) => ({
      id: `image-${index + 1}`,
      imageUrl: `data:image/png;base64,image-${index + 1}`,
      mimeType: 'image/png',
      conceptIndex: Math.floor(index / 3),
      conceptLabel: `Concept ${Math.floor(index / 3) + 1}`,
    }));

    const groups = buildGeneratedImageConceptGroups(images);

    expect(groups).toHaveLength(5);
    expect(groups.map((group) => group.label)).toEqual([
      'Concept 1',
      'Concept 2',
      'Concept 3',
      'Concept 4',
      'Concept 5',
    ]);
    expect(groups.every((group) => group.images.length === 3)).toBe(true);
  });

  it('does not render the old debug sections or call any API when rendered', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const markup = renderToStaticMarkup(
      <SimpleGenerateSmartKitchenScreen projectId="simple-project-001" />,
    );

    expect(markup).not.toContain('Workspace Status');
    expect(markup).not.toContain('Generated Images');
    expect(markup).not.toContain('Project ID:');
    expect(markup).not.toContain('Review & Confirm Kitchen');
    expect(markup).not.toContain('Compare & Choose');
    expect(markup).not.toContain('Estimate Review');
    expect(markup).not.toContain('Final Review & Export');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
