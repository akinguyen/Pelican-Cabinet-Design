# Kitchen Editor Current Cleanup Guideline

This guideline is for the current Kitchen Editor codebase after the editor/designer workspace cleanup. It replaces the older cleanup notes where they conflict with the current structure, but keeps the same core principle: implement the real architecture directly, update every call site, and delete stale names instead of preserving compatibility wrappers.

## 1. Core Product Model

The app should read clearly as one shared design scene with multiple workspace permissions and multiple derived views.

Use this model:

- `DesignScene` is the source of truth.
- `KitchenWorkspaceMode` controls what the user is allowed to do.
- `SceneViewMode` controls how the same scene is viewed.
- `SceneCameraStates` remember camera state per scene view.
- `KitchenWorkspaceShell` owns the shared workspace layout.
- `KitchenEditorPanel` owns manual editing, catalog, and properties UI.
- `AIDesignerPanel` owns designer-mode selection summaries and AI chat.
- Editor mode can manually mutate the scene.
- Designer mode can select, inspect, navigate, and use AI, but cannot manually mutate the scene.

Do not duplicate scene data by workspace mode.

Avoid:

```ts
editorDesignScene
designerDesignScene
editorPlacedAssemblies
designerPlacedAssemblies
```

Use:

```ts
designScene
workspaceMode
activeSceneViewMode
sceneCameraStates
```

## 2. Layer Ownership Rule

Keep dependency direction clean.

The engine/store layer must not import from `features/kitchen-editor`. Scene/store-owned concepts belong in `engine/scene`, not in UI feature folders.

Scene-owned types should live near the scene store:

```txt
src/engine/scene/kitchenWorkspaceModeTypes.ts
src/engine/scene/sceneViewModeTypes.ts
src/engine/scene/sceneCameraStateTypes.ts
src/engine/scene/sceneCameraCommandTypes.ts
src/engine/scene/sceneEditingToolTypes.ts
src/engine/scene/sceneSelectionTypes.ts
src/engine/scene/sceneOperationTypes.ts
src/engine/scene/sceneDragTypes.ts
```

Feature components may import from `engine/scene`. `engine/scene` must not import from `features/kitchen-editor`.

This is a hard cleanup rule. Do not solve ownership problems with re-export files, aliases, bridge files, or compatibility wrappers.

## 3. Workspace Mode vs Scene View Mode

Keep these concepts separate.

```ts
export type KitchenWorkspaceMode = "editor" | "designer";
export type SceneViewMode = "perspective" | "floor-plan" | "elevation";
```

Meaning:

- `editor`: manual editing mode.
- `designer`: read-only selection, inspection, and AI design/chat mode.
- `perspective`: 3D perspective view.
- `floor-plan`: top-down view.
- `elevation`: wall/elevation view.

Do not use `EditorView`, `KitchenEditorView`, or `activeEditorView` to mean perspective/floor/elevation. Use `SceneViewMode` and `activeSceneViewMode`.

## 4. Camera State and Camera Commands

Camera state belongs to scene view mode, not workspace mode.

Use:

```ts
sceneCameraStates: {
  perspective,
  floorPlan,
  elevationDefault,
  elevationByViewKey,
}
```

Do not create separate camera states for editor/designer mode. Switching between editor and designer must not reset camera state.

Keep camera commands separate from active editing tools:

```txt
src/engine/scene/actions/sceneCameraCommandActions.ts
src/engine/scene/actions/sceneCameraStateActions.ts
src/engine/scene/actions/sceneEditingToolActions.ts
```

Camera commands are one-shot commands:

```ts
export type SceneCameraCommandTool = "zoom-out" | "zoom-in" | "fit-view";
```

Active editing tools are editor-only:

```ts
export type KitchenEditorActiveToolbarTool =
  | "draw-wall-footprint"
  | "split-wall-footprint";
```

Never allow impossible active states such as:

```ts
activeToolbarTool: "zoom-in"
```

## 5. Store Action Guard Rule

Manual mutation actions must return early unless the workspace mode is `editor`.

