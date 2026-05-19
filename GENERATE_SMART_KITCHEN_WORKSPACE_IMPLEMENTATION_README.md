# Generate Smart Kitchen Workspace - Step-by-Step Implementation README

This README is the implementation plan for building the **Generate Smart Kitchen** workspace from the current editor into the 7-step sales workflow shown in the concept screens.

The goal is to keep the codebase **small, related, and easy to extend**. Start with a compact feature folder, then split components only when a screen becomes too large.

---

## 1. What you are building

When the user clicks **Generate smart kitchen** from the existing editor, the app should open a new guided workspace instead of immediately generating and placing cabinets into the editor canvas.

Target flow:

1. **Review & Confirm** - review imported floor plan, style, appliances, storage, and budget.
2. **Generate Designs** - show AI generation progress.
3. **AI Kitchen Studio** - browse 10 generated design options, refine, compare, and mark favorite.
4. **Compare & Choose** - compare 2-3 designs side by side.
5. **Estimate Review** - review pricing and optional upgrades.
6. **Presentation** - customer-facing presentation/catalog mode.
7. **Final Review & Export** - export files and send internal handoff.

---

## 2. Current files and how they should relate to the new workspace

You currently have these editor files:

```txt
CanvasArea.tsx
CabinetEditorBase.tsx
TopBar.tsx
```

Use them like this:

| Existing file | New responsibility |
|---|---|
| `TopBar.tsx` | Keep the visible **Generate smart kitchen** button. It should call a navigation/open-workspace callback, not directly generate the final kitchen layout. |
| `CabinetEditorBase.tsx` | Own the click handler that exports/saves the current editor project and routes to the Smart Kitchen workspace. |
| `CanvasArea.tsx` | Stay focused on drawing/editing/exporting the room. Do **not** put the 7-step Smart Kitchen UI inside this file. |

Important architecture rule:

```txt
Editor = draw/import/export the floor plan
Smart Kitchen Workspace = review/generate/compare/estimate/present/export
```

---

## 3. Recommended final file tree

Start with this structure:

```txt
app/
  generate-smart-kitchen/
    [projectId]/
      page.tsx

src/
  features/
    generate-smart-kitchen/
      index.ts
      types.ts
      constants.ts
      mockData.ts

      api/
        smartKitchenApi.ts

      state/
        SmartKitchenFlowProvider.tsx
        smartKitchenReducer.ts

      components/
        layout/
          SmartKitchenFlowShell.tsx
          SmartKitchenStepSidebar.tsx
          SmartKitchenTopBar.tsx

        shared/
          SectionCard.tsx
          StatusBadge.tsx
          PrimaryButton.tsx
          KitchenImageCard.tsx

      screens/
        ReviewConfirmScreen.tsx
        GenerateDesignsScreen.tsx
        KitchenStudioScreen.tsx
        CompareChooseScreen.tsx
        EstimateReviewScreen.tsx
        PresentationScreen.tsx
        FinalReviewExportScreen.tsx

      utils/
        editorToSmartKitchenData.ts
        smartKitchenCalculations.ts

      __tests__/
        mockData.test.ts
        smartKitchenReducer.test.ts
        smartKitchenApi.test.ts
        smartKitchenFlow.integration.test.tsx
        screens.test.tsx
```

This is enough to build the complete workflow without creating too many files.

---

## 4. Global coding system prompt

Use this system prompt before asking an AI coding assistant to implement any file in this feature.

```txt
You are coding inside a React / Next.js / TypeScript kitchen design web app.

Build a feature called Generate Smart Kitchen.

Hard rules:
- Use strict TypeScript.
- Avoid `any` unless there is no safe alternative; prefer `unknown` with type guards.
- Keep the Smart Kitchen 7-step workflow separate from CanvasArea.tsx.
- CanvasArea.tsx should remain the editor/canvas layer only.
- The Generate Smart Kitchen workspace should live in `src/features/generate-smart-kitchen/`.
- The route should open the Review & Confirm step first.
- Clicking Generate Smart Kitchen from the editor must not immediately start AI generation.
- Use mock data and a fake API first so UI development can continue before backend integration.
- All new UI components should be reusable, accessible, and testable.
- Use the existing project styling approach, likely Tailwind and lucide-react icons.
- Do not create a huge number of files up front. Start with the planned files only.
- Every screen must use the shared shell, left step sidebar, and top bar where appropriate.
- Each step must have one clear primary CTA.

Visual rules:
- Dark navy left sidebar.
- Teal active states and primary CTAs.
- White cards with subtle borders and shadows.
- Light gray page background.
- Large kitchen imagery on customer-facing screens.
- Presentation mode should hide internal AI/refinement controls.

Testing rules:
- Add or update tests for each file that contains behavior.
- Prefer unit tests for pure functions/reducers/API adapters.
- Prefer component tests for screens and shared UI.
- Add one integration test for the full step flow using fake data.
```

---

## 5. Implementation order overview

Build in this order:

