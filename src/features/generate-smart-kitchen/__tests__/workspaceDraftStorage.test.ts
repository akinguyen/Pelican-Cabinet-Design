import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiRoomInput, GeneratedKitchenLayout } from '../../../../../lib/ai/types';
import {
  clearSmartKitchenEditorReturnDraft,
  clearSmartKitchenWorkspaceSession,
  clearSmartKitchenWorkspaceDraft,
  createSmartKitchenWorkspaceDraft,
  loadSmartKitchenEditorReturnDraft,
  loadSmartKitchenWorkspaceSession,
  loadSmartKitchenWorkspaceDraft,
  saveSmartKitchenEditorReturnDraft,
  saveSmartKitchenWorkspaceSession,
  saveSmartKitchenWorkspaceDraft,
  SMART_KITCHEN_WORKSPACE_DRAFT_PROJECT_ID,
} from '../utils/workspaceDraftStorage';

function createRoom(): AiRoomInput {
  return {
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
      notes: ['Demo generated layout'],
      selectedWallIds: ['wall-1'],
      generationMethod: 'smart-ai',
      plannerModel: 'unit-test-model',
    },
    elevations: [],
  };
}

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

type IndexedDbRestore = (() => void) & {
  seedRawValue: (key: string, value: unknown) => void;
};

function installMockIndexedDb(): IndexedDbRestore {
  const originalIndexedDb = window.indexedDB;
  const store = new Map<string, unknown>();

  type Listener = () => void;

  class MockRequest<T> {
    public result!: T;
    public error: DOMException | null = null;
    private readonly listeners = new Map<string, Set<Listener>>();

    addEventListener(type: string, listener: Listener): void {
      const existingListeners = this.listeners.get(type) ?? new Set<Listener>();
      existingListeners.add(listener);
      this.listeners.set(type, existingListeners);
    }

    dispatch(type: string): void {
      for (const listener of this.listeners.get(type) ?? []) {
        listener();
      }
    }
  }

  class MockTransaction {
    private readonly listeners = new Map<string, Set<Listener>>();

    addEventListener(type: string, listener: Listener): void {
      const existingListeners = this.listeners.get(type) ?? new Set<Listener>();
      existingListeners.add(listener);
      this.listeners.set(type, existingListeners);
    }

    dispatch(type: string): void {
      for (const listener of this.listeners.get(type) ?? []) {
        listener();
      }
    }

    objectStore() {
      return {
        get: (key: IDBValidKey) => {
          const request = new MockRequest<unknown>();
          queueMicrotask(() => {
            request.result = store.get(String(key));
            request.dispatch('success');
          });
          return request as unknown as IDBRequest<unknown>;
        },
        put: (value: unknown, key: IDBValidKey) => {
          store.set(String(key), value);
          queueMicrotask(() => this.dispatch('complete'));
          return {} as IDBRequest<IDBValidKey>;
        },
        delete: (key: IDBValidKey) => {
          store.delete(String(key));
          queueMicrotask(() => this.dispatch('complete'));
          return {} as IDBRequest<void>;
        },
      } as IDBObjectStore;
    }
  }

  const database = {
    objectStoreNames: {
      contains: (name: string) => name === 'workspace-sessions',
    },
    createObjectStore: () => ({}) as IDBObjectStore,
    transaction: () => new MockTransaction() as unknown as IDBTransaction,
    close: () => undefined,
  } as unknown as IDBDatabase;

  const indexedDbMock = {
    open: () => {
      const request = new MockRequest<IDBDatabase>();
      queueMicrotask(() => {
        request.result = database;
        request.dispatch('upgradeneeded');
        request.dispatch('success');
      });
      return request as unknown as IDBOpenDBRequest;
    },
  } as unknown as IDBFactory;

  const restore = Object.assign(() => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: originalIndexedDb,
    });
  }, {
    seedRawValue: (key: string, value: unknown) => {
      store.set(key, value);
    },
  });

  Object.defineProperty(window, 'indexedDB', {
    configurable: true,
    value: indexedDbMock,
  });

  return restore;
}

