# Kitchen Editor Cleanup Guideline - Current Cleaned Code Version

This guideline reflects the current Kitchen Editor code after the editor/designer workspace cleanup, engine-boundary cleanup, catalog registry split, interaction hardening, camera consistency cleanup, large-file selective cleanup, assembly folder organization, and `editors/shared` folder organization.

The purpose of this guideline is to keep future code direct, maintainable, and consistent with the current architecture. Do not use it as a reason to rewrite unrelated working code.

## 1. Source-of-truth model

`DesignScene` is the source of truth.

- `KitchenWorkspaceMode` controls what the user is allowed to do.
- `SceneViewMode` controls how the same scene is viewed: perspective, floor plan, or elevation.
- Perspective, floor plan, and elevation are derived views of the same scene data.
- Do not duplicate scene data by workspace mode or view mode.

Use:

```ts
export type KitchenWorkspaceMode = "editor" | "designer";
export type SceneViewMode = "perspective" | "floor-plan" | "elevation";
```

Avoid:

```ts
editorDesignScene
designerDesignScene
editorPlacedAssemblies
designerPlacedAssemblies
perspectiveDesignScene
floorPlanDesignScene
elevationDesignScene
```

## 2. Engine and feature dependency boundary

`src/engine` must not import from `src/features`.

The dependency direction is:

```txt
features/kitchen-editor -> engine -> core/shared primitives
```

Never import feature code from inside `src/engine`:

```ts
import { something } from "@/features/kitchen-editor/...";
```

If a type is owned by the scene store or engine actions, it belongs under `engine/scene`, not under an editor UI folder.

Current engine-owned scene files include:

```txt
engine/scene/sceneViewModeTypes.ts
engine/scene/sceneCameraCommandTypes.ts
engine/scene/sceneCameraStateTypes.ts
engine/scene/sceneEditingToolTypes.ts
engine/scene/kitchenWorkspaceModeTypes.ts
engine/scene/kitchenWorkspaceModePermissions.ts
```

Feature UI may import these engine scene types. Engine files must not import feature UI types.

## 3. Workspace mode rules

Editor mode may manually mutate the scene.

Designer mode is read-only for manual scene editing.

Allowed in designer mode:

```txt
select placed assembly
select placed wall
clear selection
hover
orbit/pan/zoom camera
switch scene view mode
use wall elevation navigation
read selected assembly summary
read selected wall summary
use AI designer chat
```

Blocked in designer mode:

```txt
place assembly candidate
drag assembly
edit assembly dimensions/options/position/rotation
delete assembly
draw wall footprint
split wall footprint
edit wall height
edit wall viewable edges
delete wall
commit active scene operation
```

Store actions and interaction components must both enforce this. Do not only hide buttons.

Use the specific permission helper for manual scene editing:

```ts
canManuallyEditScene(workspaceMode)
```

Use it in mutation paths, not in read-only selection, camera, or view navigation paths.

Good:

```ts
if (!canManuallyEditScene(get().workspaceMode)) {
  return;
}
```

Do not introduce a generic permission system unless the real permission model grows large enough to justify it.

Avoid:

```txt
checkPermission
permissionManager
modeHelper
workspaceResolver
```

## 4. Scene view and camera naming

Use scene-oriented names, not editor-only names:

```txt
SceneViewMode
activeSceneViewMode
setActiveSceneViewMode
SceneCameraStates
PerspectiveCameraState
OrthographicCameraState
ElevationCameraState
sceneCameraStates
sceneViewModeActions.ts
sceneCameraStateActions.ts
```

Avoid old editor-view names:

```txt
KitchenEditorView
activeEditorView
setActiveEditorView
EditorCameraStates
editorCameraStates
sceneViewActions.ts
```

Camera state belongs to scene view mode, not workspace mode. Switching between editor and designer mode must not reset camera state.

## 5. Camera control organization

Shared editor camera utilities belong in:

```txt
features/kitchen-editor/editors/shared/camera/
  cameraFit.ts
  orthographicCameraControls.ts
  sceneCameraControlSettings.ts
  useSceneFitFrame.ts
```

Use shared orthographic camera utilities for floor plan and elevation when the behavior is truly the same.

Keep perspective-specific camera behavior separate because orbit/rotation behavior is different from floor-plan/elevation panning.

Do not merge all camera controls into a fake generic controller. Shared code is acceptable only for truly shared behavior such as:

```txt
orthographic camera read/apply state
orthographic pan/zoom settings
fit-frame math
shared mouse/touch control mappings
```

Preserve camera feel unless the task explicitly asks to change it.

## 6. Toolbar and command rules

Keep one-shot camera commands separate from active editing tools.

Camera commands are not active tools:

```ts
export type SceneCameraCommand = "zoom-out" | "zoom-in" | "fit-view";
```

Active scene editing tools are scene operation modes:

```ts
export type SceneEditingTool = "draw-wall-footprint" | "split-wall-footprint";
```

Do not allow impossible active state such as:

