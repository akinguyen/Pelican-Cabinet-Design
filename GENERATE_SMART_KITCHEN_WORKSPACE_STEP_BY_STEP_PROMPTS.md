# Generate Smart Kitchen Workspace

Use this file as a step-by-step prompt pack for an AI coding assistant.

How to use:
- Run one step at a time.
- Do not ask the AI to do more than the current step.
- Each step must include code changes, tests, a short handoff summary, and a structured report.
- The goal is to replace the current in-editor Generate Smart Kitchen behavior with a new workspace flow.
- The old immediate generation behavior should be removed only when the step says to remove it.

Global rules for every step:
- Use strict TypeScript.
- Do not use `any` unless there is no safe alternative.
- Keep the new workspace inside `src/features/generate-smart-kitchen/`.
- Keep the current editor stable until the step explicitly changes it.
- Update or add tests for any behavior you change.
- Run the relevant tests before finishing the step.
- At the end of each step, create:
  - a small handoff file named `artifacts/generate-smart-kitchen/step-N-handoff.md`
  - a structured report named `artifacts/generate-smart-kitchen/step-N-report.md`

The handoff file should include:
  - files changed
  - tests run
  - what was completed
  - what the next step should do

The report file should include:
  - step number
  - files changed
  - tests run
  - summary of the implementation
  - any limitations, warnings, or TODOs

Global system prompt to paste before each step:

```txt
You are coding inside a React / Next.js / TypeScript kitchen design app.

Implement only the current step of the Generate Smart Kitchen workspace migration.

Hard rules:
- Do not work on future steps.
- Do not change unrelated editor behavior.
- Keep the implementation small and testable.
- Use the existing project styling approach.
- Add or update tests for every behavior change.
- Finish by writing a short handoff file at artifacts/generate-smart-kitchen/step-N-handoff.md.
- Finish by writing a structured report at artifacts/generate-smart-kitchen/step-N-report.md.

The goal is to replace the current Generate Smart Kitchen behavior with a new workspace flow.
```

## Step 1 Prompt

```txt
Implement Step 1 of the Generate Smart Kitchen migration.

Goal:
- Add the new workspace feature foundation without wiring it into the editor yet.

Files to create:
- src/features/generate-smart-kitchen/types.ts
- src/features/generate-smart-kitchen/constants.ts
- src/features/generate-smart-kitchen/mockData.ts
- src/features/generate-smart-kitchen/index.ts

Requirements:
- Define the data model for the 7-step workspace.
- Add workflow constants.
- Add deterministic mock data for projects, review data, designs, estimates, and handoff data.
- Export the public API from index.ts.
- Keep everything UI-independent.

Tests:
- Add tests for types compile coverage if practical.
- Add tests for constants.
- Add tests for mock data.

Finish with:
- A short handoff file at artifacts/generate-smart-kitchen/step-1-handoff.md
- A structured report at artifacts/generate-smart-kitchen/step-1-report.md
- A list of files changed
- The tests you ran
```

## Step 2 Prompt

```txt
Implement Step 2 of the Generate Smart Kitchen migration.

Goal:
- Add the fake API layer and reducer/provider state management.

Files to create:
- src/features/generate-smart-kitchen/api/smartKitchenApi.ts
- src/features/generate-smart-kitchen/state/smartKitchenReducer.ts
- src/features/generate-smart-kitchen/state/SmartKitchenFlowProvider.tsx

Requirements:
- Build a fake in-memory API first.
- Add a pure reducer for flow state.
- Add a React provider and hook that use the reducer and API.
- Keep API calls out of UI components.
- Do not wire the editor button yet.

Tests:
- Add tests for the fake API.
- Add tests for the reducer.
- Add provider tests if practical, or cover it in an integration test later.

Finish with:
- A short handoff file at artifacts/generate-smart-kitchen/step-2-handoff.md
- A structured report at artifacts/generate-smart-kitchen/step-2-report.md
- A list of files changed
- The tests you ran
```

## Step 3 Prompt

```txt
Implement Step 3 of the Generate Smart Kitchen migration.

Goal:
- Add the reusable UI foundation for the workspace.

Files to create:
- src/features/generate-smart-kitchen/components/shared/SectionCard.tsx
- src/features/generate-smart-kitchen/components/shared/StatusBadge.tsx
- src/features/generate-smart-kitchen/components/shared/PrimaryButton.tsx
- src/features/generate-smart-kitchen/components/shared/KitchenImageCard.tsx
- src/features/generate-smart-kitchen/components/layout/SmartKitchenFlowShell.tsx
- src/features/generate-smart-kitchen/components/layout/SmartKitchenStepSidebar.tsx
- src/features/generate-smart-kitchen/components/layout/SmartKitchenTopBar.tsx

Requirements:
- Build reusable shared components.
- Build the workspace shell, sidebar, and top bar.
- Keep the visual language consistent with the current app.
- Do not add screen-specific business logic yet.

Tests:
- Add component tests for the shared UI.
- Add component tests for the layout shell, sidebar, and top bar.

Finish with:
- A short handoff file at artifacts/generate-smart-kitchen/step-3-handoff.md
- A structured report at artifacts/generate-smart-kitchen/step-3-report.md
- A list of files changed
- The tests you ran
```