```txt
1. types.ts
2. constants.ts
3. mockData.ts
4. api/smartKitchenApi.ts
5. state/smartKitchenReducer.ts
6. state/SmartKitchenFlowProvider.tsx
7. components/shared/*
8. components/layout/*
9. utils/editorToSmartKitchenData.ts
10. utils/smartKitchenCalculations.ts
11. screens/ReviewConfirmScreen.tsx
12. screens/GenerateDesignsScreen.tsx
13. screens/KitchenStudioScreen.tsx
14. screens/CompareChooseScreen.tsx
15. screens/EstimateReviewScreen.tsx
16. screens/PresentationScreen.tsx
17. screens/FinalReviewExportScreen.tsx
18. SmartKitchenFlowPage / route page.tsx
19. Existing editor integration: TopBar.tsx, CabinetEditorBase.tsx, CanvasArea.tsx
20. Integration tests and final cleanup
```

---

# 6. File-by-file implementation plan and prompts

---

## Step 1 - `types.ts`

### File

```txt
src/features/generate-smart-kitchen/types.ts
```

### Purpose

Defines the entire Smart Kitchen data model. Every other file depends on this.

### Should include

- `SmartKitchenStep`
- `SmartKitchenProject`
- `ProjectStatus`
- `ReviewData`
- `MeasurementData`
- `StyleSelection`
- `ApplianceRequirement`
- `CabinetRequirement`
- `GenerationJob`
- `KitchenDesign`
- `DesignSet`
- `DesignStatus`
- `DesignVersion`
- `CustomerRating`
- `Estimate`
- `EstimateCategoryLineItem`
- `OptionalEstimateItem`
- `PresentationData`
- `ProductionHandoffFormData`
- `ExportFileType`
- `SmartKitchenFlowState`

### Related files

Used by all files in this feature.

### Coding prompt

```txt
Implement `src/features/generate-smart-kitchen/types.ts`.

Create strict TypeScript types for a 7-step Generate Smart Kitchen workflow:
review -> generating -> studio -> compare -> estimate -> presentation -> export.

The types must support:
- Project/review data imported from a floor plan editor.
- AI generation job state.
- 10 generated kitchen designs.
- Design versions/refinements.
- Design comparison and customer favorite selection.
- Estimate line items and optional upgrades.
- Presentation mode data.
- Production handoff and export files.

Use string union types where appropriate.
Avoid `any`.
For unknown floor plan JSON, use `unknown`.
Export every type from this file.
```

### Testing prompt

```txt
Create a type-focused test or compile check for `types.ts`.

Add sample typed objects for:
- SmartKitchenProject
- ReviewData
- KitchenDesign
- Estimate
- ProductionHandoffFormData

The test should compile without TypeScript errors and should not require runtime assertions beyond basic sanity checks.
```

### Acceptance checks

- No `any` is used.
- Types are broad enough for all seven screens.
- Later files can import types from this file without circular dependencies.

---

## Step 2 - `constants.ts`

### File

```txt
src/features/generate-smart-kitchen/constants.ts
```

### Purpose

Keeps all fixed labels, step definitions, route step keys, UI tokens, and export file labels in one place.

### Should include

- `SMART_KITCHEN_STEPS`
- `SMART_KITCHEN_STEP_ORDER`
- `EXPORT_FILE_OPTIONS`
- `GENERATION_PROGRESS_STEPS`
- `REFINE_CATEGORIES`
- `DEFAULT_PROJECT_NAME`
- `smartKitchenTheme`

### Related files

Used by sidebar, top bar, screens, API mocks, tests.

### Coding prompt

```txt
Implement `src/features/generate-smart-kitchen/constants.ts`.

Create constants for the Generate Smart Kitchen workflow:
- 7 workflow steps with id, number, title, subtitle.
- Step order array.
- Generation progress steps.
- Export file options for design JSON, cabinet list, materials list, pricing, measurements, floor plan, elevations, images, presentation PDF.
- Refine category chips: Budget, Storage, Style, Layout, Materials, Appliances, More.
- Simple theme token object for navy, teal, white, gray, amber, green, red, radius, shadow, spacing.

Import only types from `types.ts` if needed.
Do not import React.
```

### Testing prompt

```txt
Add a small constants test.

Verify:
- There are exactly 7 workflow steps.
- Step numbers are 1 through 7.
- Export file options include the required production handoff files.
- Generation progress steps are in the expected order.
```

### Acceptance checks

- UI labels are not duplicated across screen files.
- Step sidebar can render entirely from these constants.

---

## Step 3 - `mockData.ts`

### File

```txt
src/features/generate-smart-kitchen/mockData.ts
```

### Purpose

Provides fake but realistic data so the UI can be built before backend AI generation is ready.

### Should include

- `createMockSmartKitchenProject()`
- `createMockReviewData()`
- `createMockKitchenDesign()`
- `createMockKitchenDesigns(count)`
- `createMockGenerationJob()`
- `createMockEstimate(designId)`
- `createMockPresentationData(designId)`
- `createMockProductionHandoffFormData()`

### Related files

Used by fake API, route page, state provider, screen tests.

