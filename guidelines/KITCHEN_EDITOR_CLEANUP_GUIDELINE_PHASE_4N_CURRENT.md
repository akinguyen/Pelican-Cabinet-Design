# Kitchen Editor Cleanup Guideline - Phase 4N Current

This guideline reflects the current `src` package after the cleanup and performance phases through Phase 4N:

```txt
Phase 1  - unused-file cleanup
Phase 2  - assembly object alignment refactor
Phase 3  - wall-guide math cleanup
Phase 4A - safe render memoization
Phase 4B - assembly interaction subscription cleanup
Phase 4C - selection lookup / render map optimization
Phase 4D - React memo boundary cleanup
Phase 4E - geometry disposal audit
Phase 4F - pointer callback stability cleanup
Phase 4G - store selector consolidation audit
Phase 4H - scene fit-frame / camera recomputation cleanup
Phase 4I - render visibility gating cleanup
Phase 4J - derived cutout source narrowing
Phase 4K - derived assembly tree cache cleanup
Phase 4L - selected / hover render-state narrowing
Phase 4M - active operation render-state cleanup
Phase 4N - properties / designer panel selector cleanup
```

Use this as a maintenance and implementation reference. Do not use it as a reason to rewrite unrelated working code. Cleanup should preserve working behavior unless the task explicitly asks to change behavior.

## 1. Source-of-truth model

`DesignScene` remains the source of truth.

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

```txt
editorDesignScene
designerDesignScene
perspectiveDesignScene
floorPlanDesignScene
elevationDesignScene
```

Current source-of-truth files include:

```txt
engine/scene/designSceneTypes.ts
engine/scene/designSceneStore.ts
engine/scene/designSceneStoreTypes.ts
engine/scene/createInitialDesignSceneStoreState.ts
engine/scene/sceneSelectionTypes.ts
engine/scene/sceneOperationTypes.ts
engine/scene/sceneViewModeTypes.ts
engine/scene/sceneCameraStateTypes.ts
```

## 2. Engine and feature dependency boundary

`src/engine` must not import from `src/features`.

The dependency direction is:

```txt
features/kitchen-editor -> engine -> core/shared primitives
```

Feature UI may import engine scene, wall, countertop, primitive geometry, and assembly types. Engine files must not import feature UI, React components, renderer code, or store hooks from the feature layer.

Current engine-owned placement/alignment/cutout files include:

```txt
engine/assemblies/placement/assemblyPlacementFeedback.ts
engine/assemblies/placement/assemblyPlacementGeometry.ts
engine/assemblies/placement/assemblyPlacementPlanGeometry.ts
engine/assemblies/placement/assemblyPlacementTypes.ts
engine/assemblies/placement/assemblyRotationSnapping.ts
engine/assemblies/placement/assemblyObjectAlignmentGuides.ts
engine/assemblies/placement/alignment/*
engine/countertops/*
engine/walls/*
engine/scene/derivedCutoutAssemblySources.ts
```