```ts
activeToolbarTool: "zoom-in";
```

Toolbar config, labels, and buttons belong in feature UI folders. Editing tool types belong in `engine/scene` when the scene store uses them.

Camera commands may clear wall draft operations when needed to avoid orphaned draft state, but they should not cancel assembly placement candidates unless the user action explicitly means cancel placement.

## 7. Shared editor folder organization

`features/kitchen-editor/editors/shared` must stay organized by real responsibility.

Current structure:

```txt
features/kitchen-editor/editors/shared/
  camera/
    cameraFit.ts
    orthographicCameraControls.ts
    sceneCameraControlSettings.ts
    useSceneFitFrame.ts

  interaction/
    KeyboardShortcuts.tsx
    PlacementSurface.tsx

  scene-canvas/
    DesignSceneCanvas.tsx
    DesignSceneRenderer.tsx
    EditorLighting.tsx
    GroundGrid.tsx
    SceneAxisGizmo.tsx
```

Use these rules:

- Camera math/control utilities go in `camera/`.
- Shared Three.js canvas/render environment components go in `scene-canvas/`.
- Shared editor input/interaction surfaces go in `interaction/`.
- Do not put new files directly in `editors/shared` unless they truly define a new top-level responsibility and a folder would be premature.
- Do not create vague folders such as `components`, `helpers`, `utils`, `common`, or `misc`.

Naming style:

- React components use PascalCase file names: `DesignSceneCanvas.tsx`.
- Hooks/utilities/config use camelCase file names: `useSceneFitFrame.ts`, `cameraFit.ts`.

## 8. Assembly engine folder organization

`engine/assemblies` should keep broad assembly engine concepts at the root and move specialized subsystems into real responsibility folders.

Current structure:

```txt
engine/assemblies/
  assemblyBounds.ts
  assemblyComponentTypes.ts
  assemblyConfiguration.ts
  assemblyConfigurationFactory.ts
  assemblyDefinitionTypes.ts
  assemblyRegistry.ts
  assemblyTreeBuilder.ts
  placedAssemblyTypes.ts

  raw-definition/
    buildAssemblyFromRawDefinition.ts
    createAssemblyDefinitionFromRaw.ts
    parseRawAssemblyDefinition.ts
    rawAssemblyConditionEvaluator.ts
    rawAssemblyDefinitionComponentParsers.ts
    rawAssemblyDefinitionParserReader.ts
    rawAssemblyDefinitionTypes.ts
    rawAssemblyDefinitionValueParsers.ts
    rawAssemblyExpressionEvaluator.ts

  front-outline/
    assemblyFrontOutlineLineMerging.ts
    assemblyFrontOutlineLines.ts
```

Use these rules:

- Raw catalog JSON conversion/parsing/building belongs in `raw-definition/`.
- Front outline generation and front outline line merging belongs in `front-outline/`.
- Broad assembly engine files stay at the root.
- Do not create fake `core`, `shared`, `types`, `helpers`, or `utils` folders just to reduce root file count.

## 9. Catalog registry organization

Catalog JSON definitions should stay as raw data files.

The raw catalog registry may be split by real catalog group:

```txt
features/kitchen-editor/catalogs/registry/raw-catalog-entries/
  applianceRawCatalogEntries.ts
  baseCabinetRawCatalogEntries.ts
  basicUnitRawCatalogEntries.ts
  pantryCabinetRawCatalogEntries.ts
  wallCabinetRawCatalogEntries.ts
```

The composition file remains:

```txt
features/kitchen-editor/catalogs/registry/kitchenEditorRawCatalogEntries.ts
```

This composition file is valid because it has a real responsibility: building the ordered registry list.

Do not add dynamic JSON auto-loading, fake registry wrappers, or index bridge files unless the build setup and responsibility clearly justify it.

## 10. File splitting and folder organization rules

Large files should only be split along real responsibility boundaries.

Good reasons to split:

```txt
a parser file has clearly separate parsing sections
a registry file has real catalog groups
a renderer file has separate render-item, marker, guide, or layer responsibilities
a flat folder mixes camera, canvas, interaction, rendering, or parsing responsibilities
```

Bad reasons to split:

```txt
file is long
folder has more than a few files
helper could be reused someday
wrapping old names with new names
creating generic buckets like utils.ts or helpers.ts without a clear domain
```

Do not create thin pass-through wrappers only to reduce line count.

When organizing folders:

- Prefer responsibility names such as `raw-definition`, `front-outline`, `scene-canvas`, `camera`, `interaction`, `guides`, `overlays`, or `drafts` when they match real code responsibilities.
- Avoid vague names such as `core`, `shared`, `common`, `helpers`, `utils`, `misc`, or `components` unless the folder already has a precise project convention.
- Avoid barrel `index.ts` files unless the codebase consistently uses them and the barrel has a real purpose.
- Update all imports directly. Do not keep old-path bridge files.

## 11. Rendering folder organization guidance