describe('workspaceDraftStorage', () => {
  it('saves, loads, and clears the editor-to-workspace draft', () => {
    const draft = createSmartKitchenWorkspaceDraft(createRoom(), {
      projectId: 'project-a',
      fileName: 'project-a.json',
      exportedAtIso: '2026-05-26T00:00:00.000Z',
    });

    saveSmartKitchenWorkspaceDraft(draft);

    expect(loadSmartKitchenWorkspaceDraft('project-a')).toEqual(draft);

    clearSmartKitchenWorkspaceDraft('project-a');

    expect(loadSmartKitchenWorkspaceDraft('project-a')).toBeNull();
  });

  it('saves, loads, and clears the editor return draft', () => {
    const room = createRoom();
    const generatedLayout = createGeneratedLayout(room);

    saveSmartKitchenEditorReturnDraft({
      projectId: 'project-a',
      room,
      generatedLayout,
      generatedRoomFileName: 'generated-room.json',
      exportedAtIso: '2026-05-26T00:00:00.000Z',
    });

    expect(loadSmartKitchenEditorReturnDraft('project-a')).toEqual({
      projectId: 'project-a',
      room,
      generatedLayout,
      generatedRoomFileName: 'generated-room.json',
      exportedAtIso: '2026-05-26T00:00:00.000Z',
    });

    clearSmartKitchenEditorReturnDraft('project-a');

    expect(loadSmartKitchenEditorReturnDraft('project-a')).toBeNull();
  });

  it('returns null for invalid return-draft data', () => {
    window.localStorage.setItem(
      'pelican-smart-kitchen-editor-return:project-a',
      JSON.stringify({
        projectId: 'project-a',
        room: null,
        exportedAtIso: '2026-05-26T00:00:00.000Z',
      }),
    );

    expect(loadSmartKitchenEditorReturnDraft('project-a')).toBeNull();
  });

  it('returns null when the generated layout payload is malformed', () => {
    window.localStorage.setItem(
      'pelican-smart-kitchen-editor-return:project-a',
      JSON.stringify({
        projectId: 'project-a',
        room: createRoom(),
        generatedLayout: { room: null },
        exportedAtIso: '2026-05-26T00:00:00.000Z',
      }),
    );

    expect(loadSmartKitchenEditorReturnDraft('project-a')).toBeNull();
  });

  it('falls back to the default project id when the return draft project id is empty', () => {
    const room = createRoom();

    saveSmartKitchenEditorReturnDraft({
      projectId: '',
      room,
      exportedAtIso: '2026-05-26T00:00:00.000Z',
    });

    expect(
      loadSmartKitchenEditorReturnDraft(SMART_KITCHEN_WORKSPACE_DRAFT_PROJECT_ID),
    ).toEqual({
      projectId: '',
      room,
      generatedLayout: undefined,
      generatedRoomFileName: undefined,
      exportedAtIso: '2026-05-26T00:00:00.000Z',
    });
  });

  it('saves, loads, and clears the generated image session in indexeddb', async () => {
    const restoreIndexedDb = installMockIndexedDb();

    try {
      const room = createRoom();
      const generatedLayout = createGeneratedLayout(room);
      const generatedImages = [
        {
          id: 'image-1',
          generationId: 'batch-1',
          imageUrl: 'data:image/svg+xml,one',
          mimeType: 'image/svg+xml',
          conceptIndex: 0,
          conceptLabel: 'Concept 1',
          imageIndex: 0,
          imageLabel: 'Image 1',
        },
      ] as const;

      await saveSmartKitchenWorkspaceSession({
        projectId: 'project-a',
        instructions: 'Keep the layout balanced.',
        generationId: 'batch-1',
        generatedImages,
        generatedRoom: room,
        generatedLayout,
        generatedRoomFileName: 'generated-room.json',
        updatedAtIso: '2026-05-26T00:00:00.000Z',
      });

      await expect(loadSmartKitchenWorkspaceSession('project-a')).resolves.toEqual({
        projectId: 'project-a',
        instructions: 'Keep the layout balanced.',
        generationId: 'batch-1',
        generatedImages,
        generatedRoom: room,
        generatedLayout,
        generatedRoomFileName: 'generated-room.json',
        updatedAtIso: '2026-05-26T00:00:00.000Z',
      });

      await clearSmartKitchenWorkspaceSession('project-a');
      await expect(loadSmartKitchenWorkspaceSession('project-a')).resolves.toBeNull();
    } finally {
      restoreIndexedDb();
    }
  });

  it('overwrites the previously saved generated image session for the same project', async () => {
    const restoreIndexedDb = installMockIndexedDb();

    try {
      const room = createRoom();
      const firstLayout = createGeneratedLayout(room);
      const secondLayout = createGeneratedLayout(room);

      await saveSmartKitchenWorkspaceSession({
        projectId: 'project-a',
        instructions: 'First session',
        generatedImages: [
          {
            id: 'image-1',
            generationId: 'batch-1',
            imageUrl: 'data:image/svg+xml,first',
            mimeType: 'image/svg+xml',
          },
        ],
        generatedRoom: room,
        generatedLayout: firstLayout,
        generatedRoomFileName: 'first-room.json',
        updatedAtIso: '2026-05-26T00:00:00.000Z',
      });

      await saveSmartKitchenWorkspaceSession({
        projectId: 'project-a',
        instructions: 'Second session',
        generationId: 'batch-2',
        generatedImages: [
          {
            id: 'image-2',
            generationId: 'batch-2',
            imageUrl: 'data:image/svg+xml,second',
            mimeType: 'image/svg+xml',
          },
          {
            id: 'image-3',
            generationId: 'batch-2',
            imageUrl: 'data:image/svg+xml,third',
            mimeType: 'image/svg+xml',
          },
        ],
        generatedRoom: room,
        generatedLayout: secondLayout,
        generatedRoomFileName: 'second-room.json',
        updatedAtIso: '2026-05-26T01:00:00.000Z',
      });

      await expect(loadSmartKitchenWorkspaceSession('project-a')).resolves.toEqual({
        projectId: 'project-a',
        instructions: 'Second session',
        generationId: 'batch-2',
        generatedImages: [
          {
            id: 'image-2',
            generationId: 'batch-2',
            imageUrl: 'data:image/svg+xml,second',
            mimeType: 'image/svg+xml',
          },
          {
            id: 'image-3',
            generationId: 'batch-2',
            imageUrl: 'data:image/svg+xml,third',
            mimeType: 'image/svg+xml',
          },
        ],
        generatedRoom: room,
        generatedLayout: secondLayout,
        generatedRoomFileName: 'second-room.json',
        updatedAtIso: '2026-05-26T01:00:00.000Z',
      });
    } finally {
      restoreIndexedDb();
    }
  });

  it('returns null for corrupted session data', async () => {
    const restoreIndexedDb = installMockIndexedDb();

    try {
      restoreIndexedDb.seedRawValue('pelican-smart-kitchen-workspace-session:project-a', {
        projectId: 'project-a',
        instructions: '',
        generatedImages: [{ id: 'bad-image' }],
        updatedAtIso: '2026-05-26T00:00:00.000Z',
      });

      await expect(loadSmartKitchenWorkspaceSession('project-a')).resolves.toBeNull();
    } finally {
      restoreIndexedDb();
    }
  });
});
