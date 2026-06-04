import type { AiRoomInput, GeneratedKitchenLayout } from '../../../../lib/ai/types';
import type { GeneratedSmartKitchenImage } from './generateSmartKitchenImages';

export const SMART_KITCHEN_WORKSPACE_DRAFT_PROJECT_ID = 'editor-draft' as const;

const SMART_KITCHEN_WORKSPACE_DRAFT_STORAGE_PREFIX = 'pelican-smart-kitchen-workspace-draft';
const SMART_KITCHEN_EDITOR_RETURN_DRAFT_STORAGE_PREFIX = 'pelican-smart-kitchen-editor-return';
const SMART_KITCHEN_WORKSPACE_SESSION_STORAGE_PREFIX = 'pelican-smart-kitchen-workspace-session';
const SMART_KITCHEN_WORKSPACE_DB_NAME = 'pelican-smart-kitchen';
// Bump the database version when the session store schema changes so existing browsers
// receive the missing object store through IndexedDB upgrade.
const SMART_KITCHEN_WORKSPACE_DB_VERSION = 2;
const SMART_KITCHEN_WORKSPACE_SESSION_STORE_NAME = 'workspace-sessions';

export interface SmartKitchenWorkspaceDraftAttachment {
  readonly fileName: string;
  readonly room: AiRoomInput;
  readonly exportedAtIso: string;
}

export interface SmartKitchenWorkspaceDraft {
  readonly projectId: string;
  readonly attachment: SmartKitchenWorkspaceDraftAttachment;
}

export interface SmartKitchenEditorReturnDraft {
  readonly projectId: string;
  readonly room: AiRoomInput;
  readonly generatedLayout?: GeneratedKitchenLayout | null;
  readonly generatedRoomFileName?: string | null;
  readonly exportedAtIso: string;
}

export interface SmartKitchenWorkspaceSession {
  readonly projectId: string;
  readonly instructions: string;
  readonly generationId?: string | null;
  readonly generatedImages: readonly GeneratedSmartKitchenImage[];
  readonly generatedRoom?: AiRoomInput | null;
  readonly generatedLayout?: GeneratedKitchenLayout | null;
  readonly generatedRoomFileName?: string | null;
  readonly updatedAtIso: string;
}

function getStorageKey(projectId?: string | null): string {
  const normalizedProjectId =
    typeof projectId === 'string' && projectId.trim().length > 0
      ? projectId.trim()
      : SMART_KITCHEN_WORKSPACE_DRAFT_PROJECT_ID;
  return `${SMART_KITCHEN_WORKSPACE_DRAFT_STORAGE_PREFIX}:${normalizedProjectId}`;
}

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getEditorReturnDraftStorageKey(projectId: string): string {
  const normalizedProjectId =
    typeof projectId === 'string' && projectId.trim().length > 0
      ? projectId.trim()
      : SMART_KITCHEN_WORKSPACE_DRAFT_PROJECT_ID;
  return `${SMART_KITCHEN_EDITOR_RETURN_DRAFT_STORAGE_PREFIX}:${normalizedProjectId}`;
}

function getWorkspaceSessionStorageKey(projectId: string): string {
  const normalizedProjectId =
    typeof projectId === 'string' && projectId.trim().length > 0
      ? projectId.trim()
      : SMART_KITCHEN_WORKSPACE_DRAFT_PROJECT_ID;
  return `${SMART_KITCHEN_WORKSPACE_SESSION_STORAGE_PREFIX}:${normalizedProjectId}`;
}

function hasIndexedDb(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error ?? new Error('IndexedDB request failed.')));
  });
}

function openWorkspaceDatabase(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(SMART_KITCHEN_WORKSPACE_DB_NAME, SMART_KITCHEN_WORKSPACE_DB_VERSION);

    request.addEventListener('upgradeneeded', () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SMART_KITCHEN_WORKSPACE_SESSION_STORE_NAME)) {
        database.createObjectStore(SMART_KITCHEN_WORKSPACE_SESSION_STORE_NAME);
      }
    });

    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error ?? new Error('Failed to open IndexedDB.')));
  });
}

function isGeneratedSmartKitchenImage(value: unknown): value is GeneratedSmartKitchenImage {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.imageUrl === 'string' &&
    typeof value.mimeType === 'string'
  );
}

