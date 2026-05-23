# Generate Smart Kitchen Image Generation Report

## Implementation summary
- Clicking `Generate Smart Kitchen` in the editor now triggers an automatic room export and navigates only after the draft is stored.
- The exported room JSON is stored under the `editor-draft` workspace key and is loaded by the simplified workspace screen.
- The workspace screen now behaves as the intended first image-generation step:
  - shows the attached JSON file
  - accepts extra salesman instructions
  - submits both to a new OpenAI-backed API route
  - renders up to five returned images
- The new backend prompt combines a fixed system prompt, the attached room JSON, and the user instruction text.

## Files changed
- `app/generate-smart-kitchen/[projectId]/page.tsx`
- `app/api/generate-smart-kitchen-images/route.ts`
- `components/src/features/cabinet-editor/CabinetEditorBase.tsx`
- `components/src/features/cabinet-editor/components/canvas/CanvasArea.tsx`
- `src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx`
- `src/features/generate-smart-kitchen/index.ts`
- `src/features/generate-smart-kitchen/utils/workspaceDraftStorage.ts`
- `src/features/generate-smart-kitchen/utils/smartKitchenImagePrompt.ts`
- `src/features/generate-smart-kitchen/__tests__/routePage.test.tsx`
- `src/features/generate-smart-kitchen/__tests__/simpleGenerateSmartKitchenScreen.test.tsx`
- `src/features/generate-smart-kitchen/__tests__/smartKitchenImagePrompt.test.ts`

## Tests run
- Passed:
  - `npx tsc --strict --jsx react-jsx --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck app/generate-smart-kitchen/[projectId]/page.tsx app/api/generate-smart-kitchen-images/route.ts src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx src/features/generate-smart-kitchen/utils/workspaceDraftStorage.ts src/features/generate-smart-kitchen/utils/smartKitchenImagePrompt.ts src/features/generate-smart-kitchen/index.ts`
- Not run successfully in this environment:
  - Vitest-based workspace and editor tests, because `npx` attempted to download `vitest` and hit `EAI_AGAIN`.

## Limitations
- The handoff currently uses `localStorage`, so the attachment survives browser refreshes on the same browser/profile.
- The old 7-step Generate Smart Kitchen screens still exist in the repo, but the route no longer renders them.
- The API route currently uses the OpenAI Images endpoint directly and assumes `OPENAI_API_KEY` is present.

## Warnings
- If the editor has no wall data, the workspace handoff is blocked and the route will not open.
- If OpenAI returns no image payload or an error, the screen shows the error message from the API.

## TODOs
- Persist the room export in a backend record if cross-device or account-level persistence is required.
- Add image selection / save / regenerate actions if the product needs versioning.
- Add stronger validation or moderation if the instruction text needs guardrails.