Do not move React/render memoization helpers into `engine`. Render concerns belong in `features/kitchen-editor/rendering` or editor feature folders.

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
read selected assembly / wall summaries
use AI designer chat
```

Blocked in designer mode:

```txt
place assembly candidate
drag assembly
rotate assembly
edit assembly dimensions/options/position/rotation
delete assembly
draw wall segment
edit wall height/thickness
delete wall
commit active scene operation
```

Store actions and interaction components must both enforce this. Do not only hide buttons.

Use the specific helper for manual scene editing:

```ts
canManuallyEditScene(workspaceMode)
```

Avoid generic permission wrappers unless the permission model grows enough to justify them.

## 4. Current wall system responsibilities

The current wall system has these important behavior groups:

```txt
committed wall segment rendering
wall segment draft drawing guides
wall plan measurement guides
derived wall openings from placed assemblies
wall elevation view-zone / padding-mask behavior
wall segment selection and editing
```

Main wall rendering files:

```txt
features/kitchen-editor/rendering/walls/WallLayer.tsx
features/kitchen-editor/rendering/walls/WallSegmentMesh.tsx
features/kitchen-editor/rendering/walls/WallSegmentDraftRenderer.tsx
features/kitchen-editor/rendering/walls/WallPlanMeasurementGuides.tsx
features/kitchen-editor/rendering/walls/WallElevationViewZoneOverlay.tsx
features/kitchen-editor/rendering/walls/WallSegmentActiveOverlay.tsx
features/kitchen-editor/rendering/walls/WallSegmentVertexMarkers.tsx
features/kitchen-editor/rendering/walls/WallAnchorRing.tsx
features/kitchen-editor/rendering/walls/guides/wallPlanGuideGeometry.ts
features/kitchen-editor/rendering/walls/wallRenderingGeometry.ts
features/kitchen-editor/rendering/walls/wallSegmentRenderColors.ts
```

`WallLayer.tsx` should compose responsibilities without owning all details. It may:

- memoize committed and preview wall segment geometry;
- build wall segment render items using map lookups;
- index derived wall openings by wall segment id;
- mount wall draft rendering only during active floor-plan wall drawing;
- pass opening-aware `wallSegment` data into `WallSegmentMesh`;
- preserve `WallElevationViewZoneOverlay`.

Do not simplify wall geometry to a plain prism if derived openings exist.

## 5. Derived wall opening rules

Wall openings are derived from placed assemblies that declare wall cutout/elevation-projection behavior.

Current files:

```txt
engine/walls/openings/deriveWallOpeningsFromAssemblies.ts
engine/walls/openings/wallOpeningCutGeometry.ts
engine/walls/openings/wallOpeningFaceAxes.ts
engine/scene/derivedCutoutAssemblySources.ts
features/kitchen-editor/rendering/walls/WallSegmentMesh.tsx
features/kitchen-editor/rendering/walls/wallRenderingGeometry.ts
```

Current model:

- Wall openings are not manually edited standalone objects in this codebase.
- Wall openings are generated from relevant placed assemblies and positioned placement candidates.
- `WallSegmentMesh.tsx` must keep using `createWallSegmentGeometry({ segmentBody, openings })` so openings continue to cut/render correctly.
- Derived opening generation should receive only `wallOpeningAssemblies`, not all placed assemblies.
- Candidate openings should be included only when the positioned candidate can produce a wall opening.

Avoid:

```txt
scanning every placed assembly for wall openings when a narrowed wallOpeningAssemblies list is available
reintroducing old manual WallOpeningOverlay / WallOpeningDraftOverlay files unless the manual editing feature returns
moving wall opening derivation into React render components
```

## 6. Countertop opening and cutout rules

Countertop openings are derived from countertop slab hosts plus assemblies that declare countertop cutout behavior.

Current files:

```txt
engine/countertops/countertopDefinitionIds.ts
engine/countertops/deriveCountertopOpeningsFromAssemblies.ts
engine/countertops/applyCountertopOpeningsToAssemblyTree.ts
engine/countertops/countertopOpeningGeometry.ts
engine/countertops/countertopOpeningTypes.ts
engine/countertops/countertopRemovedAreaGeometry.ts
engine/countertops/countertopHoleGeometryStrategy.ts
engine/scene/derivedCutoutAssemblySources.ts
features/kitchen-editor/rendering/assemblies/useAssemblyRenderItems.ts
```

Rules:

- Keep countertop cutout math in `engine/countertops`.
- Keep countertop slab definition id in `countertopDefinitionIds.ts`.
- `deriveCountertopOpeningsFromAssemblies` should receive `countertopOpeningAssemblies`, not all placed assemblies.
- `applyHostCountertopOpeningsToAssemblyTree` should apply host openings without recursively checking unrelated opening maps at every child.
- Do not change cutout shape behavior during performance cleanup.
- Do not use rendering-only object bounds as the source of cutout truth when engine cutout behavior is available.

## 7. Wall elevation view-zone and padding-mask rules

Current selected wall elevation behavior is based on a selected wall face/view-zone and a DOM/overlay padding mask.

Current files:

```txt
engine/walls/wallElevationCameraFrame.ts
engine/walls/wallElevationFaceSideMemory.ts
engine/walls/wallElevationViewZone.ts
engine/walls/wallSegmentElevation.ts
engine/walls/wallSegmentElevationNavigation.ts
engine/walls/wallSegmentElevationTypes.ts
features/kitchen-editor/editors/elevation/ElevationCameraControls.tsx
features/kitchen-editor/editors/elevation/ElevationViewPaddingMaskOverlay.tsx
features/kitchen-editor/editors/elevation/WallElevationNavigator.tsx
features/kitchen-editor/editors/elevation/elevationViewPaddingMaskFrame.ts
features/kitchen-editor/rendering/walls/WallElevationViewZoneOverlay.tsx
```

Rules:

- Preserve wall-face side memory.
- Preserve wall elevation navigator behavior.
- Preserve the padding mask overlay behavior.
- Locked wall-face elevation camera should not compute a full scene fit frame unnecessarily.
- When wall geometry changes, elevation target frame, view-zone overlay, camera frame, and mask should derive from updated geometry.
- Do not reintroduce `ElevationViewClippingPlanes.tsx` unless there is a specific feature decision to return to clipping planes.

## 8. Wall draft guide rendering rules

`WallSegmentDraftRenderer.tsx` owns floor-plan visual feedback while drawing a wall segment.

It may render:

```txt
active centerline preview
horizontal/vertical alignment guide
draft length measurement line
angle guide labels around the draft start point
anchor rings
```

Keep these as rendering-only responsibilities. Draft state should still come from scene operation and wall segment draft actions.

Shared wall plan guide math belongs in:

```txt
features/kitchen-editor/rendering/walls/guides/wallPlanGuideGeometry.ts
```

This helper currently owns reusable wall plan guide math such as:

```txt
getNormalizedPlanDirection
getPlanDistanceInches
getPlanMidpoint
getReadablePlanLabelRotationDegrees
normalizeDegrees
convertDegreesToRadians
offsetPlanPoint
```

Do not duplicate this math back into `WallPlanMeasurementGuides.tsx` or `WallSegmentDraftRenderer.tsx`.

## 9. Plan measurement rendering rules

Reusable plan measurement UI belongs in:

```txt
features/kitchen-editor/rendering/shared/PlanMeasurementLine.tsx
```

This component should stay generic. It should not know about walls, assemblies, openings, selection, or scene store state.

Feature-specific guide renderers should prepare domain-specific measurement objects and pass them into `PlanMeasurementLine`.

Current users include:

```txt
features/kitchen-editor/rendering/walls/WallPlanMeasurementGuides.tsx
features/kitchen-editor/rendering/walls/WallSegmentDraftRenderer.tsx
features/kitchen-editor/rendering/assemblies/AssemblyObjectAlignmentGuides.tsx
```

Keep inches in guide inputs. Convert to pixels only at browser/UI boundaries when necessary.

## 10. Assembly placement and object alignment rules

Assembly placement and object alignment remain engine behavior, not renderer-only behavior.

Public alignment entry:

```txt
engine/assemblies/placement/assemblyObjectAlignmentGuides.ts
```

Focused alignment implementation files:

```txt
engine/assemblies/placement/alignment/assemblyObjectAlignmentConstants.ts
engine/assemblies/placement/alignment/assemblyObjectAlignmentTypes.ts
engine/assemblies/placement/alignment/assemblyObjectAlignmentFootprints.ts
engine/assemblies/placement/alignment/assemblyCountertopAlignmentGeometry.ts
engine/assemblies/placement/alignment/assemblyPlanObjectAlignment.ts
engine/assemblies/placement/alignment/assemblyPlanAlignmentTargets.ts
engine/assemblies/placement/alignment/assemblyPlanAlignmentCandidates.ts
engine/assemblies/placement/alignment/assemblyPlanAlignmentGuides.ts
engine/assemblies/placement/alignment/assemblyElevationObjectAlignment.ts
engine/assemblies/placement/alignment/assemblyElevationAlignmentBoxes.ts
engine/assemblies/placement/alignment/assemblyElevationAlignmentCandidates.ts
engine/assemblies/placement/alignment/assemblyElevationAlignmentGuides.ts
```

Rules:

- Keep the public entry small and meaningful. It is the real dispatcher/orchestrator, not a fake alias file.
- Plan alignment target building, candidate selection, and guide building should stay in focused files.
- Elevation alignment target boxes, candidate selection, and guide building should stay in focused files.
- Do not merge the split alignment files back into one large file.
- Preserve alignment behavior when refactoring; snapping thresholds and scoring should not change in cleanup phases.

## 11. Assembly rendering and interaction responsibilities

Current assembly rendering files:

```txt
features/kitchen-editor/rendering/assemblies/AssemblyLayer.tsx
features/kitchen-editor/rendering/assemblies/PlacedAssemblyRenderer.tsx
features/kitchen-editor/rendering/assemblies/AssemblyRenderer.tsx
features/kitchen-editor/rendering/assemblies/AssemblyPrimitiveMesh.tsx
features/kitchen-editor/rendering/assemblies/AssemblyPrimitiveEdgeSegments.tsx
features/kitchen-editor/rendering/assemblies/AssemblyFrontOutlineLines.tsx
features/kitchen-editor/rendering/assemblies/SelectedAssemblyOutlineLayer.tsx
features/kitchen-editor/rendering/assemblies/AssemblyPlacementCandidateRenderer.tsx
features/kitchen-editor/rendering/assemblies/AssemblyPlacementFeedbackLayer.tsx
features/kitchen-editor/rendering/assemblies/useAssemblyRenderItems.ts
```

Responsibility split:

```txt
AssemblyLayer
- owns assembly render item preparation
- owns derived countertop opening map usage
- owns render-local assembly tree caching through useAssemblyRenderItems

