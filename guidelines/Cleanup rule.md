# Kitchen Editor Code Cleanup Guidelines

These guidelines are the current cleanup and coding reference for the Kitchen Editor codebase after the Phase 1 through Phase 7 cleanup work.

Use this document for future implementation, refactoring, cleanup review, code naming, file organization, and AI-assisted coding tasks.

The goal is to keep the project:

- direct
- consistent
- professional
- easy to review
- easy to extend
- safe for future import/export and AI-generated JSON workflows
- free from fake cleanup patterns

The most important rule:

```txt
Rename the real thing, update all call sites, delete the old thing.
Do not hide old code behind aliases, wrappers, fallbacks, bridge files, or compatibility layers.
```

---

## 1. Current Project Model

Kitchen Editor is a 3D-world-driven design editor.

The source of truth is the design scene. The editor views are derived from that same scene.

Current editor views:

```txt
Perspective editor
Floor Plan editor
Elevation editor
```

The current Floor Plan and Elevation views are still Three.js / React Three Fiber camera views. Native SVG floor/elevation renderers can be future work, but should not be introduced unless the feature explicitly calls for it.

Use current Kitchen Editor concepts. Do not reintroduce older model names from previous thin-wall/thick-wall or basic-unit versions.

---

## 2. Core Principles

1. Use specific names over generic names.
2. Keep implementation direct and readable.
3. Split files only when the new file owns a real responsibility.
4. Avoid fake organization, wrapper-only components, bridge files, alias-only types, and helper-only indirection.
5. Delete unused code immediately.
6. Keep domain units explicit with `Inches`, `Pixels`, `Degrees`, or `Radians` suffixes.
7. Avoid duplicate source-of-truth state.
8. Extract shared logic only when it is truly the same concept.
9. Do not introduce legacy, fallback, compatibility, migration, deprecated, or bridge behavior unless explicitly required.
10. Keep all source-of-truth design data in the 3D design scene. Perspective, floor plan, and elevation are derived editor views.
11. Avoid generic `resolve` / `resolver` naming unless the code truly resolves a reference, dependency, route, ID, or path ambiguity.
12. Prefer domain-specific verbs such as `build`, `create`, `parse`, `validate`, `select`, `find`, `get`, `map`, `project`, `measure`, `sanitize`, `normalize`, `compute`, `convert`, `apply`, `update`, `commit`, or `derive`.

---

## 3. Direct Implementation Rule

When refactoring, renaming, or reorganizing code, use direct implementation only.

### 3.1 Do not use fake aliases

Bad:

```ts
type WallFootprintDraft = WallOutlineCandidate;
```

Good:

```ts
export type WallFootprintDraft = Readonly<{
  points: readonly WallFootprintDraftPoint[];
  hoverPointInches: Point3DInches | null;
  snapTarget: WallFootprintSnapTarget | null;
}>;
```

The actual type should be renamed and updated everywhere.

### 3.2 Do not use fake migrations

Bad:

```ts
// TODO: remove later
export { WallOutlineCandidate as WallFootprintDraft };
```

Good:

```txt
Rename the file.
Rename the type.
Update every import.
Update every call site.
Delete the old file/name.
```

### 3.3 Do not use compatibility fallbacks

Bad:

```ts
const activeSelection = state.activeSelection ?? state.selectedEntity;
```

Good:

```ts
const activeSelection = state.activeSelection;
```

The old field should be removed completely.

### 3.4 Do not keep bridge files

Bad:

```ts
// ObjectCatalog.tsx
export { AssemblyCatalogPanel as ObjectCatalog } from "./AssemblyCatalogPanel";
```

Good:

```txt
Delete ObjectCatalog.tsx.
Update all imports to AssemblyCatalogPanel.tsx.
```

### 3.5 Do not keep wrapper functions around renamed actions

Bad:

```ts
export function selectAssembly(id: string) {
  return selectPlacedAssembly(id);
}
```

Good:

```ts
selectPlacedAssembly(id);
```

Update all callers directly.

### 3.6 Do not keep old and new duplicate models

Bad:

```ts
type SceneCandidate = ...;
type SceneOperation = ...;
```

when both represent the same current system.

Good:

```ts
type SceneOperation = ...;
```

Use only the current model.

### 3.7 Do not add fake generic architecture

Bad:

```txt
ObjectManager
EntityRenderer
GenericItemHandler
```

Good:

```txt
AssemblyRenderer
WallLayer
SceneSelectionActions
WallFootprintDraftActions
```

Only make something generic when it truly has a shared generic responsibility.

---

## 4. Avoid Generic Resolve / Resolver Naming

Avoid using `resolve`, `resolver`, or `resolveSomething()` as a generic name for normal domain logic.

`resolve` is too vague when the function is actually doing one of these more specific jobs:

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

Bad:

```ts
resolveWallData();
resolveAssembly();
resolveCamera();
resolveConfig();
```

Bad file names:

```txt
assemblyResolver.ts
wallResolver.ts
sceneResolver.ts
```