### Coding prompt

```txt
Implement `src/features/generate-smart-kitchen/mockData.ts`.

Use the types from `types.ts`.
Create deterministic mock data for the Generate Smart Kitchen workflow.

Requirements:
- `createMockKitchenDesigns(10)` must return 10 unique designs.
- Each design must include id, title, style, imageUrl, thumbnailUrl, price range, key features, pros, cons, materials, storage score, layout summary, and designJson.
- Use stable placeholder image paths such as `/images/smart-kitchen/design-01.jpg`.
- Allow partial overrides where practical.
- Keep mock data realistic for the concept screens.
```

### Testing prompt

```txt
Create `src/features/generate-smart-kitchen/__tests__/mockData.test.ts`.

Test:
- `createMockKitchenDesigns(10)` returns 10 designs.
- All design ids are unique.
- Each design has imageUrl, thumbnailUrl, price range, materials, pros, cons, and key features.
- `createMockEstimate()` contains category line items and a total.
```

### Acceptance checks

- Mock data is deterministic.
- No network calls.
- Can support all seven screens.

---

## Step 4 - `api/smartKitchenApi.ts`

### File

```txt
src/features/generate-smart-kitchen/api/smartKitchenApi.ts
```

### Purpose

Creates the API boundary. UI code should depend on this interface, not directly on `fetch`.

### Should include

- `SmartKitchenApi` interface
- `createFakeSmartKitchenApi()`
- Optional future placeholder: `createHttpSmartKitchenApi()`

### Methods

```txt
getProject(projectId)
saveReviewData(projectId, reviewData)
validateProject(projectId)
startGeneration(projectId)
getGenerationJob(jobId)
getDesigns(projectId)
refineDesign(designId, payload)
getVersionHistory(designId)
duplicateVersion(versionId, payload)
markCustomerFavorite(projectId, designId)
saveCustomerRatings(projectId, ratings)
recalculateEstimate(designId, optionalItems)
savePreferredBudgetVersion(designId, estimate)
createPresentation(designId)
exportFile(projectId, fileType)
sendInternalHandoff(projectId, formData)
```

### Related files

Used by provider/state and screens. Uses mock data.

### Coding prompt

```txt
Implement `src/features/generate-smart-kitchen/api/smartKitchenApi.ts`.

Create an interface named `SmartKitchenApi` with all methods needed by the 7-step flow.
Then implement `createFakeSmartKitchenApi()` as an in-memory fake.

Requirements:
- Use `mockData.ts` for projects, designs, estimates, and presentation data.
- `startGeneration()` returns a fake job id.
- `getGenerationJob()` simulates deterministic progress and completion.
- `getDesigns()` returns 10 mock designs.
- `refineDesign()` creates a new version/design and does not overwrite the original.
- `exportFile()` returns a fake download URL and file metadata.
- `sendInternalHandoff()` returns a success response.
- Keep this file UI-independent.
```

### Testing prompt

```txt
Create `src/features/generate-smart-kitchen/__tests__/smartKitchenApi.test.ts`.

Test:
- `getProject()` returns a project.
- `startGeneration()` returns a job id.
- `getGenerationJob()` eventually reports complete.
- `getDesigns()` returns 10 designs.
- `refineDesign()` creates a new design/version and keeps parent id.
- `exportFile()` returns a fake download URL.
- `sendInternalHandoff()` returns success.
```

### Acceptance checks

- Screens never call `/api/smart-kitchen` directly.
- Backend can later replace fake API without rewriting screens.

---

## Step 5 - `state/smartKitchenReducer.ts`

### File

```txt
src/features/generate-smart-kitchen/state/smartKitchenReducer.ts
```

### Purpose

Pure reducer that controls state transitions. Easy to test.

### Should include

- `initialSmartKitchenFlowState`
- `SmartKitchenAction` union
- `smartKitchenReducer(state, action)`
- Selectors such as `getActiveDesign(state)` if useful

### Related files

Used by `SmartKitchenFlowProvider.tsx` and tests.

### Coding prompt

```txt
Implement `src/features/generate-smart-kitchen/state/smartKitchenReducer.ts`.

Create a pure reducer for the Generate Smart Kitchen flow.

State should track:
- current project
- review data
- active step
- generation job/progress
- generated designs
- active design id
- selected comparison design ids
- customer ratings
- customer favorite design id
- active estimate
- presentation data
- final review tab or slide
- loading and error states

Actions should support:
- load project success/failure
- update review data
- set active step
- start generation
- set generation job
- set generated designs
- set active design
- add/remove comparison design
- mark favorite
- set ratings
- set estimate
- set presentation data
- set final review tab
- set/clear error

Keep reducer pure. No API calls here.
```

### Testing prompt

```txt
Create `src/features/generate-smart-kitchen/__tests__/smartKitchenReducer.test.ts`.

Test:
- initial state starts on review step.
- loading project sets project and review data.
- setting generated designs also sets first active design if none exists.
- active design can be changed.
- comparison selection allows 2-3 designs and prevents duplicates.
- favorite design can be marked.
- final review tab can switch between customer presentation and production handoff.
```