function normalizeGeneratedSmartKitchenImage(value: unknown): GeneratedSmartKitchenImage | null {
  if (!isGeneratedSmartKitchenImage(value)) {
    return null;
  }

  return {
    id: value.id,
    generationId: typeof value.generationId === 'string' ? value.generationId : undefined,
    imageUrl: value.imageUrl,
    mimeType: value.mimeType,
    conceptIndex: typeof value.conceptIndex === 'number' ? value.conceptIndex : undefined,
    conceptLabel: typeof value.conceptLabel === 'string' ? value.conceptLabel : undefined,
    imageIndex: typeof value.imageIndex === 'number' ? value.imageIndex : undefined,
    imageLabel: typeof value.imageLabel === 'string' ? value.imageLabel : undefined,
  };
}

function normalizeSmartKitchenWorkspaceSession(value: unknown): SmartKitchenWorkspaceSession | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.projectId !== 'string' ||
    typeof value.instructions !== 'string' ||
    !Array.isArray(value.generatedImages) ||
    typeof value.updatedAtIso !== 'string'
  ) {
    return null;
  }

  const generatedImages = value.generatedImages
    .map((image) => normalizeGeneratedSmartKitchenImage(image))
    .filter((image): image is GeneratedSmartKitchenImage => image !== null);

  if (generatedImages.length !== value.generatedImages.length) {
    return null;
  }

  const generatedRoom =
    typeof value.generatedRoom === 'undefined' || value.generatedRoom === null
      ? value.generatedRoom
      : isRecord(value.generatedRoom)
        ? (value.generatedRoom as AiRoomInput)
        : null;

  const generatedLayout =
    typeof value.generatedLayout === 'undefined' || value.generatedLayout === null
      ? value.generatedLayout
      : isRecord(value.generatedLayout) && isRecord(value.generatedLayout.room)
        ? (value.generatedLayout as GeneratedKitchenLayout)
        : null;

  const generatedRoomFileName =
    typeof value.generatedRoomFileName === 'undefined' || value.generatedRoomFileName === null
      ? value.generatedRoomFileName
      : typeof value.generatedRoomFileName === 'string'
        ? value.generatedRoomFileName
        : null;
  const generationId =
    typeof value.generationId === 'undefined' || value.generationId === null
      ? value.generationId
      : typeof value.generationId === 'string'
        ? value.generationId
        : null;

  return {
    projectId: value.projectId,
    instructions: value.instructions,
    generationId,
    generatedImages,
    generatedRoom,
    generatedLayout,
    generatedRoomFileName,
    updatedAtIso: value.updatedAtIso,
  };
}

export function createSmartKitchenWorkspaceDraft(
  room: AiRoomInput,
  options: {
    readonly projectId?: string;
    readonly fileName?: string;
    readonly exportedAtIso?: string;
  } = {},
): SmartKitchenWorkspaceDraft {
  return {
    projectId: options.projectId?.trim() || SMART_KITCHEN_WORKSPACE_DRAFT_PROJECT_ID,
    attachment: {
      fileName: options.fileName?.trim() || 'pelican-smart-kitchen-editor-room-export.json',
      room,
      exportedAtIso: options.exportedAtIso ?? new Date().toISOString(),
    },
  };
}

export function saveSmartKitchenWorkspaceDraft(draft: SmartKitchenWorkspaceDraft): void {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  storage.setItem(getStorageKey(draft.projectId), JSON.stringify(draft));
}

export function loadSmartKitchenWorkspaceDraft(projectId?: string | null): SmartKitchenWorkspaceDraft | null {
  const storage = getBrowserStorage();

  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(getStorageKey(projectId));

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<SmartKitchenWorkspaceDraft>;
    if (
      typeof parsed.projectId !== 'string' ||
      !parsed.attachment ||
      typeof parsed.attachment.fileName !== 'string' ||
      typeof parsed.attachment.exportedAtIso !== 'string' ||
      !parsed.attachment.room ||
      typeof parsed.attachment.room !== 'object'
    ) {
      return null;
    }

    return parsed as SmartKitchenWorkspaceDraft;
  } catch {
    return null;
  }
}