PlacedAssemblyRenderer
- owns placed assembly interaction once per assembly
- reads action/current interaction state inside event handlers when possible

AssemblyRenderer
- shared visual assembly renderer
- renders primitive meshes, edge segments, front outline lines, and optional root pointer handling

AssemblyPrimitiveMesh
- visual-only primitive mesh
- no scene store subscription
- no placed assembly drag/selection logic

AssemblyPlacementCandidateRenderer
- visual-only candidate rendering
- receives candidate assembly directly
```

Do not put Zustand subscriptions or pointer drag logic back into every primitive mesh.

## 12. Assembly tree render-item cache rules

`useAssemblyRenderItems.ts` owns render-local reuse of built assembly trees.

Current helper:

```txt
features/kitchen-editor/rendering/assemblies/useAssemblyRenderItems.ts
```

Rules:

- Reuse base built assembly trees when the `PlacedAssembly` object reference is unchanged.
- Reuse countertop-opening-applied built trees when both the `PlacedAssembly` and that assembly's host countertop openings are unchanged.
- Do not rebuild every placed assembly tree just because one assembly moved.
- Do not introduce a global mutable assembly tree cache unless invalidation is designed explicitly.
- Keep cache local to rendering unless there is a clear engine-level caching requirement.

## 13. React memo boundary rules

React memoization should be applied only when it helps and the props are stable enough.

Good memo targets currently include visual-only components such as:

```txt
AssemblyPrimitiveMesh.tsx
AssemblyPrimitiveEdgeSegments.tsx
AssemblyRenderer.tsx
AssemblyFrontOutlineLines.tsx
AssemblyPlacementBoundingBox.tsx
AssemblyObjectAlignmentGuides.tsx
EdgeSegmentLines.tsx
PlanMeasurementLine.tsx
WallPlanMeasurementGuides.tsx
WallAnchorRing.tsx
WallSegmentActiveOverlay.tsx
WallSegmentVertexMarkers.tsx
WallElevationViewZoneOverlay.tsx
GroundGrid.tsx
SceneAxisGizmo.tsx
EditorLighting.tsx
```

Rules:

- Do not use `React.memo` to hide broad store subscriptions.
- First narrow derived props and selectors; then memoize visual components.
- Do not memoize behavior-heavy components just because they render often.
- If a memoized component still receives newly-created arrays/objects every render, stabilize those props first.

## 14. Geometry resource disposal rules

Generated Three.js `BufferGeometry` owned by a component must be disposed when replaced/unmounted.

Shared hook:

```txt
features/kitchen-editor/rendering/shared/useDisposableGeometry.ts
```

Use it for generated geometries such as:

```txt
custom assembly primitive geometries
rectangular frustum geometry
L-shaped prism geometry
custom mesh / countertop slab geometry
edge segment line geometry
wall segment geometry from createWallSegmentGeometry
wall elevation view-zone ShapeGeometry
```

Do not use it for JSX-owned built-in geometries such as:

```tsx
<boxGeometry />
<cylinderGeometry />
```

React Three Fiber owns declarative JSX geometries/materials and should dispose them.

## 15. Store selector and action subscription rules

Avoid subscribing to Zustand action functions just to call them inside event handlers.

Preferred pattern for action-only access:

```ts
const handlePointerDown = useCallback(() => {
  const { selectPlacedAssembly, startAssemblyDrag } = useDesignSceneStore.getState();
  selectPlacedAssembly(id);
  startAssemblyDrag(...);
}, [id]);
```

Use reactive subscriptions only for values that affect rendering.

Avoid broad object selectors unless you also handle equality correctly. Narrow subscriptions are often better than one broad object subscription that causes more rerenders.

Good examples:

```ts
const selectedAssembly = useDesignSceneStore(getSelectedPlacedAssemblyFromScene);
const isSceneOperationActive = useDesignSceneStore((state) => state.activeSceneOperation !== null);
const activeSceneOperationKind = useDesignSceneStore((state) => state.activeSceneOperation?.kind ?? null);
```

Avoid:

```ts
const activeSceneOperation = useDesignSceneStore((state) => state.activeSceneOperation);
const actions = useDesignSceneStore((state) => ({
  selectPlacedAssembly: state.selectPlacedAssembly,
  startAssemblyDrag: state.startAssemblyDrag,
}));
```

Exception: subscribing to an action can be acceptable in small non-render-heavy components, but prefer `getState()` for event-only action access in render-heavy interaction layers.

## 16. Active operation render-state rules

Avoid passing or subscribing to the full `activeSceneOperation` object unless the component truly needs it.

Prefer smaller derived values:

```txt
isSceneOperationActive
activeSceneOperationKind
positionedPlacementCandidate
wallSegmentDraft
hasAssemblyPlacementOperation
```

Current flow:

- `DesignSceneCanvas` uses the active operation kind for high-level mounting/gating.
- `DesignSceneRenderer` derives `wallSegmentDraft`, `positionedPlacementCandidate`, and placement booleans before passing props down.
- `AssemblyPlacementCandidateRenderer` receives `candidateAssembly` directly.
- `SelectedAssemblyOutlineLayer` uses `isSceneOperationActive`, not the whole operation object.
- Cutout source derivation receives positioned candidate data directly, not the full operation object.

Do not reintroduce broad `activeSceneOperation` subscriptions in camera controls, render layers, selected outline layers, or candidate renderers unless necessary.

## 17. Render visibility gating rules

Do not mount invisible interaction/render layers just to have them return `null` when the parent already knows they are irrelevant.

Current gating expectations:

```txt
PlacementSurface mounts only during active assembly placement.
AssemblyDragSurface mounts only during active assembly move drag.
AssemblyRotationSurface mounts only during active assembly rotation drag.
WallSegmentDraftSurface mounts only while floor-plan wall drawing is active.
AssemblyPlacementCandidateRenderer mounts only during assembly placement.
AssemblyPlacementFeedbackLayer mounts only when feedback exists.
WallSegmentDraftRenderer and draft preview geometry run only in floor-plan draft mode.
```

Rules:

- Gate at the parent when it avoids creating child store subscriptions.
- Do not hide layers in a way that breaks active operations.
- Keep floor-plan-only tools out of perspective/elevation when the workflow requires that.

## 18. Camera and fit-frame rules

Shared camera utilities belong in:

```txt
features/kitchen-editor/editors/shared/camera/
```

Current files:

```txt
cameraFit.ts
orthographicCameraControls.ts
sceneCameraControlSettings.ts
sceneFitFrame.ts
```

Rules:

- Do not recompute full scene fit frame reactively in every camera control render.
- Floor plan and perspective cameras should compute scene fit frame when the user triggers fit-view.
- Elevation camera should compute scene fit frame only when it needs non-wall-face scene fit.
- Locked wall-face elevation camera should use wall elevation frame/view-zone data instead of full scene fit measurement.
- Preserve camera feel unless the task explicitly asks to change it.
- Do not reintroduce `useSceneFitFrame.ts` unless live reactive fit-frame computation is intentionally needed.

## 19. Pointer callback stability rules

Use stable callbacks in render-heavy interaction layers, but do not change pointer behavior during cleanup.

Good cleanup targets:

```txt
DesignSceneCanvas.tsx
PlacementSurface.tsx
ElevationViewPaddingMaskOverlay.tsx
AssemblyDragSurface.tsx
AssemblyRotationSurface.tsx
WallSegmentDraftSurface.tsx
AssemblyFloorPlanRotationControl.tsx
WallSegmentMesh.tsx
```

Rules:

- Use `useCallback` for pointer handlers passed into memoized children or heavy canvas layers.
- Use current store actions via `getState()` inside event handlers when the action itself does not need to trigger render.
- Do not throttle pointer movement unless that is a dedicated behavior-tested phase.
- Do not change snapping, alignment, drag math, or camera behavior as part of callback cleanup.

## 20. Selection lookup and panel rules

Selection lookup helpers belong in:

```txt
features/kitchen-editor/selection/sceneSelectionLookups.ts
```

Current helper responsibilities include:

```txt
getSelectedPlacedAssemblyFromScene
getSelectedWallSegmentFromScene
getSelectedWallGraphNodesFromScene
```

Rules:

- Editor/designer panels should subscribe directly to selected assembly/wall data they need.
- Do not rebuild placed assembly/wall maps during panel render when a selector helper can compute the selected object.
- Property section components should not subscribe to action functions only to call them in input handlers.
- Use stable callbacks with `useDesignSceneStore.getState()` for property mutations and deletes.
- Memoize derived display values such as selected wall length when useful.

Current panel files:

```txt
features/kitchen-editor/editor-panel/SelectedObjectPropertiesPanel.tsx
features/kitchen-editor/designer-panel/AIDesignerPanel.tsx
features/kitchen-editor/properties-panel/assemblies/AssemblyPropertiesPanel.tsx
features/kitchen-editor/properties-panel/assemblies/AssemblyPlacementSection.tsx
features/kitchen-editor/properties-panel/assemblies/AssemblyDimensionSection.tsx
features/kitchen-editor/properties-panel/assemblies/AssemblyOptionGroupsSection.tsx
features/kitchen-editor/properties-panel/walls/WallSegmentPropertiesPanel.tsx
```

## 21. Scene view and camera naming

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

## 22. Toolbar and command rules

Keep one-shot camera commands separate from active editing tools.

Camera commands are not active tools:

```ts
export type SceneCameraCommand = "zoom-out" | "zoom-in" | "fit-view";
```

Active scene editing tools are scene operation/tool modes:

```ts
export type SceneEditingTool =
  | "draw-wall-segment"
  | "split-wall-footprint"
  | "draw-rectangle-cutout";