### Acceptance checks

- Reducer has no side effects.
- Tests cover all important transitions.

---

## Step 6 - `state/SmartKitchenFlowProvider.tsx`

### File

```txt
src/features/generate-smart-kitchen/state/SmartKitchenFlowProvider.tsx
```

### Purpose

Provides state, actions, and API calls to the route and screens.

### Should include

- `SmartKitchenFlowProvider`
- `useSmartKitchenFlow()` hook
- Action functions like `loadProject`, `startGeneration`, `loadDesigns`, `refineActiveDesign`, `markFavorite`, `recalculateEstimate`, `exportFile`

### Related files

Uses reducer, API, types, mock data.

### Coding prompt

```txt
Implement `src/features/generate-smart-kitchen/state/SmartKitchenFlowProvider.tsx`.

Create a React context provider for the Smart Kitchen workflow.

Requirements:
- Use `smartKitchenReducer`.
- Accept a `SmartKitchenApi` instance through props, defaulting to `createFakeSmartKitchenApi()` for development.
- Expose state and high-level async actions through `useSmartKitchenFlow()`.
- Actions should call the API then dispatch reducer actions.
- Include loading and error handling.
- Do not render UI in this provider.
- Throw a clear error if `useSmartKitchenFlow()` is used outside provider.
```

### Testing prompt

```txt
Add provider tests or include it in the integration test.

Test:
- provider loads a mock project.
- startGeneration calls API and updates generation state.
- loadDesigns puts 10 designs in state.
- markFavorite updates state.
- API errors set an error message instead of crashing.
```

### Acceptance checks

- Screens can stay mostly presentational.
- API swapping is possible.

---

## Step 7 - Shared UI components

### Files

```txt
src/features/generate-smart-kitchen/components/shared/SectionCard.tsx
src/features/generate-smart-kitchen/components/shared/StatusBadge.tsx
src/features/generate-smart-kitchen/components/shared/PrimaryButton.tsx
src/features/generate-smart-kitchen/components/shared/KitchenImageCard.tsx
```

### Purpose

Reusable UI primitives used by every screen.

### Related files

Used by all screens and layout components.

### Coding prompt

```txt
Implement the shared UI components for Generate Smart Kitchen.

Files:
- SectionCard.tsx
- StatusBadge.tsx
- PrimaryButton.tsx
- KitchenImageCard.tsx

Requirements:
- Use the app's existing styling system, likely Tailwind.
- Components should be small and reusable.
- Use accessible labels where needed.
- `SectionCard` should support title, subtitle, right action, children, and optional className.
- `StatusBadge` should support variants such as default, success, warning, recommendation, favorite.
- `PrimaryButton` should support loading, disabled, icon, and fullWidth.
- `KitchenImageCard` should support imageUrl, alt, label overlay, loading/fallback state.
```

### Testing prompt

```txt
Create component tests for shared UI.

Test:
- SectionCard renders title and children.
- StatusBadge renders variant classes and text.
- PrimaryButton disables click when disabled/loading.
- KitchenImageCard renders image alt text and fallback when imageUrl is missing.
```

### Acceptance checks

- Screens do not duplicate card/button/badge styling.
- Components are accessible and predictable.

---

## Step 8 - Layout components

### Files

```txt
src/features/generate-smart-kitchen/components/layout/SmartKitchenFlowShell.tsx
src/features/generate-smart-kitchen/components/layout/SmartKitchenStepSidebar.tsx
src/features/generate-smart-kitchen/components/layout/SmartKitchenTopBar.tsx
```

### Purpose

Creates the visual workspace frame shared across all seven steps.

### Related files

Uses constants and provider state. Wraps screen content.

### Coding prompt

```txt
Implement the Smart Kitchen layout components.

Files:
- SmartKitchenFlowShell.tsx
- SmartKitchenStepSidebar.tsx
- SmartKitchenTopBar.tsx

Requirements:
- `SmartKitchenFlowShell` renders a full-height layout with left sidebar, top bar, main content, and optional right panel.
- `SmartKitchenStepSidebar` renders the 7 workflow steps from constants. Completed steps show a checkmark. Active step is highlighted with teal accent.
- `SmartKitchenTopBar` renders Back to Editor, project name, help icon, notification icon, Save Draft, and Exit/Exit Studio/Exit Presentation depending on active step.
- Keep these components reusable by all screens.
- Do not import editor `TopBar.tsx`; this is a separate Smart Kitchen top bar.
```

### Testing prompt

```txt
Create layout component tests.

Test:
- Sidebar renders all 7 steps.
- Active step has active state.
- Completed steps show completed marker.
- Top bar renders project name and actions.
- Shell renders sidebar, top bar, main content, and optional right panel.
```

### Acceptance checks

- Every screen uses the same shell.
- Visual navigation is consistent across workflow.

---

## Step 9 - `utils/editorToSmartKitchenData.ts`

### File

```txt
src/features/generate-smart-kitchen/utils/editorToSmartKitchenData.ts
```

