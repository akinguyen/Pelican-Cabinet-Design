# Generate Smart Kitchen Step 1 Handoff

## Scope
Discovery only. No code behavior changes were made.

## Current Flow Map

### 1. What opens Generate Smart Kitchen from the editor?
- The editor uses [components/src/features/cabinet-editor/CabinetEditorBase.tsx](/home/vannguyen/project/Pelican-Cabinet-Design/components/src/features/cabinet-editor/CabinetEditorBase.tsx#L287) via `handleOpenSmartKitchenWorkspace()`.
- That handler dispatches `pelican-ai-store-smart-kitchen-workspace-draft-request`, then calls `openGenerateSmartKitchenWorkspace()`.
- `openGenerateSmartKitchenWorkspace()` builds the route with `getGenerateSmartKitchenWorkspacePath()` and navigates to `/generate-smart-kitchen/<projectId>` using `window.location.assign(...)` by default.

### 2. What stores the editor room before opening the workspace?
- The handoff uses [src/features/generate-smart-kitchen/utils/workspaceDraftStorage.ts](/home/vannguyen/project/Pelican-Cabinet-Design/src/features/generate-smart-kitchen/utils/workspaceDraftStorage.ts#L56).
- The editor listens for `pelican-ai-store-smart-kitchen-workspace-draft-request` in [components/src/features/cabinet-editor/components/canvas/CanvasArea.tsx](/home/vannguyen/project/Pelican-Cabinet-Design/components/src/features/cabinet-editor/components/canvas/CanvasArea.tsx#L281).
- That handler builds the export with `buildSmartKitchenRoomExport()`, then stores it with:
  - `createSmartKitchenWorkspaceDraft(...)`
  - `saveSmartKitchenWorkspaceDraft(...)`
- The current storage key format is:
  - `pelican-smart-kitchen-workspace-draft:<projectId>`
- The draft project ID fallback is:
  - `editor-draft`

### 3. What loads the attached room JSON on the workspace screen?
- [src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx](/home/vannguyen/project/Pelican-Cabinet-Design/src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx#L380) calls `loadSmartKitchenWorkspaceDraft(projectId)` on mount.
- The screen reads `draft?.attachment` and uses that as the attached file payload for generation and download.

### 4. What does `generateSmartKitchenImages` return today?
- The helper in [src/features/generate-smart-kitchen/utils/generateSmartKitchenImages.ts](/home/vannguyen/project/Pelican-Cabinet-Design/src/features/generate-smart-kitchen/utils/generateSmartKitchenImages.ts#L24) returns:
  - `projectId`
  - `attachedFileName`
  - `prompt?`
  - `systemPrompt?`
  - `generatedLayout?`
  - `generatedRoom?`
  - `generatedRoomFileName?`
  - `generationMode?`
  - `placeholderReason?`
  - `images`

### 5. Does the response include AI-generated JSON?
- Yes.
- The backend route returns both:
  - `generatedLayout`
  - `generatedRoom`
  - `generatedRoomFileName`
- See [app/api/generate-smart-kitchen-images/route.ts](/home/vannguyen/project/Pelican-Cabinet-Design/app/api/generate-smart-kitchen-images/route.ts#L240).

### 6. Where is the generated JSON currently discarded or ignored?
- In [src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx](/home/vannguyen/project/Pelican-Cabinet-Design/src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx#L547), `handleGenerateImages()` only keeps `result.images`.
- The screen currently ignores:
  - `result.generatedLayout`
  - `result.generatedRoom`
  - `result.generatedRoomFileName`
  - `result.generationMode`
  - `result.placeholderReason`
- So the AI-generated JSON is available from the API, but not persisted back to the editor yet.

### 7. What editor state/function loads a room JSON back into the main editor?
- In [components/src/features/cabinet-editor/CabinetEditorBase.tsx](/home/vannguyen/project/Pelican-Cabinet-Design/components/src/features/cabinet-editor/CabinetEditorBase.tsx#L68), the editor holds `loadedRoom` state.
- The import path is:
  - `handleImportedRoom()` reads JSON from a file and calls `setLoadedRoom(nextRoom)`.
- That `loadedRoom` is passed to [components/src/features/cabinet-editor/components/canvas/CanvasArea.tsx](/home/vannguyen/project/Pelican-Cabinet-Design/components/src/features/cabinet-editor/CabinetEditorBase.tsx#L468).
- The canvas then applies it in an effect:
  - it copies `loadedRoom.walls`, `loadedRoom.windows`, `loadedRoom.doors` into the editor state
  - it clears placements and selection state

### 8. What route should the workspace return to?
- The editor home route is [app/page.tsx](/home/vannguyen/project/Pelican-Cabinet-Design/app/page.tsx), which renders `CabinetEditorBase`.
- So the likely return target is `/`.
- If the workspace exit flow wants to preserve the generated room, it should return to `/` after persisting or dispatching the generated room JSON into the editor-import path.

## Recommended Integration Points

### Generated room storage
- Persist `generatedRoom` or `generatedLayout.room` when generation completes.
- Reuse the existing draft or import mechanism instead of inventing a second storage format.

### Workspace exit handler
- Add an `Exit Workspace` action in the workspace to:
  - save the generated room JSON
  - navigate back to `/`

### Editor return-draft loader
- On editor load, accept a generated-room draft or generated-room event and assign it to `loadedRoom`.
- `CanvasArea` already knows how to load a room via its `loadedRoom` prop.

### Optional image session restore
- If image results should persist after returning to the editor, store the generated image list separately from the generated room JSON.
- The screen currently treats images as in-memory state only.

