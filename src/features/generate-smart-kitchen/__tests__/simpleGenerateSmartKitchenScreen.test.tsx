import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AiRoomInput, GeneratedKitchenLayout } from '../../../../lib/ai/types';
import {
  buildGeneratedImageConceptGroups,
  filterGeneratedImagesForGeneration,
  SimpleGenerateSmartKitchenScreen,
  formatInstructionCharacterCounter,
  buildGeneratedAttachmentDownloadPayload,
  buildOriginalAttachmentDownloadPayload,
  saveGeneratedRoomForEditorReturn,
  SMART_KITCHEN_EDITOR_ROUTE,
} from '../screens/SimpleGenerateSmartKitchenScreen';
import {
  clearSmartKitchenEditorReturnDraft,
  createSmartKitchenWorkspaceDraft,
  loadSmartKitchenEditorReturnDraft,
} from '../utils/workspaceDraftStorage';

describe('Simple Generate Smart Kitchen screen', () => {
  it('exposes the main editor return route constant', () => {
    expect(SMART_KITCHEN_EDITOR_ROUTE).toBe('/');
  });

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
    expect(markup).not.toContain('Back to Editor');
    expect(markup).toContain('Attached File');
    expect(markup).toContain('Current Floor Plan / Project Data');
    expect(markup).toContain('Attached');
    expect(markup).toContain('Download Attached File');
    expect(markup).toContain('Instructions');
    expect(markup).toContain('0 / 1000');
    expect(markup).toContain('Placeholder image mode');
    expect(markup).toContain('Generate Images');
  });

  it('builds an original attachment download payload for the editor export', () => {
    const room: AiRoomInput = {
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
    };

    const payload = buildOriginalAttachmentDownloadPayload('project-a', {
      kind: 'original',
      fileName: 'project-a.json',
      room,
      exportedAtIso: '2026-05-23T12:00:00.000Z',
    });

    expect(payload).toMatchObject({
      projectId: 'project-a',
      source: 'generate-smart-kitchen-workspace',
      fileName: 'project-a.json',
      room,
      exportedAtIso: '2026-05-23T12:00:00.000Z',
    });
  });

  it('formats the instruction character counter safely', () => {
    expect(formatInstructionCharacterCounter('')).toBe('0 / 1000');
    expect(formatInstructionCharacterCounter('kitchen')).toBe('7 / 1000');
    expect(formatInstructionCharacterCounter('x'.repeat(1200))).toBe('1000 / 1000');
  });

  it('groups fifteen generated images into five concepts with three separate images each', () => {
    const images = Array.from({ length: 15 }, (_, index) => ({
      id: `image-${index + 1}`,
      generationId: 'batch-1',
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

  it('filters images by generation id without mixing legacy batches', () => {
    const images = [
      { id: 'image-1', generationId: 'batch-a', imageUrl: 'data:image/png;base64,one', mimeType: 'image/png' },
      { id: 'image-2', generationId: 'batch-b', imageUrl: 'data:image/png;base64,two', mimeType: 'image/png' },
      { id: 'image-3', imageUrl: 'data:image/png;base64,legacy', mimeType: 'image/png' },
    ];

    expect(filterGeneratedImagesForGeneration(images, 'batch-a')).toEqual([
      images[0],
    ]);
    expect(filterGeneratedImagesForGeneration(images, null)).toEqual([
      images[2],
    ]);
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

  it('saves the generated room for editor return when a generated room exists', () => {
    clearSmartKitchenEditorReturnDraft('simple-project-001');

    const room: AiRoomInput = {
      walls: [{ id: 'wall-1', start: { x: 0, y: 0 }, end: { x: 120, y: 0 } }],
      windows: [],
      doors: [],
      cabinets: [],
      catalog: [],
      wallChains: [],
      meta: {
        source: 'generated',
        gridSize: 28,
        wallThickness: 16,
        generatedAt: '2026-05-26T00:00:00.000Z',
      },
    };

    const didSave = saveGeneratedRoomForEditorReturn({
      projectId: 'simple-project-001',
      generatedRoom: room,
      generatedLayout: {
        room,
        cabinets: [],
        summary: {
          layoutType: 'single-wall',
          notes: ['Generated room'],
          selectedWallIds: ['wall-1'],
          generationMethod: 'smart-ai',
          plannerModel: 'unit-test',
        },
        elevations: [],
      },
      generatedRoomFileName: 'generated-smart-kitchen-room.json',
    });

    const savedDraft = loadSmartKitchenEditorReturnDraft('simple-project-001');

    expect(didSave).toBe(true);
    expect(savedDraft).not.toBeNull();
    expect(savedDraft?.projectId).toBe('simple-project-001');
    expect(savedDraft?.generatedRoomFileName).toBe('generated-smart-kitchen-room.json');
    expect(savedDraft?.generatedLayout?.summary.layoutType).toBe('single-wall');
    expect(savedDraft?.room).toEqual(room);
  });

  it('builds a generated attachment download payload that includes the generated layout', () => {
    const room: AiRoomInput = {
      walls: [{ id: 'wall-1', start: { x: 0, y: 0 }, end: { x: 120, y: 0 } }],
      windows: [],
      doors: [],
      cabinets: [],
      catalog: [],
      wallChains: [],
      meta: {
        source: 'generated',
        gridSize: 28,
        wallThickness: 16,
        generatedAt: '2026-05-26T00:00:00.000Z',
      },
    };
    const generatedLayout = {
      room,
      cabinets: [],
      summary: {
        layoutType: 'single-wall',
        notes: ['Generated room'],
        selectedWallIds: ['wall-1'],
        generationMethod: 'smart-ai',
        plannerModel: 'unit-test',
      },
      elevations: [],
    } satisfies GeneratedKitchenLayout;

    const payload = buildGeneratedAttachmentDownloadPayload('project-a', {
      kind: 'generated',
      generationId: 'batch-1',
      fileName: 'generated-smart-kitchen-room.json',
      room,
      generatedLayout,
      generatedRoomFileName: 'generated-smart-kitchen-room.json',
      generatedAtIso: '2026-05-26T01:00:00.000Z',
      instructions: 'Keep the oak cabinets and open shelving.',
    });

    expect(payload).toMatchObject({
      projectId: 'project-a',
      source: 'generate-smart-kitchen',
      fileName: 'generated-smart-kitchen-room.json',
      room,
      generatedRoom: room,
      generatedLayout,
      generationId: 'batch-1',
      instructions: 'Keep the oak cabinets and open shelving.',
      generatedAtIso: '2026-05-26T01:00:00.000Z',
    });
  });

  it('does not save an editor return draft when no generated room exists', () => {
    clearSmartKitchenEditorReturnDraft('simple-project-001');

    const didSave = saveGeneratedRoomForEditorReturn({
      projectId: 'simple-project-001',
      generatedRoom: null,
      generatedLayout: null,
      generatedRoomFileName: null,
    });

    expect(didSave).toBe(false);
    expect(loadSmartKitchenEditorReturnDraft('simple-project-001')).toBeNull();
  });
});