### Purpose

Converts the current editor/floor-plan data into review data for the workspace.

### Related files

Used by `CabinetEditorBase.tsx`, route loader, provider, review screen.

### Coding prompt

```txt
Implement `src/features/generate-smart-kitchen/utils/editorToSmartKitchenData.ts`.

Purpose:
Convert floor-plan/editor data into Smart Kitchen review data.

Requirements:
- Accept the editor export object as `unknown` or a known editor export type if available.
- Safely extract dimensions, walls, windows, doors, existing placements, and notes where possible.
- Return a typed `ReviewData` object.
- Never crash on malformed input.
- Include helper type guards for unknown JSON.
- Keep this pure and UI-independent.
```

### Testing prompt

```txt
Create tests for editorToSmartKitchenData.

Test:
- valid editor export maps to ReviewData.
- missing optional fields use defaults.
- malformed input does not crash.
- walls/windows/doors counts map correctly when present.
```

### Acceptance checks

- Workspace can receive real editor data later.
- No direct UI or API logic in this utility.

---

## Step 10 - `utils/smartKitchenCalculations.ts`

### File

```txt
src/features/generate-smart-kitchen/utils/smartKitchenCalculations.ts
```

### Purpose

Pure calculations for estimate totals, budget fit, comparison summaries, and active design selection.

### Related files

Used by compare, estimate, export, tests.

### Coding prompt

```txt
Implement `src/features/generate-smart-kitchen/utils/smartKitchenCalculations.ts`.

Add pure functions for:
- calculateEstimateTotal(estimate)
- calculateSelectedUpgradeTotal(optionalItems)
- calculateBudgetRemaining(targetBudget, estimateTotal)
- getBudgetFitStatus(targetBudget, estimateTotal)
- getComparisonSummary(designs)
- getRecommendedDesignBadges(designs)
- formatCurrency(value)
- formatPriceRange(min, max)

Use types from `types.ts`.
No React imports.
```

### Testing prompt

```txt
Create tests for smartKitchenCalculations.

Test:
- estimate totals are correct.
- selected upgrade total only includes enabled optional items.
- budget status returns within/over/unknown correctly.
- comparison summary calculates price range and average storage score.
- currency formatting is stable.
```

### Acceptance checks

- Estimate and compare screens avoid inline calculation clutter.
- Easy to test pricing behavior.

---

## Step 11 - `screens/ReviewConfirmScreen.tsx`

### File

```txt
src/features/generate-smart-kitchen/screens/ReviewConfirmScreen.tsx
```

### Purpose

Step 1 screen. The user reviews data before AI generation.

### Related files

Uses provider, shell, shared UI, mock/review data.

### Coding prompt

```txt
Implement `ReviewConfirmScreen.tsx`.

Purpose:
Build Step 1 - Review & Confirm Kitchen.

Requirements:
- Use `SmartKitchenFlowShell`.
- Main title: Review & Confirm Kitchen.
- Show review cards for Kitchen Space, Style & Preferences, Appliances & Fixtures, Storage & Features, Budget & Notes.
- Each card has an Edit action placeholder.
- Right panel shows Project Summary, Design Preview thumbnails, and Data Security card.
- Bottom warning banner if review data has warnings or missing info.
- Primary CTA: Generate 10 AI Designs.
- Clicking CTA should call provider action to save/validate/start generation, then move to Generate Designs step.
- Do not start generation automatically on page load.
```

### Testing prompt

```txt
Create a screen/component test for ReviewConfirmScreen.

Test:
- heading renders.
- all review section cards render.
- project summary renders.
- Generate 10 AI Designs button exists.
- clicking Generate calls the start generation handler or provider action.
- warnings render when provided by state.
```

### Acceptance checks

- User can clearly review before generation.
- Generate is a deliberate action.

---

## Step 12 - `screens/GenerateDesignsScreen.tsx`

### File

```txt
src/features/generate-smart-kitchen/screens/GenerateDesignsScreen.tsx
```

### Purpose

Step 2 screen. Shows AI generation progress.

### Coding prompt

```txt
Implement `GenerateDesignsScreen.tsx`.

Purpose:
Build Step 2 - Generate Designs progress page.

Requirements:
- Use `SmartKitchenFlowShell`.
- Show title: Generating Smart Kitchen Designs.
- Show circular progress ring with percentage.
- Show vertical checklist: Reading floor plan, Analyzing measurements, Understanding preferences, Generating concepts, Rendering design images, Finalizing results.
- Show three blurred design placeholder cards with progress bars.
- Right panel shows Project Summary, AI Generation Tips, and Data Security card.
- Poll/simulate generation through provider/API.
- When generation completes, load 10 designs and move to AI Kitchen Studio step.
- Show retry button if generation fails.
```

### Testing prompt

```txt
Create tests for GenerateDesignsScreen.

Test:
- progress percentage renders.
- progress steps render.
- completed/current/pending states render correctly.
- completed generation calls load designs and moves to studio.
- failure state shows Retry.
```

### Acceptance checks