```

Do not allow impossible active state such as:

```ts
activeToolbarTool: "zoom-in";
```

Use kebab-case for string IDs:

```txt
zoom-in
zoom-out
fit-view
draw-wall-segment
split-wall-footprint
draw-rectangle-cutout
```

## 23. Folder organization rules

Organize by real responsibility, not by file count.

Good responsibility folders/names:

```txt
camera
scene-canvas
interaction
raw-definition
front-outline
guides
rendering
placement
alignment
openings
countertops
selection
```

Avoid vague folders/names:

```txt
helpers
utils
common
misc
manager
core
shared-for-now
```

Do not add bridge files, fake aliases, compatibility shims, or old-name re-exports. Rename/move directly and update all imports.

## 24. Naming rules

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
createWallFootprint
projectSceneToFloorPlan
projectSceneToElevation
measureAssemblyBounds
createAssemblyPlacementFeedback
buildAssemblyWallMeasurementGuides
applyHostCountertopOpeningsToAssemblyTree
getSelectedPlacedAssemblyFromScene
buildCountertopOpeningsByHostCountertopId
```

Use kebab-case for string IDs and normal TypeScript casing for variables, functions, types, and properties.

## 25. Unit naming rules

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

Do not mix inches and pixels in one type or variable name without explicit suffixes.