Use:

```ts
if (get().workspaceMode !== "editor") {
  return;
}
```

Apply this rule to manual mutation action files, including:

```txt
assemblyPlacementActions.ts
assemblyDragActions.ts
assemblyEditingActions.ts
wallFootprintDraftActions.ts
wallSplitDraftActions.ts
wallEditingActions.ts
sceneEditingToolActions.ts
```

Do not block shared read/navigation actions:

```txt
sceneSelectionActions.ts
sceneViewModeActions.ts
sceneCameraStateActions.ts
sceneCameraCommandActions.ts
wallElevationNavigationActions.ts
```

Selection is allowed in designer mode, but selection actions must not secretly start editing operations in designer mode. If a selection action also starts a draft, split, drag, or placement operation, guard only the mutation part with `workspaceMode === "editor"`.

## 6. Designer Mode Interaction Rules

Designer mode is read-only for manual editing.

Allowed in designer mode:

- select placed assembly
- select placed wall
- clear selection
- hover
- orbit, pan, zoom camera
- switch scene view mode
- read selected assembly summary
- read selected wall summary
- use AI designer chat
- review future AI suggestions/proposals

Blocked in designer mode:

- place assembly candidate
- drag assembly
- edit dimensions
- edit options
- edit position
- edit rotation
- delete assembly
- draw wall footprint
- split wall footprint
- edit wall height
- edit wall viewable edges
- delete wall
- commit active scene operation

This must be enforced in interaction components and store actions. Do not only hide buttons.

## 7. Workspace Folder Responsibilities

Current recommended feature structure:

```txt
src/features/kitchen-editor/
  KitchenEditorApp.tsx
  workspace/
  editor-toolbar/
  designer-toolbar/
  editor-panel/
  designer-panel/
  editors/
    perspective/
    floor-plan/
    elevation/
    shared/
  interaction/
    assemblies/
    walls/
  rendering/
    assemblies/
    walls/
  properties-panel/
    assemblies/
    walls/
    shared/
  catalog-panel/
  catalogs/
    data/
    registry/
      raw-entries/
  shared/
```

Use each folder for its real responsibility:

- `workspace`: shared shell, header, sidebar, workspace mode switch, scene view tabs.
- `editor-toolbar`: manual editing toolbar configuration and components.
- `designer-toolbar`: designer-mode toolbar configuration and components.
- `editor-panel`: catalog, editable properties, editor controls.
- `designer-panel`: read-only selected summaries and AI chat.
- `editors`: perspective/floor/elevation canvas composition.
- `interaction`: pointer/keyboard interaction surfaces.
- `rendering`: scene object rendering components.
- `properties-panel`: editable property UI.
- `catalogs`: raw catalog data and registry.

Do not create fake wrapper folders or generic shared folders before there is a real shared responsibility.

## 8. Naming Rules

Use names that describe the real responsibility.

Preferred names:

```txt
DesignSceneViewport
DesignSceneLighting
SceneViewModeTabs
KitchenWorkspaceShell
KitchenWorkspaceHeader
KitchenWorkspaceSidebar
KitchenEditorPanel
AIDesignerPanel
SelectedAssemblySummary
SelectedWallSummary
SelectedSummaryField
```

Avoid names that imply the wrong layer or responsibility:

```txt
EditorViewSwitcher
EditorLighting, if used by both modes
KitchenEditorInspectorPanel
KitchenEditorRightPanel
KitchenEditorView
activeEditorView
EditorCameraStates
editorCameraStates
```

Avoid generic names unless they are truly accurate:

```txt
resolve
resolver
manager
helper
utils
misc
common
```

Use `resolve` only when the function truly resolves an ambiguity, path, ID, dependency, or reference. Otherwise prefer domain verbs such as:

```txt
build
create
parse
validate
select
find
get
map
project
measure
sanitize
normalize
compute
convert
apply
update
commit
derive
```

## 9. Direct Rename Rule

When a name is wrong, rename the real thing directly.

Do not keep:

- aliases
- bridge files
- compatibility wrappers
- old-name exports
- fake migrations
- fallbacks for old names
- deprecated duplicate paths

Bad:

```ts
export type SceneViewMode = KitchenEditorView;
```

Good:

```ts
export type SceneViewMode = "perspective" | "floor-plan" | "elevation";
```

Then update every import and call site and delete the old name.

## 10. Engine Assembly Parser Organization

Raw assembly definition parsing should stay data-first, but parser code should be split by real responsibility.

Use:

```txt
src/engine/assemblies/raw-definition/
  parseRawAssemblyDefinition.ts
  parseRawAssemblyComponents.ts
  parseRawAssemblyExpressions.ts
  parseRawAssemblyConditions.ts
  parseRawAssemblyOptions.ts
  rawAssemblyReadHelpers.ts
```

Keep the main definition parser as orchestration, not a thousand-line mixed parser.

Avoid:

- `parserUtils.ts` dumping ground
- `definitionHelpers.ts` with unrelated helpers
- wrapper re-exports only to preserve old imports
- generic `resolveRaw...` naming unless it truly resolves references

## 11. Catalog Data and Registry Rules

Catalog definitions should stay as explicit raw data files when they are mostly data.

Use catalog data folders like:

```txt
src/features/kitchen-editor/catalogs/data/
  appliances/
  base-cabinets/
  basic-units/
  pantry-cabinets/
  wall-cabinets/
```

Split registry entries by group:

```txt
src/features/kitchen-editor/catalogs/registry/raw-entries/
  applianceRawCatalogEntries.ts
  baseCabinetRawCatalogEntries.ts
  basicUnitRawCatalogEntries.ts
  pantryCabinetRawCatalogEntries.ts
  wallCabinetRawCatalogEntries.ts
```

The main registry should combine explicit arrays. Avoid magic filesystem scanning or helper-generated catalogs unless there is a real need.

Do not convert data definitions into TypeScript factory helpers just to reduce repeated JSON. Repetition in declarative data is acceptable when it keeps the object definition readable.

## 12. Designer Panel Rules

Designer mode should have read-only summary components, not editable property panels with fake `readOnly` props.

Use:

```txt
AIDesignerPanel.tsx
DesignerChatPanel.tsx
SelectedAssemblySummary.tsx
SelectedWallSummary.tsx
SelectedSummaryField.tsx
```

Use `Summary` naming for designer-mode selected data.

Do not reuse editable property panels unless read-only rendering becomes a real shared responsibility with a clear shared component.

## 13. Wall and Assembly Interaction Rules

In editor mode:

- clicking an assembly selects it and may allow drag
- clicking a wall selects it and may allow the active wall operation
- Delete/Backspace can delete selected editable scene objects
- Escape cancels candidate/draft/operation state before clearing selection

In designer mode:

- clicking an assembly selects only
- clicking a wall selects only
- Delete/Backspace does not mutate the scene
- Escape can clear non-mutating UI state but must not commit/cancel manual mutation as a side effect that changes the scene

Interaction components should use explicit mode checks where needed. Avoid broad permission systems unless the logic becomes repeated and large enough to justify a real domain file.

If a helper is needed, prefer a specific name:

```ts
canManuallyEditScene(workspaceMode)
```

Avoid vague names:

```ts
checkPermission()
workspaceResolver()
modeHelper()
```

## 14. Units and Geometry Naming

Domain/model/layout geometry uses inches. Browser/render boundary values use pixels.

Use explicit suffixes when a value carries units:

```txt
widthInches
heightInches
depthInches
xInches
yInches
zInches
screenXInches
pointerClientXPixel
canvasWidthPixels
```

Prefer domain types such as:

```txt
Point2DInches
Point3DInches
Size2DInches
Size3DInches
Rotation3DDegrees
```

Convert pixels to inches at input boundaries and inches to pixels only at rendering/UI boundaries. Do not mix pixels and inches in the same type unless every field is explicitly named.

## 15. Scene Source-of-Truth Rules