## Step 4 Prompt

```txt
Implement Step 4 of the Generate Smart Kitchen migration.

Goal:
- Add the route entry and the first two workspace screens.

Files to create:
- app/generate-smart-kitchen/[projectId]/page.tsx
- src/features/generate-smart-kitchen/utils/editorToSmartKitchenData.ts
- src/features/generate-smart-kitchen/screens/ReviewConfirmScreen.tsx
- src/features/generate-smart-kitchen/screens/GenerateDesignsScreen.tsx

Requirements:
- Read projectId from the route.
- Load workspace state through the provider.
- Render Review & Confirm first.
- Render the generation progress screen second.
- Do not start generation on route load.
- Use the new workspace shell.

Tests:
- Add route/page tests.
- Add screen tests for ReviewConfirmScreen.
- Add screen tests for GenerateDesignsScreen.

Finish with:
- A short handoff file at artifacts/generate-smart-kitchen/step-4-handoff.md
- A structured report at artifacts/generate-smart-kitchen/step-4-report.md
- A list of files changed
- The tests you ran
```

## Step 5 Prompt

```txt
Implement Step 5 of the Generate Smart Kitchen migration.

Goal:
- Add the main design browsing and comparison screens.

Files to create:
- src/features/generate-smart-kitchen/utils/smartKitchenCalculations.ts
- src/features/generate-smart-kitchen/screens/KitchenStudioScreen.tsx
- src/features/generate-smart-kitchen/screens/CompareChooseScreen.tsx

Requirements:
- Show 10 generated designs in the studio.
- Allow switching the active design.
- Allow marking a customer favorite.
- Allow selecting 2 to 3 designs for comparison.
- Keep all calculations in utility functions.

Tests:
- Add tests for the calculation utility.
- Add tests for KitchenStudioScreen.
- Add tests for CompareChooseScreen.

Finish with:
- A short handoff file at artifacts/generate-smart-kitchen/step-5-handoff.md
- A structured report at artifacts/generate-smart-kitchen/step-5-report.md
- A list of files changed
- The tests you ran
```

## Step 6 Prompt

```txt
Implement Step 6 of the Generate Smart Kitchen migration.

Goal:
- Add the estimate, presentation, and final export screens.

Files to create:
- src/features/generate-smart-kitchen/screens/EstimateReviewScreen.tsx
- src/features/generate-smart-kitchen/screens/PresentationScreen.tsx
- src/features/generate-smart-kitchen/screens/FinalReviewExportScreen.tsx

Requirements:
- Build the estimate review screen with optional upgrade toggles.
- Build a customer-facing presentation screen that hides internal controls.
- Build a final review and export screen with independent export actions.

Tests:
- Add tests for each screen.
- Verify estimate toggles update totals.
- Verify export actions work independently.

Finish with:
- A short handoff file at artifacts/generate-smart-kitchen/step-6-handoff.md
- A structured report at artifacts/generate-smart-kitchen/step-6-report.md
- A list of files changed
- The tests you ran
```

## Step 7 Prompt

```txt
Implement Step 7 of the Generate Smart Kitchen migration.

Goal:
- Wire the existing editor button to open the new workspace instead of starting the old generation flow.

Files to update:
- components/src/features/cabinet-editor/components/layout/TopBar.tsx
- components/src/features/cabinet-editor/CabinetEditorBase.tsx
- components/src/features/cabinet-editor/components/canvas/CanvasArea.tsx

Requirements:
- Keep the Generate smart kitchen button visible.
- Replace the direct generation behavior with workspace navigation.
- Do not call /api/smart-kitchen from the editor button path.
- Keep the editor responsible only for floor-plan editing and export.
- Remove or deprecate the old immediate generation event handling.

Tests:
- Update TopBar tests.
- Update CabinetEditorBase tests.
- Update CanvasArea tests if needed.
- Verify the button opens the workspace route and does not trigger immediate generation.

Finish with:
- A short handoff file at artifacts/generate-smart-kitchen/step-7-handoff.md
- A structured report at artifacts/generate-smart-kitchen/step-7-report.md
- A list of files changed
- The tests you ran
```

## Step 8 Prompt

```txt
Implement Step 8 of the Generate Smart Kitchen migration.

Goal:
- Add the full end-to-end integration test and clean up any leftover direct-generation wiring.

Files to create or update:
- src/features/generate-smart-kitchen/__tests__/smartKitchenFlow.integration.test.tsx
- any files still needing cleanup from earlier steps

Requirements:
- Test the complete workspace flow from review to export.
- Use fake data and the fake API.
- Confirm the editor no longer owns the old direct generation path.
- Fix any leftover issues from earlier steps.

Tests:
- Run the full workspace integration test.
- Run the affected editor tests.
- Run the affected workspace tests.

Finish with:
- A short handoff file at artifacts/generate-smart-kitchen/step-8-handoff.md
- A structured report at artifacts/generate-smart-kitchen/step-8-report.md
- A list of files changed
- The tests you ran
```

## Suggested execution order

1. Step 1
2. Step 2
3. Step 3
4. Step 4
5. Step 5
6. Step 6
7. Step 7
8. Step 8

If you want the AI to work on only one step, paste only that step prompt plus the global system prompt.