## 26. Duplicate logic cleanup rule

Do not keep duplicated domain math across files when the responsibility is clearly shared.

Current shared locations:

```txt
features/kitchen-editor/rendering/walls/guides/wallPlanGuideGeometry.ts
features/kitchen-editor/selection/sceneSelectionLookups.ts
features/kitchen-editor/rendering/shared/PlanMeasurementLine.tsx
features/kitchen-editor/rendering/shared/EdgeSegmentLines.tsx
features/kitchen-editor/rendering/shared/useDisposableGeometry.ts
engine/countertops/countertopDefinitionIds.ts
engine/countertops/applyCountertopOpeningsToAssemblyTree.ts
```

Only extract shared code when it is truly shared now. Do not create speculative generic wrappers.

## 27. Removed files that should not come back accidentally

The following files were removed during cleanup because they were unused, outdated, or superseded:

```txt
engine/walls/buildWallSegmentTopology.ts
engine/walls/draft-guides/wallDraftGuides.ts
engine/walls/draft-guides/wallDraftGuideTypes.ts
features/kitchen-editor/shared/formatSquareFeetLabel.ts
engine/assemblies/elevation/assemblyElevationProjection.ts
features/kitchen-editor/interaction/countertops/countertopPointerProjection.ts
engine/assemblies/placement/assemblyWallPlanGeometry.ts
features/kitchen-editor/editors/shared/camera/useSceneFitFrame.ts
```