Better:

```ts
buildAssemblyTree();
createWallFootprint();
projectWallElevation();
measurePlacedAssemblyBounds();
sanitizeWallViewableEdgeIndices();
normalizeWallFootprintWinding();
computeEditorCameraState();
mapRawAssemblyDefinition();
validateWallFootprintPoints();
```

Use `resolve` only when the function truly resolves a reference or ambiguity.

Acceptable examples:

```ts
resolveImportPath();
resolveRouteParams();
resolveDependencyGraph();
```

Even then, prefer a more specific name when possible:

```ts
findAssemblyDefinitionById();
getCatalogEntryById();
parseRouteParams();
```

Rule:

```txt
Do not use resolve as a fancy replacement for build/create/find/get/compute.
Name the function after the real responsibility.
```

---

## 5. Current Architecture Terms

### 5.1 Scene and editor

Use current scene/editor names:

```txt
DesignScene
KitchenEditorApp
KitchenEditorShell
DesignSceneRenderer
DesignSceneCanvas
PerspectiveCameraControls
FloorPlanCameraControls
ElevationCameraControls
SceneAxisGizmo
EditorCameraStates
```

Do not use old or vague names:

```txt
KitchenWorld3D
WorldManager
ObjectScene
AxisHelper
```

`SceneAxisGizmo` is preferred over `AxisHelper` because it describes the visible UI object.

### 5.2 Assembly system

Use:

```txt
AssemblyDefinition
AssemblyConfiguration
PlacedAssembly
AssemblyPlacementCandidate
BuiltAssemblyTree
BuiltPrimitiveGeometry
PrimitiveGeometryComponent
NestedAssemblyComponent
PrimitiveMaterial
AssemblyCatalogEntry
```

Meaning:

```txt
AssemblyDefinition = reusable recipe/schema for an object.
AssemblyConfiguration = selected recipe choices for a placed instance.
PlacedAssembly = actual instance in the scene.
AssemblyPlacementCandidate = complete assembly preview before commit.
BuiltAssemblyTree = derived/render-ready assembly structure.
PrimitiveGeometryComponent = lightweight engine-level geometry descriptor inside an assembly.
```

Avoid older or incorrect names:

```txt
BasicUnit as the core source model
PartObject
KitchenWorld3D
BoxAssemblyBody
ObjectCatalog
CatalogObject
CatalogItem
```

Everything user/design-facing that is placed as an object should stay within the current `PlacedAssembly` / `AssemblyDefinition` model unless the model is intentionally redesigned later.

### 5.3 Wall system

Use:

```txt
PlacedWall
WallFootprint
WallFootprintDraft
WallFootprintDraftPoint
WallFootprintDraftEdge
WallFootprintSnapTarget
WallSplitDraft
WallSplitAnchor
WallEdgeMeasurement
BuiltWall
WallViewableEdges
SelectedWallBoundaryOverlay
```

Meaning:

```txt
PlacedWall = wall instance in the scene.
WallFootprint = stable polygon/boundary shape of a wall.
WallFootprintDraft = unfinished wall drawing operation.
WallSplitDraft = unfinished wall splitting operation.
WallEdgeMeasurement = measurement data for a wall edge.
BuiltWall = derived/render-ready wall data.
```

Avoid old or incorrect names:

```txt
ThinWall
ThickWall
PlacedThickWallChain
CandidateThickWallSegment
WallOutlineCandidate
WallSelectedOutlineOverlay
outlinePointsInches
```

Use `boundary` or `footprint` for wall model data.

Good:

```ts
boundaryPointsInches
createWallFootprint()
WallFootprintDraft
SelectedWallBoundaryOverlay
```

Avoid:

```ts
outlinePointsInches
WallOutlineCandidate
WallSelectedOutlineOverlay
```

Exception: `outline` is acceptable for purely visual selection outlines, such as `SelectedAssemblyOutlineMesh`.

---

## 6. Candidate vs Draft vs Operation

Use these meanings consistently.

### Candidate

Use `Candidate` when the object is already structurally complete but not committed to the scene.

Good:

```ts
AssemblyPlacementCandidate
```

This means:

```txt
A complete assembly preview that can become a PlacedAssembly.
```

### Draft

Use `Draft` when the user is still constructing geometry or completing a multi-step operation.

Good:

```ts
WallFootprintDraft
WallSplitDraft
```

This means:

```txt
The operation is incomplete and still being edited.
```

### Operation

Use `SceneOperation` for the currently active editor workflow.

Good:

```ts
type SceneOperation =
  | AssemblyPlacementOperation
  | WallFootprintDraftOperation
  | WallSplitDraftOperation;
```

Avoid:

```ts
activeCandidate
```

when the state can contain non-candidate workflows.

Good:

```ts
activeSceneOperation
```

---

## 7. Selection Naming

Use:

```ts
activeSelection
SceneSelection
selectPlacedAssembly()
selectPlacedWall()
clearSelection()
```

Avoid:

```ts
selectedEntity
selectAssembly()
```

because:

```txt
Entity is vague.
selectAssembly() could mean selecting a definition or a placed instance.
```

Use `selectPlacedAssembly()` when selecting the instance in the scene.

---

## 8. Toolbar and Action Naming

Separate command actions from active tools.

Use:

```ts
export type EditorCameraCommandTool =
  | "zoom-out"
  | "zoom-in"
  | "fit-view";

export type EditorActiveToolbarTool =
  | "draw-wall-footprint"
  | "split-wall-footprint";

export type EditorToolbarActionId =
  | EditorCameraCommandTool
  | EditorActiveToolbarTool;
```

Do not allow impossible state like:

```ts
activeToolbarTool: "zoom-in";
```

Camera commands are not persistent active tools.

Use:

```ts
activeToolbarTool: EditorActiveToolbarTool | null;
runCameraCommand(tool: EditorCameraCommandTool): void;
setActiveToolbarTool(tool: EditorActiveToolbarTool | null): void;
```

Use kebab-case string IDs:

```txt
zoom-out
zoom-in
fit-view
draw-wall-footprint
split-wall-footprint
```

Avoid mixed casing:

```txt
drawWallFootprint
draw-wallFootprint
draw_wall_footprint
```

---

## 9. Unit and Coordinate Rules

Kitchen Editor uses inches as the domain/source-of-truth unit.

### 9.1 Inches are domain/model units

Use `Inches` for:

```txt
scene coordinates
object dimensions
wall geometry
snapping
collision
measurement
saved design data
floor plan viewBox geometry
elevation projection
camera targets/centers in world space
```

Good:

```ts
Point3DInches
Point2DInches
Size3DInches
worldPositionInches
cameraTargetInches
cameraPositionInches
distanceFromFloorInches
boundaryPointsInches
heightInches
widthInches
depthInches
thicknessInches
```

Avoid:

```ts
position
size
width
height
depth
thickness
```

when those values carry domain units.

### 9.2 Pixels are UI/browser/render-boundary units

Use `Pixels` for:

```txt
pointer client coordinates
canvas size
screen drag distance
CSS/SVG visual sizes
hit thresholds
rendered stroke widths
marker radii
DOM/client measurements
```

Good:

```ts
Point2DPixels
Size2DPixels
canvasSizePixels
pointerPositionPixels
dragDeltaPixels
hitThresholdPixels
hoverRadiusPixels
strokeWidthPixels
```

### 9.3 Convert at boundaries

Convert pixels to inches as soon as pointer/browser data enters domain logic.

Convert inches to pixels only at render/UI boundaries.

Good:

```ts
const pointerWorldPointInches = convertPointerPixelsToWorldInches(...);
```

Avoid passing pixel values deep into domain geometry.

### 9.4 Current 3D axis rule

Use the current 3D world convention:

```txt
X = horizontal width axis
Y = depth/front axis
Z = vertical height axis
front = +Y
floor/ground = zInches 0
worldPositionInches = placed assembly center
```

Door/drawer handles protrude outward in `+Y` and should stay inside the parent front face in `X/Z` unless the specific assembly intentionally exposes different behavior.

### 9.5 Function names and units

Function names do not always need `Inches` when the parameter and return types already make the unit clear.

Good:

```ts
measurePlacedAssemblyBounds(placedAssembly);
createWallFootprint(boundaryPointsInches);
```

Use unit suffixes in function names mainly when converting or when both inch and pixel versions exist.

Good:

```ts
convertPixelsToInches();
convertInchesToPixels();
createPointerWorldPointInches();
```

---

## 10. File and Folder Naming Rules

### 10.1 React component files

Use PascalCase:

```txt
AssemblyCatalogPanel.tsx
AssemblyRenderer.tsx
WallPropertiesPanel.tsx
SelectedWallBoundaryOverlay.tsx
SceneAxisGizmo.tsx
```

### 10.2 Logic files

Use camelCase:

```txt
buildAssemblyTree.ts
measureAssemblyBounds.ts
createWallFootprint.ts
wallFootprintDraftSnapping.ts
formatInchesLabel.ts
useSceneFitFrame.ts
```

### 10.3 Folder names

Use kebab-case:

```txt
catalog-panel
inspector-panel
floor-plan
elevation
properties-panel
footprint-draft
split-draft
draft-guides
```

### 10.4 `.ts` vs `.tsx` responsibilities

Use `.ts` for:

```txt
types
store actions
pure geometry
build/measure/project/validate logic
editing logic
hit testing
pointer conversion
camera state helpers
snapping/reference guide logic
```

Use `.tsx` for React components only:

```txt
render layers
meshes
markers
guides
panels
toolbars
canvas/editor components
```

Do not put pure geometry/build logic inside React components when it can live in `engine/...` or a focused `.ts` feature helper.

---

## 11. Project Folder Organization

Use this broad structure:

```txt
src/
  core/
  engine/
  features/
```

### 11.1 `core/`