- Generation feels guided and reassuring.
- Completion transitions automatically to Step 3.

---

## Step 13 - `screens/KitchenStudioScreen.tsx`

### File

```txt
src/features/generate-smart-kitchen/screens/KitchenStudioScreen.tsx
```

### Purpose

Step 3 screen. Main design browsing and refinement workspace.

### Coding prompt

```txt
Implement `KitchenStudioScreen.tsx`.

Purpose:
Build Step 3 - AI Kitchen Studio.

Requirements:
- Use `SmartKitchenFlowShell`.
- Show title: AI Kitchen Studio.
- Main center area has a large featured kitchen image.
- Overlay label: Design XX of 10.
- Include View in 3D button placeholder.
- Include thumbnail strip with 10 designs.
- Clicking a thumbnail changes active design.
- Below thumbnails show Refine with AI composer with category chips and prompt input.
- Right panel shows active design details: title, style, tags, price range, key features, layout summary, storage summary, pros/cons.
- Actions: Refine This Design, Compare, Version History, Mark as Customer Favorite.
- Compare should move to compare step after selecting 2-3 designs or show helpful guidance.
- Mark as Customer Favorite updates state.
```

### Testing prompt

```txt
Create tests for KitchenStudioScreen.

Test:
- 10 thumbnails render from mock designs.
- active featured design renders.
- clicking thumbnail changes active design.
- design detail panel updates with active design.
- Mark as Customer Favorite calls provider action.
- Compare button exists.
- Refine input and category chips render.
```

### Acceptance checks

- This is the core workspace.
- Browse and explain designs easily.

---

## Step 14 - `screens/CompareChooseScreen.tsx`

### File

```txt
src/features/generate-smart-kitchen/screens/CompareChooseScreen.tsx
```

### Purpose

Step 4 screen. Customer-facing comparison of 2-3 designs.

### Coding prompt

```txt
Implement `CompareChooseScreen.tsx`.

Purpose:
Build Step 4 - Compare & Choose Your Kitchen.

Requirements:
- Use `SmartKitchenFlowShell`.
- Show 2-3 selected design cards side by side.
- Each card shows image, recommendation badge, title, style, rating, price range, storage score, appliance layout, materials, pros/cons, favorite/select button.
- Right panel shows Comparison Summary, Need a Custom Option, and Next Step card.
- Bottom sticky summary bar shows ready-to-review-estimates state.
- Primary CTA: Review Estimates & Continue.
- If no comparison designs are selected, fall back to the first 3 generated designs or show an empty state with Back to Studio.
```

### Testing prompt

```txt
Create tests for CompareChooseScreen.

Test:
- comparison cards render for selected designs.
- fallback renders when no selected designs exist.
- Select This Design marks one favorite.
- Review Estimates & Continue moves to estimate step.
- comparison summary shows price range and average storage score.
```

### Acceptance checks

- Customer can compare options visually and rationally.
- One favorite can be chosen.

---

## Step 15 - `screens/EstimateReviewScreen.tsx`

### File

```txt
src/features/generate-smart-kitchen/screens/EstimateReviewScreen.tsx
```

### Purpose

Step 5 screen. Pricing and upgrades.

### Coding prompt

```txt
Implement `EstimateReviewScreen.tsx`.

Purpose:
Build Step 5 - Estimate Review.

Requirements:
- Use `SmartKitchenFlowShell`.
- Show selected favorite design summary at the top.
- Show price breakdown table: cabinets, countertop, hardware, installation, appliances, accessories/misc.
- Show optional upgrade toggles.
- Toggling upgrades updates rough estimate immediately using calculation utility.
- Include Recalculate Final Estimate button that calls provider/API.
- Include Save as Preferred Budget Version primary button.
- Right panel shows Budget Fit Summary, Notes, What's Included, and Data Security card.
- Saving the preferred budget moves to Presentation step or shows a saved confirmation state.
```

### Testing prompt

```txt
Create tests for EstimateReviewScreen.

Test:
- selected design summary renders.
- category breakdown rows render.
- toggling optional upgrade updates estimate total.
- Recalculate Final Estimate calls provider/API action.
- Save as Preferred Budget Version calls provider/API action and moves to presentation step.
```

### Acceptance checks

- Estimate is understandable and adjustable.
- Budget version is saved before presentation/export.

---

## Step 16 - `screens/PresentationScreen.tsx`

### File

```txt
src/features/generate-smart-kitchen/screens/PresentationScreen.tsx
```

### Purpose

Step 6 screen. Customer-facing presentation/catalog mode.

### Coding prompt

```txt
Implement `PresentationScreen.tsx`.

Purpose:
Build Step 6 - Presentation.

Requirements:
- Use the Smart Kitchen visual language but make this more customer-facing and polished.
- Show title: Presentation and project subtitle.
- Top right: Download PDF and Exit Presentation.
- Include floating left presentation menu: Images, Materials, Estimate, Floor Plan, Elevations.
- Hero section: large kitchen render and proposal text panel.
- Materials & Finishes mood board.
- Estimate Summary card.
- Floor Plan card.
- Elevations card.
- Bottom reassurance banner.
- Hide internal AI/refine/version controls.
- Exit Presentation should return to Studio or continue to Final Review depending on current flow choice.
```