Do not reorganize rendering folders automatically. Reorganize only when the folder clearly mixes responsibilities.

Potential future candidate:

```txt
features/kitchen-editor/rendering/walls/
```

A future split may be valid if the folder keeps growing:

```txt
features/kitchen-editor/rendering/walls/
  WallLayer.tsx
  WallMesh.tsx
  wallRenderingGeometry.ts

  overlays/
    SelectedWallBoundaryOverlay.tsx
    WallBoundaryEdges.tsx
    WallVertexMarkers.tsx

  guides/
    WallAngleGuides.tsx
    WallMeasurementGuides.tsx
    WallPlanMeasurementOverlay.tsx
    WallReferenceGuides.tsx

  drafts/
    WallFootprintDraftRenderer.tsx
    WallSplitDraftRenderer.tsx
```

Do not apply this split until there is a clear need or active work in that folder.

## 12. Naming rules

Use specific domain names.

Avoid generic naming unless it is literally accurate:

```txt
resolve
resolver
helper
utils
manager
checkPermission
modeHelper
permissionManager
```

Prefer names that describe the real action:

```txt
buildAssemblyTree
composeAssemblyParts
createWallFootprint
projectSceneToFloorPlan
projectSceneToElevation
measureAssemblyBounds
canManuallyEditScene
parseRawAssemblyDefinition
buildAssemblyFromRawDefinition
mergeAssemblyFrontOutlineLines
```

Use kebab-case for string IDs:

```txt
zoom-in
zoom-out
fit-view
draw-wall-footprint
split-wall-footprint
```

Use normal TypeScript casing for variables, functions, types, and properties.

## 13. Unit naming rules

Domain/source-of-truth geometry uses inches.

Browser/render/UI boundary values use pixels.

Use explicit suffixes where ambiguity exists:

```txt
Point3DInches
Size3DInches
CanvasSizePixels
pointerClientPixels
screenDragDistancePixels
worldPositionInches
heightInches
```

Convert pixels to inches as soon as pointer input enters domain logic. Convert inches to pixels only at rendering/UI boundaries.

Do not mix inches and pixels in the same type or variable name without explicit suffixes.

## 14. Red-flag search terms

Search these before returning code:

```txt
@/features/kitchen-editor inside src/engine
sceneViewActions
KitchenEditorActiveToolbarTool
EditorViewSwitcher
KitchenEditorInspectorPanel
activeEditorView
KitchenEditorView
editorCameraStates
EditorCameraStates
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
PartObject
KitchenWorld3D
readOnly
checkPermission
modeHelper
permissionManager
helpers
utils
misc
common
```

Not every match is automatically wrong, but each match must be reviewed.

Expected clean state:

- No `@/features/kitchen-editor` imports inside `src/engine`.
- No old scene/editor view type names.
- No fake compatibility exports or bridge files.
- No generic helper/utility folders added without a real responsibility.

## 15. Verification checklist before returning code

Run the strongest checks available from the uploaded package.

Minimum checks when only `src` is available:

```txt
TypeScript transpile syntax check for TS/TSX files
local import existence check
JSON parse check for catalog JSON files
red-flag search
confirm src/engine has no imports from src/features
```

When the full project is available, also run:

```bash
npm run lint
npm run build
npm run test
```

If full project config is not available, state that clearly instead of claiming the real build passed.

## 16. Implementation standard

For cleanup work:

```txt
rename the real thing
move files only when the destination folder represents a real responsibility
update every call site
delete the old file/name
avoid alias exports
avoid compatibility shims
avoid bridge files
avoid fake migrations
verify imports
run syntax/build checks when possible
```

For feature work:

```txt
keep implementation small and testable
avoid changing unrelated behavior
preserve source-of-truth scene data
keep editor/designer permission rules explicit
add or update tests/checks for changed behavior when project config is available
```

For behavior-sensitive work:

```txt
separate risky behavior changes from safe file organization
preserve camera feel unless the task explicitly changes it
preserve placement/drag/delete behavior unless the task explicitly changes it
test designer mode permissions after interaction changes
test catalog loading after registry/parser changes
test front outlines after front-outline changes
```

## 17. Current architecture summary

The current product model should read like this:

```txt
DesignScene is the source of truth.
KitchenWorkspaceMode controls user permissions.
SceneViewMode controls perspective/floor/elevation viewing.
SceneCameraStates remember camera data per scene view mode.
KitchenWorkspaceShell owns the shared layout.
KitchenEditorPanel owns manual editing/catalog/properties UI.
AIDesignerPanel owns read-only selection summaries and AI chat.
Editor mode can manually mutate the scene.
Designer mode can select, inspect, navigate, and use AI, but cannot manually mutate the scene.
Engine code does not depend on feature UI code.
Assembly parsing/building and front-outline logic are organized by real responsibility.
Shared editor files are split into camera, scene-canvas, and interaction responsibilities.
```

Any file, type, action, component, or folder that does not match this model should be renamed, moved, inlined, or deleted directly.