Use for global pure logic and types that do not know about Kitchen Editor UI.

Examples:

```txt
core/geometry
core/units
core/math
core/types
```

Rules:

```txt
No React.
No Zustand.
No feature UI imports.
No kitchen editor UI assumptions.
Keep pure and reusable.
```

### 11.2 `engine/`

Use for source-of-truth scene, assembly, wall, geometry, validation, and domain logic.

Examples:

```txt
engine/assemblies
engine/walls
engine/scene
engine/primitive-geometry
```

Rules:

```txt
Engine can know about domain models.
Engine should not depend on React components.
Engine should avoid browser-only APIs.
Engine owns source-of-truth scene logic.
Engine owns validation and geometry logic.
```

### 11.3 `features/kitchen-editor/`

Use for Kitchen Editor UI, editor views, rendering, interaction, panels, toolbar, and React-specific behavior.

Examples:

```txt
features/kitchen-editor/catalog-panel
features/kitchen-editor/toolbar
features/kitchen-editor/inspector-panel
features/kitchen-editor/editors
features/kitchen-editor/rendering
features/kitchen-editor/interaction
features/kitchen-editor/properties-panel
features/kitchen-editor/shared
```

Rules:

```txt
React components live here.
UI layout lives here.
Three.js / React Three Fiber render integration lives here.
Pointer interaction surfaces live here.
UI panels and controls live here.
```

---

## 12. Parallel Folder Structure

Keep parallel structures for major domains.

### 12.1 Rendering

Use:

```txt
features/kitchen-editor/rendering/
  assemblies/
    AssemblyLayer.tsx
    AssemblyRenderer.tsx
    AssemblyPrimitiveMesh.tsx
    AssemblyPlacementCandidateRenderer.tsx
    SelectedAssemblyOutlineLayer.tsx
    SelectedAssemblyOutlineMesh.tsx

  walls/
    WallLayer.tsx
    WallMesh.tsx
    WallMeasurementGuides.tsx
    WallVertexMarkers.tsx
    WallReferenceGuides.tsx
    WallAngleGuides.tsx
    WallFootprintDraftRenderer.tsx
    WallSplitDraftRenderer.tsx
    SelectedWallBoundaryOverlay.tsx
    wallRenderingGeometry.ts
```

Do not mix assembly rendering files directly with wall rendering files.

### 12.2 Interaction

Use:

```txt
features/kitchen-editor/interaction/
  assemblies/
    AssemblyDragSurface.tsx
    assemblyDragPointer.ts

  walls/
    WallFootprintDraftSurface.tsx
    WallSplitDraftSurface.tsx
    wallGroundPlanePointer.ts
```

The interaction structure should mirror rendering:

```txt
rendering/assemblies
rendering/walls
interaction/assemblies
interaction/walls
```

### 12.3 Properties panel

Use:

```txt
features/kitchen-editor/properties-panel/
  shared/
    PropertyNumberField.tsx
    PropertySection.tsx
    propertyPanelFormatting.ts

  assemblies/
    AssemblyPropertiesPanel.tsx
    AssemblyPlacementSection.tsx
    AssemblyDimensionSection.tsx
    AssemblyOptionGroupsSection.tsx

  walls/
    WallPropertiesPanel.tsx
    WallHeightSection.tsx
    WallViewableEdgesSection.tsx
```

Each panel should compose smaller sections.

Avoid large panel files that directly own every input row.

---

## 13. Component Naming Glossary

### Layer

A `Layer` coordinates a collection or render group.

Good:

```txt
AssemblyLayer
WallLayer
SelectedAssemblyOutlineLayer
```

### Renderer

A `Renderer` renders a complete domain object, draft, or candidate group.

Good:

```txt
AssemblyRenderer
AssemblyPlacementCandidateRenderer
WallFootprintDraftRenderer
WallSplitDraftRenderer
DesignSceneRenderer
```

### Mesh

Use `Mesh` for a specific 3D geometry mesh.

Good:

```txt
AssemblyPrimitiveMesh
WallMesh
```

### Markers

Use `Markers` for point, corner, endpoint, hover, or snap target visuals.

Good:

```txt
WallVertexMarkers
```

### Guides

Use `Guides` for measurement, alignment, reference, snapping, and angle helper visuals.

Good:

```txt
WallMeasurementGuides
WallReferenceGuides
WallAngleGuides
```

### Panel

Use `Panel` for UI sections/panels.

Good:

```txt
KitchenEditorInspectorPanel
AssemblyCatalogPanel
AssemblyPropertiesPanel
WallPropertiesPanel
```

Avoid vague names:

```txt
Indicator
Thing
Shape for complete objects
PreviewLayer for committable candidates
Highlight for selected/candidate render state
```

Use `Candidate`, not `Preview`, when the object can be committed or canceled.

---

## 14. Scene Store Organization

Use one Zustand store, but split actions by responsibility.

### 14.1 Store composition file

`designSceneStore.ts` should be small and compose state/actions.

Good:

```ts
export const useDesignSceneStore = create<DesignSceneStore>((set, get) => ({
  ...createInitialDesignSceneStoreState(),
  ...createSceneViewActions(get, set),
  ...createWallElevationNavigationActions(get, set),
  ...createSceneToolbarActions(get, set),
  ...createEditorCameraStateActions(get, set),
  ...createAssemblyPlacementActions(get, set),
  ...createSceneSelectionActions(get, set),
  ...createAssemblyDragActions(get, set),
  ...createAssemblyEditingActions(get, set),
  ...createWallFootprintDraftActions(get, set),
  ...createWallSplitDraftActions(get, set),
  ...createWallEditingActions(get, set),
  ...createSceneInteractionActions(get, set),
}));
```

The store file should not become a large ownership hub.

### 14.2 Action file ownership

Use action files like:

```txt
engine/scene/actions/
  sceneViewActions.ts
  sceneToolbarActions.ts
  editorCameraStateActions.ts
  sceneSelectionActions.ts
  assemblyPlacementActions.ts
  assemblyDragActions.ts
  assemblyEditingActions.ts
  wallFootprintDraftActions.ts
  wallSplitDraftActions.ts
  wallEditingActions.ts
  wallElevationNavigationActions.ts
  sceneInteractionActions.ts
```

Each file should own one responsibility.

Examples:

```txt
sceneSelectionActions.ts
- selectPlacedAssembly()
- selectPlacedWall()
- clearSelection()

assemblyPlacementActions.ts
- startAssemblyPlacementCandidate()
- updateAssemblyCandidateWorldPosition()
- commitAssemblyPlacementCandidate()
- cancelActiveSceneOperation()

wallFootprintDraftActions.ts
- updateWallFootprintDraftHover()
- clickWallFootprintDraftPoint()
- exitWallFootprintDraftTool()

wallSplitDraftActions.ts
- updateWallSplitDraftHover()
- clickWallSplitDraftPoint()
- exitWallSplitDraftTool()

sceneInteractionActions.ts
- Escape/cancel/clear interaction behavior
```

### 14.3 Store state should not contain unused future placeholders

Bad:

```ts
{
  kind: "assembly-placement";
  mode: "create";
}
```

if `mode` is not read anywhere.

Good:

```ts
{
  kind: "assembly-placement";
}
```

Only add fields when the code uses them.

---

## 15. Camera State Guidelines

Each editor view should remember its camera state.

### 15.1 Required behavior

When the user switches between:

```txt
Perspective
Floor Plan
Elevation
```

each view should restore its previous camera position/target/zoom.

Example:

```txt
1. User pans Floor Plan.
2. User switches to Perspective.
3. User switches back to Floor Plan.
4. Floor Plan should show the same previous camera view.
```

### 15.2 Camera state belongs in editor state

Do not keep camera memory only in local component refs.

Bad:

```ts
const rememberedCamera = useRef(...);
```

Good:

```ts
editorCameraStates.floorPlan
editorCameraStates.perspective
editorCameraStates.elevation
```

The store should expose:

```ts
updatePerspectiveCameraState()
updateFloorPlanCameraState()
updateElevationCameraState()
```

### 15.3 Camera commands should be view-specific

Camera commands should include the active editor view.

Good:

```ts
export type EditorCameraCommand = Readonly<{
  id: number;
  editorView: KitchenEditorView;
  tool: EditorCameraCommandTool;
}>;
```

Each camera control should ignore commands meant for another view.

Good:

```ts
if (cameraCommand.editorView !== "floor-plan") {
  return;
}
```

This prevents stale or wrong-view commands.

### 15.4 Fit view should be explicit

Do not auto-fit every time a view remounts.

Good:

```txt
Fit view runs when the user clicks fit-view.
Switching back to a view restores stored camera state.
```

Use a shared hook for scene fit frame logic:

```txt
features/kitchen-editor/editors/shared/useSceneFitFrame.ts
```

Good:

```ts
const sceneFitFrame = useSceneFitFrame();
```

---

## 16. Assembly Definition Rules

### 16.1 Recipe/instance split

`AssemblyDefinition` is the reusable recipe/schema. It defines:

```txt
name
catalog category
dimension controls
option groups
build(context)
```

`AssemblyConfiguration` stores selected recipe choices:

```txt
sizeInches
optionValues
```

`PlacedAssembly` stores the placed instance:

```txt
definitionId
configuration
worldPositionInches
rotationDegrees
```

Universal placement data does not belong in `AssemblyDefinition`, except definition-level defaults such as default distance from floor when needed.

### 16.2 Child option reuse

Child assembly definitions should own their own option definitions.

Examples:

```txt
Door owns door handle type/position choices.
Drawer owns drawer handle type/position choices.
Box/cabinet definitions may expose, map, or narrow those child options.
```

Do not duplicate child option arrays manually when the child definition already owns the same choices.

Keep this explicit and readable. Do not introduce a broad nested-option abstraction unless the same pattern becomes real and repeated across multiple definitions.

---