The 3D design scene remains the source of truth.

Perspective, floor plan, and elevation are derived views of the same scene. Do not store separate object placement data per view.

Placed assemblies should keep source placement in the scene model. Derived view renderers may project, filter, or display that scene differently, but should not become a second source of truth.

## 16. AI Designer Workflow Rules

Do not add unused future AI store placeholders.

For now, chat state can stay local to `DesignerChatPanel` unless persistence is needed.

Future AI design workflow should use explicit proposal language:

```txt
DesignerProposal
DesignerProposalValidationResult
previewDesignerProposal()
applyDesignerProposal()
rejectDesignerProposal()
```

Designer mode blocks manual editing, but a future accepted AI proposal may mutate the scene through explicit proposal actions.

Do not let chat code call normal manual edit actions directly.

Bad future flow:

```ts
updateSelectedAssemblyDimension(...)
deleteSelectedAssembly()
```

Good future flow:

```txt
AI response
-> parse DesignerProposal
-> validate DesignerProposal
-> preview DesignerProposal
-> applyDesignerProposal after user accepts
```

## 17. UI Layout Rule

The right sidebar belongs to the workspace shell grid, not only the viewport/content area.

Recommended shell structure:

```txt
KitchenWorkspaceShell
├── KitchenWorkspaceHeader
├── KitchenWorkspaceToolbar
├── DesignSceneViewport
└── KitchenWorkspaceSidebar
```

The sidebar should span all shell rows when it needs full height:

```txt
grid columns: main workspace | full-height sidebar
grid rows: header | toolbar | viewport
sidebar: column 2, row 1 through row 3
```

Do not put the sidebar inside only the lower content area if it should stretch the full height of the app.

## 18. Cleanup Verification Checklist

Before returning code, run these checks when possible:

1. TypeScript transpile or project build check.
2. Local import existence check.
3. Red-flag search.
4. CRLF line ending scan.
5. No engine imports from `features/kitchen-editor`.
6. Designer mode mutation guard review.
7. No fake alias/bridge/compatibility files.
8. No unused helpers, unused types, or wrapper components.
9. No generic `utils`, `helpers`, `manager`, or `resolver` files unless the responsibility is truly accurate.
10. Updated code package contains only the requested scope, usually the updated `src` folder.

## 19. Red-Flag Search Terms

Search these before returning code:

```txt
legacy
fallback
migration
migrate
compat
compatibility
deprecated
resolve
resolver
Resolved
Date.now
Math.random
PartObject
KitchenWorld3D
BoxAssemblyBody
place-assembly
ObjectCatalog
KitchenEditorRightPanel
WallOutlineCandidate
selectedEntity
activeCandidate
EditorToolbarTool
wallFootprintDraftPointer
outlinePointsInches
EditorViewSwitcher
KitchenEditorInspectorPanel
activeEditorView
KitchenEditorView
editorCameraStates
EditorCameraStates
designerDesignScene
editorDesignScene
designerCameraStates
```

Not every match is automatically wrong, but every match must be reviewed.

For this codebase, also review:

```txt
EditorLighting
EditorView
editor view
permissionManager
modeHelper
parserUtils
```

## 20. Final Standard

A clean implementation should be easy to describe:

- The engine owns scene data, scene types, scene store actions, geometry, walls, and assemblies.
- The Kitchen Editor feature owns UI, workspace layout, panels, toolbars, view composition, rendering components, interaction components, and catalog data.
- The scene model is shared by editor and designer modes.
- Workspace mode controls mutation permission.
- Scene view mode controls how the same scene is viewed.
- Camera state persists per scene view.
- Camera commands are one-shot commands.
- Manual editing tools are editor-only active tools.
- Designer mode is read-only for manual scene mutation.
- Raw assembly parsing is split by real parser responsibilities.
- Catalog registry entries are grouped by catalog type.
- Names should describe the current real responsibility, not old behavior or future plans.

If a file, type, action, component, or folder does not match this model, rename it, move it, inline it, split it, or delete it directly.