export function clearSmartKitchenWorkspaceDraft(projectId: string): void {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(getStorageKey(projectId));
}

export function saveSmartKitchenEditorReturnDraft(draft: SmartKitchenEditorReturnDraft): void {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  storage.setItem(getEditorReturnDraftStorageKey(draft.projectId), JSON.stringify(draft));
}

export function loadSmartKitchenEditorReturnDraft(
  projectId: string,
): SmartKitchenEditorReturnDraft | null {
  const storage = getBrowserStorage();

  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(getEditorReturnDraftStorageKey(projectId));

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<SmartKitchenEditorReturnDraft> & {
      readonly room?: unknown;
      readonly generatedLayout?: unknown;
      readonly generatedRoomFileName?: unknown;
    };

    if (
      typeof parsed.projectId !== 'string' ||
      !isRecord(parsed.room) ||
      typeof parsed.exportedAtIso !== 'string'
    ) {
      return null;
    }

    const normalizedGeneratedLayout =
      parsed.generatedLayout === null || typeof parsed.generatedLayout === 'undefined'
        ? parsed.generatedLayout
        : isRecord(parsed.generatedLayout) && isRecord(parsed.generatedLayout.room)
          ? (parsed.generatedLayout as GeneratedKitchenLayout)
          : null;

    const normalizedGeneratedRoomFileName =
      parsed.generatedRoomFileName === null || typeof parsed.generatedRoomFileName === 'undefined'
        ? parsed.generatedRoomFileName
        : typeof parsed.generatedRoomFileName === 'string'
          ? parsed.generatedRoomFileName
          : null;

    return {
      projectId: parsed.projectId,
      room: parsed.room as AiRoomInput,
      generatedLayout: normalizedGeneratedLayout,
      generatedRoomFileName: normalizedGeneratedRoomFileName,
      exportedAtIso: parsed.exportedAtIso,
    };
  } catch {
    return null;
  }
}

export function clearSmartKitchenEditorReturnDraft(projectId: string): void {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(getEditorReturnDraftStorageKey(projectId));
}

export async function saveSmartKitchenWorkspaceSession(session: SmartKitchenWorkspaceSession): Promise<void> {
  const database = await openWorkspaceDatabase();

  if (!database) {
    return;
  }

  try {
    const transaction = database.transaction(SMART_KITCHEN_WORKSPACE_SESSION_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SMART_KITCHEN_WORKSPACE_SESSION_STORE_NAME);
    store.put(session, getWorkspaceSessionStorageKey(session.projectId));
    await new Promise<void>((resolve, reject) => {
      transaction.addEventListener('complete', () => resolve());
      transaction.addEventListener('error', () => reject(transaction.error ?? new Error('Failed to save workspace session.')));
      transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('Workspace session save aborted.')));
    });
  } finally {
    database.close();
  }
}

export async function loadSmartKitchenWorkspaceSession(
  projectId: string,
): Promise<SmartKitchenWorkspaceSession | null> {
  const database = await openWorkspaceDatabase();

  if (!database) {
    return null;
  }

  try {
    const transaction = database.transaction(SMART_KITCHEN_WORKSPACE_SESSION_STORE_NAME, 'readonly');
    const store = transaction.objectStore(SMART_KITCHEN_WORKSPACE_SESSION_STORE_NAME);
    const rawValue = await requestToPromise(store.get(getWorkspaceSessionStorageKey(projectId)));
    return normalizeSmartKitchenWorkspaceSession(rawValue);
  } catch {
    return null;
  } finally {
    database.close();
  }
}

export async function clearSmartKitchenWorkspaceSession(projectId: string): Promise<void> {
  const database = await openWorkspaceDatabase();

  if (!database) {
    return;
  }

  try {
    const transaction = database.transaction(SMART_KITCHEN_WORKSPACE_SESSION_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SMART_KITCHEN_WORKSPACE_SESSION_STORE_NAME);
    store.delete(getWorkspaceSessionStorageKey(projectId));
    await new Promise<void>((resolve, reject) => {
      transaction.addEventListener('complete', () => resolve());
      transaction.addEventListener('error', () => reject(transaction.error ?? new Error('Failed to clear workspace session.')));
      transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('Workspace session clear aborted.')));
    });
  } finally {
    database.close();
  }
}
