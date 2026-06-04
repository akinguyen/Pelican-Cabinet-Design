# Generate Smart Kitchen Step 1 Report

## Implementation Summary
No runtime code was changed in this step. I inspected the current editor, workspace, storage, and API flow to map where the generated room JSON should be captured and restored.

## Answers to the Requested Questions

1. **What function opens the Generate Smart Kitchen screen from the editor?**
   - `handleOpenSmartKitchenWorkspace()` in [components/src/features/cabinet-editor/CabinetEditorBase.tsx](/home/vannguyen/project/Pelican-Cabinet-Design/components/src/features/cabinet-editor/CabinetEditorBase.tsx#L287).
   - It first triggers the workspace draft store event, then calls `openGenerateSmartKitchenWorkspace()`.

2. **What local/session storage key or utility stores the editor room before opening the smart kitchen screen?**
   - The utility is [src/features/generate-smart-kitchen/utils/workspaceDraftStorage.ts](/home/vannguyen/project/Pelican-Cabinet-Design/src/features/generate-smart-kitchen/utils/workspaceDraftStorage.ts#L56).
   - Storage key pattern: `pelican-smart-kitchen-workspace-draft:<projectId>`.
   - Default project ID fallback: `editor-draft`.

3. **What function loads the attached room JSON on the smart kitchen screen?**
   - `loadSmartKitchenWorkspaceDraft(projectId)` in [src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx](/home/vannguyen/project/Pelican-Cabinet-Design/src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx#L380).

4. **What exact response shape comes back from `generateSmartKitchenImages`?**
   - The helper returns:
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
   - See [src/features/generate-smart-kitchen/utils/generateSmartKitchenImages.ts](/home/vannguyen/project/Pelican-Cabinet-Design/src/features/generate-smart-kitchen/utils/generateSmartKitchenImages.ts#L24).

5. **Does the response include `generatedRoom`, `generatedLayout`, or equivalent AI-generated JSON?**
   - Yes.
   - The API route returns both `generatedLayout` and `generatedRoom`.
   - See [app/api/generate-smart-kitchen-images/route.ts](/home/vannguyen/project/Pelican-Cabinet-Design/app/api/generate-smart-kitchen-images/route.ts#L240).

6. **Where is this generated JSON currently discarded or ignored?**
   - In [src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx](/home/vannguyen/project/Pelican-Cabinet-Design/src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx#L547), the result handler keeps only `result.images`.
   - `generatedLayout`, `generatedRoom`, and `generatedRoomFileName` are not currently stored back into the editor flow from the workspace screen.

7. **What editor state/function is used to load/import a room JSON back into the main editor?**
   - `loadedRoom` state in [components/src/features/cabinet-editor/CabinetEditorBase.tsx](/home/vannguyen/project/Pelican-Cabinet-Design/components/src/features/cabinet-editor/CabinetEditorBase.tsx#L68).
   - `handleImportedRoom()` calls `setLoadedRoom(nextRoom)`.
   - `CanvasArea` consumes `loadedRoom` and applies it to the editor scene.

8. **What route should the smart kitchen screen navigate to when returning to the editor?**
   - `/`
   - The home route [app/page.tsx](/home/vannguyen/project/Pelican-Cabinet-Design/app/page.tsx) renders `CabinetEditorBase`.

## Findings
- The editor already has a working room import path through `loadedRoom`.
- The workspace already receives both the original attached room JSON and the AI-generated JSON, but the generated JSON is not passed back to the editor yet.
- The current Generate Smart Kitchen workspace only persists the original attachment draft, not the generated output.

## Recommended Integration Points
- Persist the generated room JSON from the workspace after generation completes.
- Add a workspace exit handler that returns to `/` after storing the generated room JSON.
- Reuse the existing `loadedRoom` path in the editor to load the generated room JSON.
- If needed, store the generated images separately so they remain visible after exiting and re-entering the workspace.

## Files Reviewed
- [components/src/features/cabinet-editor/CabinetEditorBase.tsx](/home/vannguyen/project/Pelican-Cabinet-Design/components/src/features/cabinet-editor/CabinetEditorBase.tsx)
- [components/src/features/cabinet-editor/components/layout/TopBar.tsx](/home/vannguyen/project/Pelican-Cabinet-Design/components/src/features/cabinet-editor/components/layout/TopBar.tsx)
- [app/generate-smart-kitchen/[projectId]/page.tsx](/home/vannguyen/project/Pelican-Cabinet-Design/app/generate-smart-kitchen/%5BprojectId%5D/page.tsx)
- [src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx](/home/vannguyen/project/Pelican-Cabinet-Design/src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx)
- [src/features/generate-smart-kitchen/utils/workspaceDraftStorage.ts](/home/vannguyen/project/Pelican-Cabinet-Design/src/features/generate-smart-kitchen/utils/workspaceDraftStorage.ts)
- [src/features/generate-smart-kitchen/utils/generateSmartKitchenImages.ts](/home/vannguyen/project/Pelican-Cabinet-Design/src/features/generate-smart-kitchen/utils/generateSmartKitchenImages.ts)
- [app/api/generate-smart-kitchen-images/route.ts](/home/vannguyen/project/Pelican-Cabinet-Design/app/api/generate-smart-kitchen-images/route.ts)
- [app/api/smart-kitchen/route.ts](/home/vannguyen/project/Pelican-Cabinet-Design/app/api/smart-kitchen/route.ts)

## Notes
- No tests were run in this step.
- No code was changed.