### Testing prompt

```txt
Create tests for PresentationScreen.

Test:
- presentation title renders.
- Download PDF button exists.
- Exit Presentation button exists.
- materials mood board renders.
- estimate summary renders.
- floor plan and elevations fallback states render if missing.
- no Refine with AI control appears.
```

### Acceptance checks

- Screen is safe to show to customer.
- It does not expose internal AI controls.

---

## Step 17 - `screens/FinalReviewExportScreen.tsx`

### File

```txt
src/features/generate-smart-kitchen/screens/FinalReviewExportScreen.tsx
```

### Purpose

Step 7 screen. Export and production handoff.

### Coding prompt

```txt
Implement `FinalReviewExportScreen.tsx`.

Purpose:
Build Step 7 - Final Review & Export.

Requirements:
- Use `SmartKitchenFlowShell`.
- Show title: Final Review & Export.
- Include tabs or slides: Customer Presentation and Production Handoff.
- Production Handoff tab shows project summary, key measurements, cabinet list summary, materials list summary, pricing summary.
- Export file grid includes: Design JSON, Cabinet List, Materials List, Pricing, Measurements, Floor Plan, Elevations, Images, Presentation PDF.
- Each export card calls provider/API export action independently.
- Bottom actions: Send to Internal Team and Download All ZIP.
- Right panel shows Handoff Checklist, Data Security, and Internal Handoff Preview.
- Include a simple handoff form state or modal placeholder if full form is not implemented yet.
```

### Testing prompt

```txt
Create tests for FinalReviewExportScreen.

Test:
- title renders.
- Customer Presentation and Production Handoff tabs render.
- export cards render for all required file types.
- clicking one export card calls export action with correct file type.
- one export loading/error state does not block other export cards.
- Send to Internal Team button exists and calls handler.
```

### Acceptance checks

- Production files are clearly separated from customer presentation.
- Export actions are independent.

---

## Step 18 - Route page

### File

```txt
app/generate-smart-kitchen/[projectId]/page.tsx
```

### Purpose

Entry route for the Smart Kitchen workflow.

### Related files

Uses provider and screens.

### Coding prompt

```txt
Implement `app/generate-smart-kitchen/[projectId]/page.tsx`.

Purpose:
Create the route entry point for the Generate Smart Kitchen workspace.

Requirements:
- Read `projectId` from route params.
- Wrap content in `SmartKitchenFlowProvider`.
- Load project data on mount.
- Render the correct screen based on active step state.
- Initial screen must be Review & Confirm.
- Show loading skeleton while loading project.
- Show friendly error state if loading fails.
- Do not start AI generation on route load.
```

### Testing prompt

```txt
Create route/page integration test.

Test:
- route renders loading state first if project is loading.
- route renders Review & Confirm after project loads.
- active step switches screens when state changes.
- error state renders when project load fails.
```

### Acceptance checks

- Route works independently from the editor.
- Direct URL opening does not start generation.

---

## Step 19 - `index.ts`

### File

```txt
src/features/generate-smart-kitchen/index.ts
```

### Purpose

Barrel exports. Keeps imports clean.

### Coding prompt

```txt
Implement `src/features/generate-smart-kitchen/index.ts`.

Export only the public API of this feature:
- types
- constants
- provider/hook
- API interface and fake API creator
- utility functions that other app areas may need

Do not export every internal screen/component unless the route needs them externally.
Keep feature internals private where possible.
```

### Testing prompt

```txt
Add a small import test.

Test that important public exports can be imported from `src/features/generate-smart-kitchen` without path errors.
```

### Acceptance checks

- No messy deep imports from outside the feature.
- Internal components remain internal where possible.

---

# 7. Existing editor integration plan

After the workspace route works, connect the current editor files.

---

## Step 20 - Update `TopBar.tsx`

### File

```txt
TopBar.tsx
```

### Purpose

Keep the existing **Generate smart kitchen** button, but its behavior should now open the workspace.

### Coding prompt

```txt
Update the existing editor `TopBar.tsx` only if needed.

Requirements:
- Keep `onGenerateSmartKitchen` prop.
- Keep `isGeneratingSmartKitchen` only if still useful for disabled/loading UI.
- Button label can remain `Generate smart kitchen`.
- Do not add Smart Kitchen workspace UI here.
- Do not call `/api/smart-kitchen` from TopBar.
- TopBar should only call the provided callback.
```

### Testing prompt

```txt
Update TopBar tests.

Test:
- Generate smart kitchen button renders when `onGenerateSmartKitchen` is passed.
- clicking the button calls `onGenerateSmartKitchen`.
- disabled/loading state prevents duplicate clicks if used.
```

---

## Step 21 - Update `CabinetEditorBase.tsx`

### File

```txt
CabinetEditorBase.tsx
```

### Purpose

Owns navigation from editor to Smart Kitchen workspace.