Do not recreate these names unless the feature is intentionally redesigned and the file has a real responsibility.

## 28. Red-flag search terms

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
buildWallSegmentTopology
wallDraftGuides
wallDraftGuideTypes
formatSquareFeetLabel
assemblyElevationProjection
countertopPointerProjection
assemblyWallPlanGeometry
useSceneFitFrame
```

Not every match is automatically wrong, but each match must be reviewed.

Expected clean state:

- No `@/features/kitchen-editor` imports inside `src/engine`.
- No old scene/editor view type names.
- No fake compatibility exports or bridge files.
- No generic helper/utility folders added without real responsibility.
- Removed cleanup files stay absent.
- `AssemblyPrimitiveMesh` remains visual-only.
- `PlacedAssemblyRenderer` owns placed assembly interaction once per assembly.

## 29. Verification checklist before returning code

Run the strongest checks available from the uploaded package.

Minimum checks when only `src` is available:

```txt
TypeScript transpile syntax check for TS/TSX files
local import existence check
JSON parse check for catalog JSON files
import cycle check
red-flag search
confirm src/engine has no imports from src/features
confirm Phase 1 removed files are still absent
confirm useSceneFitFrame.ts is still absent unless intentionally restored
confirm AssemblyPrimitiveMesh has no store subscriptions or pointer handlers
confirm generated custom geometries use disposal where owned by the component
```

When the full project is available, also run:

```bash
npm run lint
npm run build
npm run test
```

If full project config is not available, state that clearly instead of claiming the real build passed.

## 30. Manual behavior checks after performance cleanup

After performance/render cleanup, manually test:

```txt
1. Select a cabinet by clicking any visible primitive part.
2. Drag a cabinet in floor plan.
3. Drag a cabinet in elevation.
4. Rotate a selected cabinet in floor plan.
5. Confirm designer mode can select but cannot drag/edit/delete.
6. Place a cabinet in floor plan.
7. Place a cabinet in elevation.
8. Draw a wall segment in floor plan.
9. Confirm wall drawing does not activate in perspective/elevation.
10. Select wall segments and edit wall height/thickness.
11. Confirm selected wall elevation navigator still works.
12. Confirm locked wall elevation view still fits the red/view-zone rectangle.
13. Confirm padding mask covers outside the elevation view-zone.
14. Confirm floor plan zoom/fit works.
15. Confirm perspective pan/rotate/zoom/fit works.
16. Confirm camera states persist when switching views.
17. Place a countertop slab plus drop-in sink/cooktop and confirm cutouts appear.
18. Move sink/cooktop and confirm cutouts follow.
19. Place wall window/door and confirm derived wall opening appears.
20. Confirm normal cabinets do not create wall/countertop cutout work.
21. Confirm selected properties panel edits placement/dimensions/options.
22. Confirm designer selected summaries update.
23. Confirm Delete/Backspace/Escape keyboard behavior still works outside inputs.
```

## 31. Implementation standard

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
preserve derived wall/countertop cutout behavior unless the task explicitly changes it
preserve elevation view-zone/padding-mask behavior unless the task explicitly changes it
keep editor/designer permission rules explicit
add or update tests/checks for changed behavior when project config is available
```

For behavior-sensitive work:

```txt
separate risky behavior changes from safe organization/performance work
preserve camera feel unless the task explicitly changes it
preserve placement/drag/delete behavior unless the task explicitly changes it
preserve elevation drag frame behavior unless the task explicitly changes it
test designer mode permissions after interaction changes
test wall and countertop cutouts after derived-source/caching changes
test wall elevation mask/navigation after wall geometry changes
test catalog loading after registry/parser changes
test front outlines after front-outline changes
```

## 32. Recommended next cleanup targets

Current recommended next phase:

```txt
Phase 4O - small panel component memo cleanup
```

Recommended 4O scope:

- Add `React.memo` to pure property and summary components only after selector cleanup.
- Keep property input behavior unchanged.
- Avoid memoizing components that still subscribe broadly to the store.
- Verify selected assembly/wall editing still updates immediately.

Potential later phases:

```txt
catalog loading / raw-definition parser review
front-outline render cost audit
manual countertop/wall opening feature planning, if that feature returns
full project lint/build/test once package config is available
```

Avoid starting risky phases such as pointer throttling, global geometry caches, or snapping-score changes until manual regression tests confirm the current performance phases are stable.
