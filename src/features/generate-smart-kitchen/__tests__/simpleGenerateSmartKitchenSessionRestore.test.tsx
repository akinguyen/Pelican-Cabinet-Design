import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiRoomInput, GeneratedKitchenLayout } from '../../../../lib/ai/types';
import type { SmartKitchenWorkspaceDraft } from '../utils/workspaceDraftStorage';

const {
  loadWorkspaceDraftMock,
  loadWorkspaceSessionMock,
  saveWorkspaceSessionMock,
  saveEditorReturnDraftMock,
  routerReplaceMock,
  generateSmartKitchenImagesMock,
} = vi.hoisted(() => ({
  loadWorkspaceDraftMock: vi.fn(),
  loadWorkspaceSessionMock: vi.fn(),
  saveWorkspaceSessionMock: vi.fn(),
  saveEditorReturnDraftMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  generateSmartKitchenImagesMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: routerReplaceMock,
  }),
}));

vi.mock('../utils/workspaceDraftStorage', async () => {
  const actual = await vi.importActual<typeof import('../utils/workspaceDraftStorage')>(
    '../utils/workspaceDraftStorage',
  );

  return {
    ...actual,
    loadSmartKitchenWorkspaceDraft: loadWorkspaceDraftMock,
    loadSmartKitchenWorkspaceSession: loadWorkspaceSessionMock,
    saveSmartKitchenWorkspaceSession: saveWorkspaceSessionMock,
    saveSmartKitchenEditorReturnDraft: saveEditorReturnDraftMock,
  };
});

vi.mock('../utils/generateSmartKitchenImages', async () => {
  const actual = await vi.importActual<typeof import('../utils/generateSmartKitchenImages')>(
    '../utils/generateSmartKitchenImages',
  );

  return {
    ...actual,
    generateSmartKitchenImages: generateSmartKitchenImagesMock,
  };
});

import { SimpleGenerateSmartKitchenScreen } from '../screens/SimpleGenerateSmartKitchenScreen';

function createRoom(): AiRoomInput {
  return {
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
}

function createGeneratedLayout(room: AiRoomInput): GeneratedKitchenLayout {
  return {
    room,
    cabinets: [],
    summary: {
      layoutType: 'single-wall',
      notes: ['Restored session'],
      selectedWallIds: ['wall-1'],
      generationMethod: 'smart-ai',
      plannerModel: 'unit-test-model',
    },
    elevations: [],
  };
}

describe('SimpleGenerateSmartKitchenScreen session restore', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    loadWorkspaceDraftMock.mockReturnValue({
      projectId: 'project-a',
      attachment: {
        fileName: 'project-a.json',
        room: createRoom(),
        exportedAtIso: '2026-05-26T00:00:00.000Z',
      },
    } satisfies SmartKitchenWorkspaceDraft);

    loadWorkspaceSessionMock.mockResolvedValue({
      projectId: 'project-a',
      instructions: 'Keep the oak cabinets and open shelving.',
      generatedImages: [
        {
          id: 'image-1',
          imageUrl: 'data:image/svg+xml,one',
          mimeType: 'image/svg+xml',
          conceptIndex: 0,
          conceptLabel: 'Concept 1',
          imageIndex: 0,
          imageLabel: 'Image 1',
        },
        {
          id: 'image-2',
          imageUrl: 'data:image/svg+xml,two',
          mimeType: 'image/svg+xml',
          conceptIndex: 0,
          conceptLabel: 'Concept 1',
          imageIndex: 1,
          imageLabel: 'Image 2',
        },
      ],
      generatedRoom: createRoom(),
      generatedLayout: createGeneratedLayout(createRoom()),
      generatedRoomFileName: 'generated-room.json',
      updatedAtIso: '2026-05-26T01:00:00.000Z',
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    vi.clearAllMocks();
  });

  it('restores the saved session images and instructions without triggering a new generation call', async () => {
    await act(async () => {
      root.render(<SimpleGenerateSmartKitchenScreen projectId="project-a" />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const textarea = container.querySelector<HTMLTextAreaElement>('#smart-kitchen-instructions');

    expect(loadWorkspaceSessionMock).toHaveBeenCalledWith('project-a');
    expect(generateSmartKitchenImagesMock).not.toHaveBeenCalled();
    expect(textarea?.value).toBe('Keep the oak cabinets and open shelving.');
    expect(container.textContent).toContain('History');
    expect(container.textContent).toContain('restored from your last workspace session');
    expect(container.textContent).toContain('Generated Design / Project Data');
    expect(container.querySelectorAll('img')).toHaveLength(2);
  });

  it('does not auto-regenerate when a saved session is missing', async () => {
    loadWorkspaceSessionMock.mockResolvedValueOnce(null);

    await act(async () => {
      root.render(<SimpleGenerateSmartKitchenScreen projectId="project-a" />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadWorkspaceSessionMock).toHaveBeenCalledWith('project-a');
    expect(generateSmartKitchenImagesMock).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('Generation Complete!');
    expect(container.textContent).toContain('Current Floor Plan / Project Data');
    expect(container.textContent).toContain('Download Attached File');
    expect(container.textContent).not.toContain('Project file • 0 B');
  });

  it('preserves the original attached file when a saved session is missing generated layout data', async () => {
    loadWorkspaceSessionMock.mockResolvedValueOnce({
      projectId: 'project-a',
      instructions: 'Keep the oak cabinets and open shelving.',
      generatedImages: [],
      generatedRoom: null,
      generatedLayout: null,
      generatedRoomFileName: null,
      updatedAtIso: '2026-05-26T01:00:00.000Z',
    });

    await act(async () => {
      root.render(<SimpleGenerateSmartKitchenScreen projectId="project-a" />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadWorkspaceSessionMock).toHaveBeenCalledWith('project-a');
    expect(generateSmartKitchenImagesMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Current Floor Plan / Project Data');
    expect(container.textContent).toContain('Download Attached File');
    expect(container.textContent).not.toContain('Project file • 0 B');
  });

  it('shows a non-blocking message when Exit Workspace is clicked before any AI room exists', async () => {
    loadWorkspaceSessionMock.mockResolvedValueOnce(null);

    await act(async () => {
      root.render(<SimpleGenerateSmartKitchenScreen projectId="project-a" />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const exitButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Exit Workspace'),
    );

    expect(exitButton).toBeDefined();

    await act(async () => {
      exitButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(routerReplaceMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain(
      'Generate images first to create an AI kitchen plan that can be loaded in the editor.',
    );
  });
});
