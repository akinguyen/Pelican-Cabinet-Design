# Simplified Generate Smart Kitchen Handoff

## Files changed
- `app/generate-smart-kitchen/[projectId]/page.tsx`
- `src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx`
- `src/features/generate-smart-kitchen/index.ts`
- `src/features/generate-smart-kitchen/__tests__/routePage.test.tsx`
- `src/features/generate-smart-kitchen/__tests__/simpleGenerateSmartKitchenScreen.test.tsx`
- `artifacts/generate-smart-kitchen/simplify-discovery.md`
- `artifacts/generate-smart-kitchen/simplified-workspace-handoff.md`
- `artifacts/generate-smart-kitchen/simplified-workspace-report.md`

## Tests run
- `npx tsc --strict --jsx react-jsx --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck app/generate-smart-kitchen/[projectId]/page.tsx src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx src/features/generate-smart-kitchen/index.ts`
- `npx vitest run src/features/generate-smart-kitchen/__tests__/routePage.test.tsx src/features/generate-smart-kitchen/__tests__/simpleGenerateSmartKitchenScreen.test.tsx components/src/features/cabinet-editor/__tests__/editorWorkspaceNavigation.test.ts`

## What was completed
- Replaced the Generate Smart Kitchen route's multi-step workspace with a single placeholder screen.
- Added a new `SimpleGenerateSmartKitchenScreen` inside the feature folder.
- Removed the 7-step provider-controlled rendering from the route.
- Added route coverage for the simplified placeholder and negative assertions for the old workflow text.
- Added screen coverage for the placeholder content and the no-API-on-load behavior.

## What the next step should do
- Implement the real attached-file and salesman-instruction handling for the simplified workspace.
- Add the future Generate Images API and OpenAI logic behind the new simple interface.
- Keep the editor path stable and continue avoiding direct editor-side generation calls.
