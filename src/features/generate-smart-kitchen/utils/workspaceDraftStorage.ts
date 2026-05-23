import type { AiRoomInput } from '../../../../lib/ai/types';

export const SMART_KITCHEN_WORKSPACE_DRAFT_PROJECT_ID = 'editor-draft' as const;

const SMART_KITCHEN_WORKSPACE_DRAFT_STORAGE_PREFIX = 'pelican-smart-kitchen-workspace-draft';

export interface SmartKitchenWorkspaceDraftAttachment {
  readonly fileName: string;
  readonly room: AiRoomInput;
  readonly exportedAtIso: string;
}

export interface SmartKitchenWorkspaceDraft {
  readonly projectId: string;
  readonly attachment: SmartKitchenWorkspaceDraftAttachment;
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