## 17. Wall Engine Organization

Use responsibility-based folders.

```txt
engine/walls/
  wallTypes.ts
  wallBounds.ts
  wallBuilding.ts
  wallEditing.ts

  footprint/
    wallFootprintTypes.ts
    wallFootprintGeometry.ts
    wallFootprintValidation.ts
    wallFootprintFactory.ts
    wallFootprintMeasurements.ts

  footprint-draft/
    wallFootprintDraftTypes.ts
    wallFootprintDraftFactory.ts
    wallFootprintDraftSelectors.ts
    wallFootprintDraftEditing.ts
    wallFootprintDraftSnapping.ts
    wallFootprintDraftSnapTargets.ts
    wallFootprintDraftGuideSnapping.ts

  split-draft/
    wallSplitDraftTypes.ts
    wallSplitDraftFactory.ts
    wallSplitDraftAnchors.ts
    wallSplitDraftGuides.ts
    wallSplitDraftGeometry.ts
    wallSplitDraftEditing.ts

  elevation/
    wallElevationGeometry.ts
    wallViewableEdges.ts

  draft-guides/
    wallDraftGuideTypes.ts
    wallDraftGuides.ts
```

### 17.1 Stable footprint logic

`footprint/` owns stable wall polygon logic.

Examples:

```ts
createWallFootprint();
normalizeWallFootprintWinding();
getClosedPolygonEdges();
getPolygonAreaSquareInches();
projectPointToSegment();
isPointInsidePolygon();
removeDuplicateAdjacentPoints();
validateWallFootprintPoints();
getWallFootprintEdgeMeasurements();
```

### 17.2 Footprint draft logic

`footprint-draft/` owns wall drawing behavior.

Examples:

```ts
createEmptyWallFootprintDraft();
updateWallFootprintDraftHover();
clickWallFootprintDraftPoint();
getWallFootprintDraftOrderedPoints();
snapWallFootprintDraftPoint();
```

Split snapping into real responsibilities:

```txt
wallFootprintDraftSnapping.ts
- high-level orchestration

wallFootprintDraftSnapTargets.ts
- draft point / placed wall point / placed wall edge target finding

wallFootprintDraftGuideSnapping.ts
- horizontal/vertical/angle guide snapping
```

Avoid one very large snapping file that owns every detail.

### 17.3 Split draft logic

`split-draft/` owns wall splitting behavior.

Examples:

```ts
createWallSplitDraftForTarget();
findWallSplitAnchor();
createWallSplitReferenceGuides();
splitWallFootprintByStraightCut();
updateWallSplitDraftHover();
clickWallSplitDraftPoint();
```

### 17.4 Elevation/viewable edge logic

`elevation/` owns view-specific wall elevation logic.

Examples:

```ts
getPlacedWallElevationSides();
getPlacedWallActiveElevationSide();
getPlacedWallViewableEdgeIndices();
sanitizeWallViewableEdgeIndices();
getPlacedWallFirstViewableEdgeIndex();
```

UI should use engine selectors instead of duplicating fallback/default behavior.

Good:

```ts
const viewableEdgeIndices = getPlacedWallViewableEdgeIndices(placedWall);
```

Avoid:

```ts
const viewableEdgeIndices =
  placedWall.viewableEdgeIndices ?? edgeMeasurements.map(...);
```

---

## 18. Render State Rules

Use one render state when visual states can conflict.

Good:

```ts
type AssemblyRenderState =
  | "default"
  | "selected"
  | "valid-candidate"
  | "invalid-candidate";
```

or, when validity is handled separately:

```ts
type RenderState = "default" | "selected" | "candidate";
```

Avoid conflicting booleans:

```tsx
<Component selected candidate invalid />
```

The code should not allow impossible visual combinations.

---

## 19. Shared Utility Rules

Shared helpers are allowed only when they own a real repeated responsibility.

### 19.1 Good shared helper

Good:

```ts
formatInchesLabel(valueInches);
```

because the same inches label formatting is used across multiple UI/rendering areas.

Good location:

```txt
features/kitchen-editor/shared/formatInchesLabel.ts
```

### 19.2 Good shared hook

Good:

```ts
useSceneFitFrame();
```

because multiple camera controls need the same scene measurement logic.

Good location:

```txt
features/kitchen-editor/editors/shared/useSceneFitFrame.ts
```

### 19.3 Bad helper

Avoid vague helper files:

```txt
utils.ts
helpers.ts
wallHelpers.ts
objectUtils.ts
dataUtils.ts
```

Prefer specific ownership:

```txt
wallFootprintGeometry.ts
wallFootprintDraftSnapping.ts
wallSplitDraftGeometry.ts
assemblyPlacementActions.ts
sceneSelectionActions.ts
formatInchesLabel.ts
```

---

## 20. Constants and IDs

### 20.1 Constants should stay local until truly shared

Bad extraction:

```txt
shared SIZE_8 constant because two unrelated things happen to be 8
```

Good extraction:

