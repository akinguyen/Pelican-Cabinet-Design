# Generate Smart Kitchen Simplify Discovery

## Current route entry point
- `app/generate-smart-kitchen/[projectId]/page.tsx`
- The route now accepts `projectId` and renders the simplified placeholder screen from `src/features/generate-smart-kitchen/`.

## Current editor button path
- `components/src/features/cabinet-editor/components/layout/TopBar.tsx`
- `components/src/features/cabinet-editor/CabinetEditorBase.tsx`
- The editor button is already routed to the workspace path helper and no longer dispatches the old immediate-generation event.
- The editor path does not call `/api/smart-kitchen` in the active code path.

## Current workspace screens discovered
- Before simplification, the route was wired through the provider/state flow and could render:
  - `ReviewConfirmScreen`
  - `GenerateDesignsScreen`
  - `KitchenStudioScreen`
  - `CompareChooseScreen`
  - `EstimateReviewScreen`
  - `PresentationScreen`
  - `FinalReviewExportScreen`
- Those screens still exist in the feature folder, but the route no longer renders them.

## Old direct-generation paths found
- Active editor code no longer uses the old generation event or `/api/smart-kitchen`.
- Legacy snapshots still contain the historical direct-generation code:
  - `components/src/features/cabinet-editor/_legacy/CabinetEditorBase.original.tsx`
- Current migration tests already assert the old event and direct API path are absent from the active editor source.

## Files safe to simplify now
- `app/generate-smart-kitchen/[projectId]/page.tsx`
- `src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx`
- `src/features/generate-smart-kitchen/__tests__/routePage.test.tsx`
- `src/features/generate-smart-kitchen/__tests__/simpleGenerateSmartKitchenScreen.test.tsx`
- `src/features/generate-smart-kitchen/index.ts`

## Files that should not be touched yet
- `components/src/features/cabinet-editor/components/layout/TopBar.tsx`
- `components/src/features/cabinet-editor/CabinetEditorBase.tsx`
- `components/src/features/cabinet-editor/components/canvas/CanvasArea.tsx`
- `components/src/features/cabinet-editor/__tests__/editorWorkspaceNavigation.test.ts`
- Existing legacy workspace screens under `src/features/generate-smart-kitchen/screens/`

## Simplification goal
- Replace the old 7-step workspace UI with a single placeholder screen that shows:
  - page title
  - attached file placeholder
  - instruction textarea placeholder
  - disabled `Generate Images` button
- Do not add OpenAI or image-generation behavior yet.