### Coding prompt

```txt
Update `CabinetEditorBase.tsx` to route into the Generate Smart Kitchen workspace.

Requirements:
- Replace the direct generation behavior with a route/navigation action.
- When user clicks Generate smart kitchen:
  1. Ensure current editor/floor-plan data is saved or exportable.
  2. Determine or create a projectId.
  3. Navigate to `/generate-smart-kitchen/[projectId]`.
- Do not start AI generation here.
- Preserve existing debug download actions if still needed.
- Keep CanvasArea responsible for editor data only.
```

### Testing prompt

```txt
Update CabinetEditorBase tests.

Test:
- clicking Generate smart kitchen navigates to the Smart Kitchen route.
- missing projectId shows a friendly error or disables the action.
- the click does not call `/api/smart-kitchen` directly.
```

---

## Step 22 - Update `CanvasArea.tsx`

### File

```txt
CanvasArea.tsx
```

### Purpose

Remove or isolate direct AI-generation ownership. Keep export helpers.

### Coding prompt

```txt
Update `CanvasArea.tsx` carefully.

Requirements:
- Do not place the 7-step Smart Kitchen workspace inside CanvasArea.
- Keep editor drawing, wall/window/door/cabinet placement, import/export, and existing room export logic.
- If CanvasArea currently listens for `pelican-generate-smart-kitchen`, remove or deprecate that generation behavior in favor of the new route flow.
- Keep or expose a clean function/path for exporting the current room JSON so CabinetEditorBase can pass/save it before navigation.
- Do not break existing editor interactions.
```

### Testing prompt

```txt
Update CanvasArea tests.

Test:
- existing editor rendering still works.
- room export still works.
- direct generation event no longer calls `/api/smart-kitchen` if the new workspace owns generation.
- import/export behavior remains stable.
```

---

# 8. Full workflow integration test

### File

```txt
src/features/generate-smart-kitchen/__tests__/smartKitchenFlow.integration.test.tsx
```

### Purpose

Protect the main sales flow from breaking.

### Testing prompt

```txt
Create an integration test for the Smart Kitchen flow using the fake API.

Test this sequence:
1. Render route/page with fake project.
2. Confirm Review & Confirm screen appears.
3. Click Generate 10 AI Designs.
4. Show Generate Designs progress.
5. Complete generation and load 10 designs.
6. Show AI Kitchen Studio.
7. Click a thumbnail and confirm active design changes.
8. Mark active design as customer favorite.
9. Move to Compare & Choose.
10. Select favorite and continue to Estimate Review.
11. Toggle an upgrade.
12. Save preferred budget version.
13. Open Presentation.
14. Exit Presentation.
15. Continue to Final Review & Export.
16. Export one file.
17. Send to Internal Team.

Use fake API responses. Keep the test deterministic.
```

---

# 9. Suggested commits

Use these commit chunks:

```txt
Commit 1: Add Smart Kitchen types, constants, mock data
Commit 2: Add fake API and reducer/provider state
Commit 3: Add shared and layout components
Commit 4: Add route and Review/Generate screens
Commit 5: Add Studio and Compare screens
Commit 6: Add Estimate and Presentation screens
Commit 7: Add Final Export screen
Commit 8: Wire editor button to new workspace route
Commit 9: Add integration tests and cleanup
```

---

# 10. Testing checklist

Before considering the workspace complete:

```txt
[ ] TypeScript passes with no errors.
[ ] Unit tests pass for mock data.
[ ] Unit tests pass for API fake.
[ ] Unit tests pass for reducer.
[ ] Shared component tests pass.
[ ] Layout component tests pass.
[ ] Screen tests pass.
[ ] Smart Kitchen flow integration test passes.
[ ] Existing editor tests still pass.
[ ] Generate Smart Kitchen button opens Review & Confirm, not immediate generation.
[ ] Step 2 generation completes into Step 3 Studio.
[ ] Studio shows 10 designs.
[ ] Compare supports 2-3 designs.
[ ] Estimate toggles update totals.
[ ] Presentation hides internal controls.
[ ] Export cards work independently.
```

---

# 11. Practical recommendation

Do not build 40 files immediately.

Start with:

```txt
1 route file
1 types file
1 constants file
1 mock data file
1 API file
2 state files
3 layout files
4 shared components
7 screen files
2 utility files
```

That is a clean, small implementation that can still grow into the full workflow.

Only split into smaller components like `FeaturedDesignViewer.tsx`, `DesignThumbnailStrip.tsx`, `EstimateBreakdownTable.tsx`, or `ExportFileCard.tsx` after the screen files become hard to read.

---

# 12. Final architecture rule

Keep this boundary clear:

```txt
TopBar.tsx
  -> button only

CabinetEditorBase.tsx
  -> route/open Smart Kitchen workspace

CanvasArea.tsx
  -> editor canvas and room export only

src/features/generate-smart-kitchen/*
  -> complete 7-step Generate Smart Kitchen workflow
```

This keeps the existing editor stable while letting the new AI sales workspace grow safely.
