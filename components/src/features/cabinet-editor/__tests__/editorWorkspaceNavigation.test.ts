import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = dirname(fileURLToPath(import.meta.url));
const cabinetEditorRoot = join(testDir, '..');

function readEditorFile(relativePath: string): string {
  return readFileSync(join(cabinetEditorRoot, relativePath), 'utf8');
}

describe('Generate Smart Kitchen editor button migration', () => {
  it('keeps the TopBar button visible and exposes a workspace navigation callback', () => {
    const source = readEditorFile('components/layout/TopBar.tsx');

    expect(source).toContain('onOpenSmartKitchenWorkspace');
    expect(source).toContain('Generate smart kitchen');
    expect(source).not.toContain('pelican-ai-generate-smart-kitchen-request');
  });

  it('wires CabinetEditorBase to the workspace route instead of dispatching the old generation event', () => {
    const source = readEditorFile('CabinetEditorBase.tsx');

    expect(source).toContain('getGenerateSmartKitchenWorkspacePath');
    expect(source).toContain('/generate-smart-kitchen/');
    expect(source).toContain('onOpenSmartKitchenWorkspace={handleOpenSmartKitchenWorkspace}');
    expect(source).not.toContain('new Event("pelican-ai-generate-smart-kitchen-request")');
    expect(source).not.toContain('pelican-ai-smart-kitchen-status');
  });

  it('removes the CanvasArea immediate generation event handler and backend generation call', () => {
    const source = readEditorFile('components/canvas/CanvasArea.tsx');

    expect(source).toContain('immediate editor-side smart kitchen generation was removed');
    expect(source).not.toContain('handleGenerateSmartKitchenRequest');
    expect(source).not.toContain('pelican-ai-generate-smart-kitchen-request');
    expect(source).not.toContain('/api/smart-kitchen');
    expect(source).toContain('pelican-smart-kitchen-editor-room-export.json');
  });
});