```txt
same snap threshold used by the same wall draft snapping system
same minimum wall length used by validation and editing logic
```

### 20.2 Unit-carrying constants need unit suffixes

Good:

```ts
WALL_FOOTPRINT_SNAP_THRESHOLD_INCHES
MIN_WALL_LENGTH_INCHES
HOVER_RADIUS_PIXELS
ROTATION_STEP_DEGREES
```

Avoid:

```ts
SNAP_THRESHOLD
MIN_LENGTH
HOVER_RADIUS
ROTATION_STEP
```

### 20.3 Do not use unsafe ID generation for persistent scene data

Avoid:

```ts
Date.now();
Math.random();
```

for persistent design IDs.

Use the project ID utility or the established `crypto.randomUUID()` pattern.

This matters for import/export, undo/redo, AI JSON, and stable scene data.

---

## 21. Raw Definition and Error Handling Rules

Do not silently hide invalid catalog/definition data.

### 21.1 No silent numeric fallback

Bad:

```ts
return context.componentSizeInches?.widthInches ?? 0;
```

Good:

```ts
if (context.componentSizeInches === undefined) {
  throw new Error(
    `Raw assembly reference "${reference}" requires component size context.`,
  );
}

return context.componentSizeInches.widthInches;
```

Returning `0` can create invalid geometry and hide the real bug.

### 21.2 Throw when required context is missing

When a raw expression references component size, component size must exist.

Good component-size references:

```txt
component.size.widthInches
component.size.depthInches
component.size.heightInches
```

should require:

```ts
context.componentSizeInches
```

No hidden fallback.

### 21.3 Future JSON validation

For future AI/import/export work, raw JSON should be validated at the boundary.

Recommended future flow:

```txt
JSON import
-> unknown data
-> parse/validate into RawAssemblyDefinition
-> use in registry
```

Do not assume JSON data is valid just because TypeScript accepts the import.

Good future names:

```ts
parseRawAssemblyDefinition();
assertRawAssemblyDefinition();
```

This should be real validation, not a fake wrapper.

---

## 22. UI Label Rules

UI wording should match engine/domain language.

Use:

```txt
Selected Assembly
Delete assembly
Selected Wall
Delete wall
Active operation
Wall footprint draft
Wall split draft
Assembly definitions
```

Avoid:

```txt
Selected Object
Delete object
Selected item
Catalog object
Wall outline
Candidate
```

unless the term is accurate in that exact context.

---

## 23. Renderer Naming Rules

Renderer names should describe what they render and which domain they belong to.

Good:

```txt
AssemblyRenderer
AssemblyPrimitiveMesh
AssemblyPlacementCandidateRenderer
SelectedAssemblyOutlineMesh
WallMesh
WallMeasurementGuides
WallFootprintDraftRenderer
WallSplitDraftRenderer
SelectedWallBoundaryOverlay
SceneAxisGizmo
```

Avoid vague names:

```txt
PrimitiveGeometryMesh
AxisHelper
ObjectRenderer
ItemLayer
```

unless they truly render generic primitives/items across multiple domains.

---

## 24. Interaction Naming Rules

Interaction files should describe the interaction surface or pointer conversion they own.

Good:

```txt
AssemblyDragSurface.tsx
assemblyDragPointer.ts
WallFootprintDraftSurface.tsx
WallSplitDraftSurface.tsx
wallGroundPlanePointer.ts
```

Use shared interaction names when the helper is used by multiple wall interactions.

Example:

```txt
wallGroundPlanePointer.ts
```

is better than:

```txt
wallFootprintDraftPointer.ts
```

if both footprint draft and split draft use it.

---

## 25. Catalog Naming Rules

Catalog language should use `Entry` for registered catalog rows and `Definition` for reusable assembly recipes.

Use:

```ts
KitchenEditorRawCatalogEntry
KitchenEditorAssemblyCatalogEntry
kitchenEditorRawCatalogEntries
kitchenEditorAssemblyCatalogEntries
AssemblyCatalogPanel
AssemblyCatalogGrid
AssemblyCatalogCard
AssemblyCatalogSelector
AssemblyCatalogCategoryTabs
```

Avoid:

```ts
CatalogItem
CatalogObject
ObjectCatalog
```

because the catalog currently selects assembly definitions, not generic objects.

---

## 26. Large File Review Rules

A file should be split when it owns multiple responsibilities.

Signs a file is too large:

```txt
It has many private functions unrelated to one clear job.
It handles both orchestration and detailed geometry.
It handles both UI composition and input-field rendering.
It handles both state updates and low-level math.
It becomes hard to name with one specific responsibility.
```

Example split:

```txt
wallFootprintDraftSnapping.ts
```

should not own:

```txt
snap orchestration
target searching
wall edge projection
angle snapping
guide snapping
reference point collection
snap result construction
```

Better:

```txt
wallFootprintDraftSnapping.ts
wallFootprintDraftSnapTargets.ts
wallFootprintDraftGuideSnapping.ts
```

---

## 27. Import and Export Rules

