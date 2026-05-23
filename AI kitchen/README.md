# Generate Smart Kitchen - Polished Simple Workspace UI

This package updates the Generate Smart Kitchen workspace to match the simplified UI mockup provided by the user.

## What changed

The previous placeholder workspace screen has been replaced with a polished single-screen interface:

- Dark navy AI Kitchen Pro sidebar
- Top bar with `Back to Editor`, centered `Generate Smart Kitchen`, and `Exit Workspace`
- Centered white card titled `Generate Smart Kitchen Images`
- Attached file row for `Current Floor Plan / Project Data`
- Instruction textarea with a `0 / 1000` character counter
- Large teal `Generate Images` button

The UI intentionally does not implement OpenAI image generation yet. This step focuses on matching the requested interface and keeping the workspace simple.

## Main files changed

- `src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx`
- `src/features/generate-smart-kitchen/index.ts`
- `src/features/generate-smart-kitchen/__tests__/simpleGenerateSmartKitchenScreen.test.tsx`
- `src/features/generate-smart-kitchen/__tests__/routePage.test.tsx`
- `artifacts/generate-smart-kitchen/step-9-handoff.md`
- `artifacts/generate-smart-kitchen/step-9-report.md`

## Route behavior

The existing route remains:

```txt
app/generate-smart-kitchen/[projectId]/page.tsx
```

It renders:

```txt
SimpleGenerateSmartKitchenScreen
```

The screen keeps the route `projectId` available as a root data attribute for route-level state and tests.

## Tests run

```txt
npx tsc --strict --jsx react-jsx --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck app/generate-smart-kitchen/[projectId]/page.tsx src/features/generate-smart-kitchen/screens/SimpleGenerateSmartKitchenScreen.tsx src/features/generate-smart-kitchen/__tests__/simpleGenerateSmartKitchenScreen.test.tsx src/features/generate-smart-kitchen/__tests__/routePage.test.tsx

npx vitest run src/features/generate-smart-kitchen/__tests__/simpleGenerateSmartKitchenScreen.test.tsx src/features/generate-smart-kitchen/__tests__/routePage.test.tsx

npx vitest run src/features/generate-smart-kitchen/__tests__ components/src/features/cabinet-editor/__tests__/editorWorkspaceNavigation.test.ts
```

Results:

- TypeScript strict check passed.
- Targeted workspace tests passed: 2 files, 5 tests.
- Affected workspace/editor tests passed: 3 files, 8 tests.

## Next recommended step

Implement the actual image generation behavior later:

1. Build a typed prompt builder utility.
2. Add a server-side API route for OpenAI image generation.
3. Wire `Generate Images` to the API.
4. Show loading, error, and generated image result states.
5. Connect the attached file display to real editor/project data instead of the current visual placeholder.