Prefer direct imports from the owning file.

Good:

```ts
import { AssemblyRenderer } from "./AssemblyRenderer";
import { createWallFootprint } from "@/engine/walls/footprint/wallFootprintFactory";
```

Avoid re-export-only files and barrel files unless the surrounding folder already consistently uses them.

When moving or renaming:

```txt
1. Delete old file.
2. Update imports directly.
3. Do not keep a bridge file.
4. Do not export NewName as OldName.
```

---

## 28. Verification Checklist Before Returning Code

Run the relevant checks available in the environment.

At minimum:

```txt
TypeScript / TSX syntax check when full project build is unavailable
npm run lint when full project config exists
npm run build when full project config exists
```

Search for suspicious terms:

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
```

Also check:

```txt
unused imports
unused variables
unused exports
alias-only types
helpers used once with no meaningful domain value
wrapper components that only pass props
unit-carrying names missing Inches/Pixels/Degrees/Radians
generic resolve/resolver naming
fake fallbacks
old-name re-exports
bridge files
```

Not every match is automatically wrong, but every match should be reviewed and justified.

---

## 29. Manual Review Checklist

Before finishing a feature or cleanup, verify:

```txt
[ ] The work uses the latest base archive.
[ ] Every new file owns a real responsibility.
[ ] No old thin-wall/thick-wall terminology was reintroduced.
[ ] No old WallOutlineCandidate / ObjectCatalog / selectedEntity terminology was reintroduced.
[ ] Domain values use Inches/Degrees names.
[ ] Browser/render-boundary values use Pixels names.
[ ] Assembly definitions remain recipe/configuration/placed-instance separated.
[ ] Candidate vs Draft vs Operation terms are used correctly.
[ ] Toolbar command actions are separate from active tools.
[ ] Camera state is stored per editor view.
[ ] Camera commands are view-specific.
[ ] UI labels match current domain language.
[ ] Parent assembly definitions do not duplicate child option choices unnecessarily.
[ ] No fake helpers, fake wrappers, aliases, fallbacks, or bridge exports were added.
[ ] No generic resolve/resolver naming was added unless truly justified.
[ ] Tests/checks were run or limitations were stated clearly.
```

---

## 30. Recommended Cleanup Workflow

Use this workflow when doing future refactors.

### Step 1: Identify the real domain concept

Ask:

```txt
Is this an assembly, wall, draft, operation, selection, catalog entry, camera state, renderer, mesh, marker, guide, or panel?
```

Name it based on the answer.

### Step 2: Rename directly

Do:

```txt
Rename file.
Rename type/component/function.
Update imports.
Update call sites.
Delete old file/name.
```

Do not add:

```txt
aliases
bridges
compatibility wrappers
fallback reads
old-name exports
fake migrations
```

### Step 3: Split by responsibility

A split is valid only when each new file has a clear owner.

Good split:

```txt
wallFootprintDraftSnapping.ts
wallFootprintDraftSnapTargets.ts
wallFootprintDraftGuideSnapping.ts
```

Bad split:

```txt
wallStuff.ts
wallHelpers.ts
wallUtils.ts
```

### Step 4: Preserve behavior unless the task explicitly changes behavior

For cleanup-only work:

```txt
Do not change user-facing behavior.
Do not add future systems.
Do not implement unrelated features.
```

For behavior changes, state the intended behavior clearly.

Example:

```txt
Camera state should persist per editor view.
```

### Step 5: Verify old names are gone

Search for old names after the change.

Examples:

```txt
WallOutlineCandidate
selectedEntity
ObjectCatalog
KitchenEditorRightPanel
EditorToolbarTool
wallFootprintDraftPointer
outlinePointsInches
resolve
resolver
```

If old names remain, either:

```txt
1. finish the direct rename, or
2. justify why the term is still correct in that exact context.
```

---

## 31. Final Standard

A good Kitchen Editor change should feel direct:

```txt
core/ = pure global math, geometry, units, and shared types
engine/ = source models, geometry, scene state, builders, validation, and editing logic
features/kitchen-editor/rendering/ = 3D visual layers, renderers, meshes, markers, and guides
features/kitchen-editor/interaction/ = pointer and canvas interactions
features/kitchen-editor/properties-panel/ = selected assembly/wall editing UI
features/kitchen-editor/catalog-panel/ = assembly catalog browsing UI
features/kitchen-editor/shared/ = truly shared feature-level utilities
```

If a file, type, helper, or component does not have a clear responsibility, rename it, move it, inline it, or delete it.

The ideal future code should read like the product model:

```txt
AssemblyDefinition creates PlacedAssembly.
PlacedAssembly can be previewed as AssemblyPlacementCandidate.
WallFootprintDraft creates WallFootprint.
WallSplitDraft edits a PlacedWall footprint.
SceneOperation tracks the active workflow.
SceneSelection tracks the selected placed thing.
EditorCameraStates remember each editor view.
Perspective, Floor Plan, and Elevation are derived views of the same design scene.
```
