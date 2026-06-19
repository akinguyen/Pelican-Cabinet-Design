# Kitchen Editor Implementation Guideline - Current Code

This guideline is the implementation reference for the current Kitchen Editor `src` package. It reflects the direct red-flag cleanup and scene-entity consistency work currently present in source.

Use this document to preserve current behavior, keep responsibility boundaries clear, avoid duplicate or compatibility-style code, and verify changes before returning code. If this guideline conflicts with older notes, treat this version and the current source tree as the source of truth.

## 1. Current product state

The app is a kitchen editor prototype built around React, React Three Fiber, Three.js geometry, and a Zustand scene store.

Current user-facing areas:

```txt
left AI chat sidebar, UI shell only
center scene viewport
view-mode tabs for perspective / floor plan / elevation
editor toolbar and history controls
right catalog / properties panel
```

Current scene capabilities:

```txt
manual assembly placement
manual assembly drag / scene-entity multi-drag / rotation / delete / duplicate
mixed scene-entity selection for assemblies and design reservation zones
wall segment drawing in floor plan
wall segment selection and properties
wall elevation navigation
catalog-based raw assembly definitions
derived countertop openings
derived wall openings
design reservation zone placement / drag / rotation / properties / delete / duplicate
front outline rendering in elevation
scene history undo / redo / restore
```

Current AI status:

```txt
AI chat shell exists
AI chat keeps local message UI state
AI chat does not subscribe to scene state
AI chat does not run a live AI agent
AI chat does not call a backend
AI chat does not mutate the scene
AI chat does not execute engine commands
```

Do not describe a live AI agent, AI command execution, automatic cabinet generation, read-only designer mode, manual wall/countertop cutout editing, or scene import/export as current behavior unless that behavior is intentionally rebuilt in source.

## 2. Source-of-truth model

`DesignScene` is the runtime source of truth.

Current source-of-truth shape:

```ts
export type DesignScene = Readonly<{
  placedAssemblies: readonly PlacedAssembly[];
  placedWallGraphs: readonly PlacedWallGraph[];
  designReservationZones: readonly DesignReservationZone[];
  activeSelection: SceneSelection | null;
  activeSceneOperation: SceneOperation | null;
}>;
```

Scene view mode controls how the same scene is viewed:

```ts
export type SceneViewMode = "perspective" | "floor-plan" | "elevation";
```

Current scene operations are:

```txt
assembly-placement
design-reservation-zone-placement
wall-segment-draft
```

Current active editing tools are:

```txt
draw-wall-segment
draw-design-reservation-zone
```

Avoid duplicate live scene models such as:

```txt
aiDesignScene
editorDesignScene
renderDesignScene
perspectiveDesignScene
floorPlanDesignScene
elevationDesignScene
importedDesignSceneShadowState
```

If a future save/import/export feature is added, design it as a separate document contract deliberately. Do not use a persisted document shape as a second live scene store.

## 3. Engine and feature dependency boundary

`src/engine` must not import from `src/features`.

Allowed direction:

```txt
features/kitchen-editor -> engine -> core/shared primitives
```

Engine files may import:

```txt
src/core/*
src/engine/*
```

Engine files must not import:

```txt
src/features/*
React components
renderer components
editor panels
catalog UI components
feature-level store hook wrappers
```

Feature UI may import engine types and pure engine helpers.

Do not move React/render memoization helpers into `engine`. Rendering concerns belong under `src/features/kitchen-editor/rendering`, `src/features/kitchen-editor/editors`, or `src/features/kitchen-editor/interaction`.

## 4. Current directory responsibility map

Use real responsibility folders. Current high-level map:

```txt
src/core/geometry/                         inch-based point / size / bounds / rotation / polygon / plan helpers
src/core/ids/                              ID creation
src/engine/assemblies/                    assembly definitions, config, raw parser, tree builder, placement
src/engine/assemblies/front-outline/      elevation front outline derivation
src/engine/assemblies/placement/          assembly placement, feedback, snapping, alignment
src/engine/countertops/                   derived countertop opening and slab geometry logic
src/engine/design-zones/                  design reservation zone types, defaults, geometry, alignment
src/engine/primitive-geometry/            primitive and custom Three.js geometry builders
src/engine/scene/                         Zustand scene state, actions, camera/selection/operation/history types
src/engine/scene-entities/                selectable entity bounds, group geometry, wall measurements
src/engine/walls/                         wall graph, segment drawing, topology, elevation, openings, geometry
src/features/kitchen-editor/ai-panel/     local AI chat UI shell only
src/features/kitchen-editor/catalog-panel/ catalog UI
src/features/kitchen-editor/catalogs/      raw catalog JSON and registry
src/features/kitchen-editor/editor-panel/  catalog/properties panel switching
src/features/kitchen-editor/editor-toolbar/ toolbar and history controls
src/features/kitchen-editor/editors/       viewport, camera controls, scene canvas
src/features/kitchen-editor/formatting/    kitchen-editor UI labels and display formatting
src/features/kitchen-editor/interaction/   pointer surfaces and pointer projection helpers
src/features/kitchen-editor/properties-panel/ properties UI
src/features/kitchen-editor/rendering/     R3F rendering layers and visual-only components
src/features/kitchen-editor/selection/     selected object lookup helpers
src/features/kitchen-editor/workspace/     app shell layout
```

Avoid vague folders:

```txt
helpers
utils
common
misc
manager
core2
shared-for-now
new
legacy
compat
bridge
```

Only extract shared code when it is truly shared now. Do not create speculative wrappers.

## 5. Current scene/store files

Current scene/store files include:

```txt
src/engine/scene/designSceneTypes.ts
src/engine/scene/designSceneStore.ts
src/engine/scene/designSceneStoreTypes.ts
src/engine/scene/createInitialDesignSceneStoreState.ts
src/engine/scene/sceneSelectionTypes.ts
src/engine/scene/sceneOperationTypes.ts
src/engine/scene/sceneViewModeTypes.ts
src/engine/scene/sceneCameraStateTypes.ts
src/engine/scene/sceneCameraCommandTypes.ts
src/engine/scene/sceneEditingToolTypes.ts
src/engine/scene/sceneDragTypes.ts
src/engine/scene/sceneHistoryTypes.ts
src/engine/scene/derivedCutoutAssemblySources.ts
```

Current scene action modules include:

```txt
src/engine/scene/actions/assemblyDragActions.ts
src/engine/scene/actions/assemblyEditingActions.ts
src/engine/scene/actions/assemblyPlacementActions.ts
src/engine/scene/actions/assemblyRotationActions.ts
src/engine/scene/actions/designReservationZoneDragActions.ts
src/engine/scene/actions/designReservationZoneEditingActions.ts
src/engine/scene/actions/designReservationZonePlacementActions.ts
src/engine/scene/actions/designReservationZoneRotationActions.ts
src/engine/scene/actions/sceneCameraStateActions.ts
src/engine/scene/actions/sceneEntityDragActions.ts
src/engine/scene/actions/sceneEntityEditingActions.ts
src/engine/scene/actions/sceneHistoryActions.ts
src/engine/scene/actions/sceneInteractionActions.ts
src/engine/scene/actions/sceneSelectionActions.ts
src/engine/scene/actions/sceneToolbarActions.ts
src/engine/scene/actions/sceneViewModeActions.ts
src/engine/scene/actions/wallEditingActions.ts
src/engine/scene/actions/wallElevationNavigationActions.ts
src/engine/scene/actions/wallSegmentDraftActions.ts
```

When adding scene behavior, add pure math to `src/engine/...` and add state mutation through focused action modules. Do not put new mutation logic directly into React rendering components.

## 6. Scene entity model and shared behavior rules

Placed assemblies and design reservation zones are both scene entities.

Current generic scene-entity selection shape:

```ts
export type SceneEntitySelectionKind = "placed-assembly" | "design-reservation-zone";

export type SceneEntitySelectionRef = Readonly<{
  entityKind: SceneEntitySelectionKind;
  entityId: string;
}>;

export type SceneSelection =
  | Readonly<{ kind: "scene-entity"; sceneEntity: SceneEntitySelectionRef }>
  | Readonly<{ kind: "scene-entities"; sceneEntities: readonly SceneEntitySelectionRef[] }>
  | Readonly<{ kind: "placed-wall-segment"; wallGraphId: string; wallSegmentId: string }>;
```

Scene-entity behavior should be implemented once when the behavior applies to both assemblies and design reservation zones.

Shared scene-entity behavior includes:

```txt
selection
multi-selection
selected volume boxes
floor-plan edit controls
group guides
group geometry
delete selected scene entities
duplicate selected scene entities
scene-entity multi-drag
shared rotation pointer surface
scene-entity wall measurement guides
undo/redo history for scene-entity operations
```

Wall segments are not part of the generic movable scene-entity selection family. Keep wall segment selection/editing separate because walls have graph topology, elevation target, face-side, and segment-splitting behavior.

Avoid duplicate assembly-specific and reservation-zone-specific implementations for the same scene-entity responsibility. Domain-specific renderers and property panels can remain separate when the domain behavior differs.

## 7. Scene entity rendering and interaction files

Current scene-entity engine files include:

```txt
src/engine/scene-entities/sceneEntityBoundsTypes.ts
src/engine/scene-entities/placedAssemblySceneEntityBounds.ts
src/engine/scene-entities/designReservationZoneSceneEntityBounds.ts
src/engine/scene-entities/sceneEntityGroupGeometry.ts
src/engine/scene-entities/measurement/sceneEntityWallMeasurementGuides.ts
```

Current scene-entity rendering files include:

```txt
src/features/kitchen-editor/rendering/scene-entities/SceneEntityVolumeBoundingBox.tsx
src/features/kitchen-editor/rendering/scene-entities/SceneEntityFloorPlanEditControls.tsx
src/features/kitchen-editor/rendering/scene-entities/SceneEntityFloorPlanRotationControl.tsx
src/features/kitchen-editor/rendering/scene-entities/SceneEntityGroupGuides.tsx
src/features/kitchen-editor/rendering/scene-entities/SceneEntityWallMeasurementGuides.tsx
src/features/kitchen-editor/rendering/scene-entities/SelectedSceneEntityLayer.tsx
```

Current scene-entity interaction files include:

```txt
src/features/kitchen-editor/interaction/scene-entities/SceneEntityMultiDragSurface.tsx
src/features/kitchen-editor/interaction/scene-entities/SceneEntityRotationSurface.tsx
```

Rules:

```txt
SelectedSceneEntityLayer owns selected scene-entity boxes and single/group edit controls.
SceneEntityGroupGuides owns dashed group guide / group measurement visuals.
SceneEntityVolumeBoundingBox is the selected-bound renderer for all view modes.
SceneEntityFloorPlanEditControls supports both single scene entities and scene-entity groups.
SceneEntityRotationSurface handles assembly and reservation-zone rotation pointer surfaces when pointer behavior is shared.
SceneEntityWallMeasurementGuides renders wall measurement guides for scene-entity bounds.
```

Do not create parallel selected-outline, group-guide, rotation-surface, or duplicate/delete controls for assemblies and reservation zones when the behavior is scene-entity behavior.

## 8. Scene history rules

Current scene history lives in:

```txt
src/engine/scene/sceneHistoryTypes.ts
src/engine/scene/actions/sceneHistoryActions.ts
src/features/kitchen-editor/editor-toolbar/KitchenEditorHistoryControls.tsx
```

History state is separate from the live `DesignScene` but stores scene snapshots for undo/redo/restore.

Current history actions:

```txt
undoDesignSceneChange
redoDesignSceneChange
restoreDesignSceneHistoryEntry
recordDesignSceneHistoryEntry
```

Rules:

```txt
record history from focused scene action modules when a meaningful scene change is committed
record one history entry per user-level scene operation, not one entry per object in a group
clear redo history when a new change is recorded
clear transient drag / feedback / alignment / toolbar / camera command state when undoing, redoing, or restoring
avoid recording history for transient hover, pointer preview, camera state, or UI panel state
keep history labels user-readable and action-specific
```

Do not treat scene history as import/export. It is runtime undo/redo state, not a persisted document contract.

## 9. Workspace and AI shell rules

The current codebase has one editing workspace. It does not have a separate workspace mode, designer mode, or read-only mode.

Current AI files:

```txt
src/features/kitchen-editor/ai-panel/AiChatPanel.tsx
src/features/kitchen-editor/ai-panel/KitchenAiPanel.tsx
src/features/kitchen-editor/workspace/KitchenWorkspaceAiSidebar.tsx
```

AI chat rules:

```txt
keep it local-message UI only
no scene store subscription
no selected-object context summary
no direct scene mutation
no engine command execution
no catalog auto-placement
no backend or live AI claim unless implemented
```

Safe future AI work should start with a narrow command/action layer, deterministic command previews, explicit user confirmation for broad/destructive changes, and engine-side validation separate from chat UI.

## 10. Units and naming rules

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
widthInches
depthInches
zDegrees
```

Convert pixels to inches as soon as pointer input enters domain logic. Convert inches to pixels only at browser/UI boundaries.

Avoid mixing inches and pixels in one type or variable name without explicit suffixes.

## 11. View mode and camera rules

Current view modes:

```txt
perspective
floor-plan
elevation
```

Current camera stack:

```txt
PerspectiveCamera + PerspectiveCameraControls
OrthographicCamera + FloorPlanCameraControls
OrthographicCamera + ElevationCameraControls
```

Current camera utility files:

```txt
src/features/kitchen-editor/editors/shared/camera/cameraFit.ts
src/features/kitchen-editor/editors/shared/camera/orthographicCameraControls.ts
src/features/kitchen-editor/editors/shared/camera/sceneCameraControlSettings.ts
src/features/kitchen-editor/editors/shared/camera/sceneFitFrame.ts
```

Rules:

```txt
camera state belongs to scene view mode
camera state does not belong to workspace sidebar state
preserve camera feel unless the task explicitly changes it
use command-driven camera fit where possible
wall drawing is floor-plan only
switching away from floor plan should cancel floor-plan-only draft operations and inactive floor-plan-only tools
elevation navigation is controlled by WallElevationNavigator
locked wall-face elevation camera should use wall elevation frame/view-zone data when possible
```

Do not add reactive full-scene fit-frame recomputation or elevation clipping planes unless the feature is intentionally redesigned.

## 12. Toolbar and command rules

Keep one-shot camera commands separate from active editing tools.

Camera commands are not active tools:

```ts
export type SceneCameraCommandTool = "zoom-out" | "zoom-in" | "fit-view";
```

Active scene editing tools are:

```ts
export type SceneEditingTool = "draw-wall-segment" | "draw-design-reservation-zone";
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
draw-design-reservation-zone
```

Toolbar and history files:

```txt
src/features/kitchen-editor/editor-toolbar/KitchenEditorToolbar.tsx
src/features/kitchen-editor/editor-toolbar/KitchenEditorHistoryControls.tsx
src/features/kitchen-editor/editor-toolbar/kitchenEditorToolbarConfig.ts
src/engine/scene/actions/sceneToolbarActions.ts
src/engine/scene/actions/sceneCameraStateActions.ts
src/engine/scene/actions/sceneHistoryActions.ts
```

## 13. DesignSceneRenderer composition rules

`DesignSceneRenderer.tsx` composes scene rendering and interaction surfaces.

Current major responsibilities are mounted in this order family:

```txt
WallLayer
AssemblyLayer
DesignReservationZoneLayer
DesignReservationZonePlacementCandidateRenderer
SelectedSceneEntityLayer
SceneEntityGroupGuides
SceneEntityWallMeasurementGuides
AssemblyObjectAlignmentGuides
AssemblyPlacementFeedbackLayer
AssemblyPlacementCandidateRenderer
AssemblyDragSurface
SceneEntityMultiDragSurface
SceneEntityRotationSurface
DesignReservationZoneDragSurface
WallSegmentDraftSurface
DesignReservationZonePlacementSurface
```

Rules:

```txt
Keep scene-entity selected UI under SelectedSceneEntityLayer.
Keep scene-entity group guide visuals under SceneEntityGroupGuides.
Keep wall rendering separate from scene-entity rendering.
Keep assembly geometry rendering under AssemblyLayer / AssemblyRenderer.
Keep reservation-zone visual rendering under DesignReservationZoneLayer / DesignReservationZoneRenderer.
Gate interaction surfaces at the parent when it avoids child store subscriptions.
```

## 14. Wall system responsibilities

The current wall system includes:

```txt
committed wall graph / segment rendering
wall segment draft drawing
wall segment draft snapping and splitting
wall plan measurement guides
derived wall openings from placed assemblies
wall opening intersection outlines
wall opening plan measurement guides
wall elevation view zone / padding mask
wall elevation navigator
wall segment selection and editing
wall segment cabinet face policies
```

Current wall engine files include:

```txt
src/engine/walls/buildConnectedWallGeometry.ts
src/engine/walls/connectedWallGeometryTypes.ts
src/engine/walls/placedWallGraphTypes.ts
src/engine/walls/placedWallSegmentTypes.ts
src/engine/walls/wallPlanGeometry.ts
src/engine/walls/segment-draft/wallSegmentDraftAnchors.ts
src/engine/walls/segment-draft/wallSegmentDraftFactory.ts
src/engine/walls/segment-draft/wallSegmentDraftPreview.ts
src/engine/walls/segment-draft/wallSegmentDraftTypes.ts
src/engine/walls/wallBounds.ts
src/engine/walls/wallElevationCameraFrame.ts
src/engine/walls/wallElevationViewZone.ts
src/engine/walls/wallSegmentElevation.ts
src/engine/walls/wallSegmentElevationNavigation.ts
src/engine/walls/wallSegmentElevationTypes.ts
src/engine/walls/wallSegmentFaceSideSettings.ts
src/engine/walls/wallSegmentGeometry.ts
src/engine/walls/wallSegmentGraphEditing.ts
```

Current wall rendering files include:

```txt
src/features/kitchen-editor/rendering/walls/WallLayer.tsx
src/features/kitchen-editor/rendering/walls/WallSegmentMesh.tsx
src/features/kitchen-editor/rendering/walls/WallSegmentDraftRenderer.tsx
src/features/kitchen-editor/rendering/walls/WallPlanMeasurementGuides.tsx
src/features/kitchen-editor/rendering/walls/WallElevationViewZoneOverlay.tsx
src/features/kitchen-editor/rendering/walls/WallOpeningIntersectionOutlines.tsx
src/features/kitchen-editor/rendering/walls/WallOpeningPlanMeasurementGuides.tsx
src/features/kitchen-editor/rendering/walls/WallSegmentActiveOverlay.tsx
src/features/kitchen-editor/rendering/walls/WallAnchorRing.tsx
src/features/kitchen-editor/rendering/walls/guides/wallPlanGuideGeometry.ts
src/features/kitchen-editor/rendering/walls/wallRenderingGeometry.ts
src/features/kitchen-editor/rendering/walls/wallSegmentRenderColors.ts
```

Rules:

```txt
WallLayer.tsx should compose responsibilities without owning all details.
Wall draft state should come from scene operation and wall segment draft actions.
Keep wall plan guide rendering math in wallPlanGuideGeometry.ts.
Keep reusable wall-domain plan helpers in engine/walls/wallPlanGeometry.ts.
Do not simplify wall geometry to a plain prism if derived openings exist.
Do not move wall opening derivation into React render components.
```

## 15. Wall drawing and elevation rules

Wall drawing is a floor-plan workflow.

Current drawing behavior supports:

```txt
starting from an empty point
snapping to existing wall nodes
snapping to an existing wall segment body
splitting a segment at an inserted node
merging wall graphs when a new segment connects two graphs
horizontal/vertical guide snapping while drawing
minimum committed wall segment length of 3 inches
```

Wall segment deletion can split disconnected graph components and remove orphan nodes.

Wall elevation target state is `activeWallElevationTarget`:

```txt
wallGraphId
wallSegmentId
faceSide
```

Rules:

```txt
Do not activate wall drawing in perspective or elevation without redesigning toolbar gating, pointer surfaces, and view-mode cleanup.
Preserve wall elevation navigator behavior.
Preserve DOM/overlay padding mask behavior.
Preserve wall segment preferred face side settings.
When wall geometry changes, elevation target frame, view-zone overlay, camera frame, and mask should derive from updated geometry.
Elevation target changes should remain navigator-driven unless UX is intentionally redesigned.
```

## 16. Derived wall opening rules

Wall openings are derived from placed assemblies that declare wall cutout behavior.

Current wall opening files:

```txt
src/engine/walls/openings/deriveWallOpeningsFromAssemblies.ts
src/engine/walls/openings/wallOpeningCutGeometry.ts
src/engine/walls/openings/wallOpeningFaceAxes.ts
src/engine/walls/openings/wallOpeningIntersectionOutlineGeometry.ts
src/engine/walls/openings/wallOpeningPlanMeasurements.ts
src/engine/scene/derivedCutoutAssemblySources.ts
src/features/kitchen-editor/rendering/walls/WallOpeningIntersectionOutlines.tsx
src/features/kitchen-editor/rendering/walls/WallOpeningPlanMeasurementGuides.tsx
src/features/kitchen-editor/rendering/walls/WallSegmentMesh.tsx
src/features/kitchen-editor/rendering/walls/wallRenderingGeometry.ts
```

Current model:

```txt
wall openings are not manually edited standalone scene objects
door/window-like catalog definitions use cutoutBehavior.wall.source: "elevation-projection"
wall opening projection checks wall face sides and chooses the closest valid face
wall openings are clipped along wall face length and height
wall opening intersection outlines and plan measurement guides are rendering-only derived visuals
candidate openings are included only when the positioned candidate can produce a wall opening
derived opening generation receives wallOpeningAssemblies, not all placed assemblies
```

Avoid manual wall-opening scene state unless the full feature is intentionally designed.

## 17. Countertop opening and cutout rules

Countertop openings are derived from countertop slab hosts plus assemblies that declare countertop cutout behavior.

Current files:

```txt
src/engine/countertops/countertopDefinitionIds.ts
src/engine/countertops/deriveCountertopOpeningsFromAssemblies.ts
src/engine/countertops/applyCountertopOpeningsToAssemblyTree.ts
src/engine/countertops/countertopOpeningGeometry.ts
src/engine/countertops/countertopOpeningTypes.ts
src/engine/countertops/countertopRemovedAreaGeometry.ts
src/engine/countertops/countertopHoleGeometryStrategy.ts
src/engine/scene/derivedCutoutAssemblySources.ts
src/features/kitchen-editor/rendering/assemblies/useAssemblyRenderItems.ts
```

Rules:

```txt
keep countertop cutout math in src/engine/countertops
keep countertop slab definition id in countertopDefinitionIds.ts
deriveCountertopOpeningsFromAssemblies should receive countertopOpeningAssemblies, not all placed assemblies
applyHostCountertopOpeningsToAssemblyTree should apply host openings without recursively checking unrelated opening maps at every child
do not change cutout shape behavior during performance cleanup
do not add manual countertop cutout state unless the full feature is intentionally designed
```

Current countertop cutout behavior is used by drop-in sink/cooktop-style assemblies that declare `cutoutBehavior.countertop`.

## 18. Assembly catalog and raw definition rules

Assembly definitions are loaded from raw JSON catalog data and registered through the kitchen editor catalog registry.

Current files include:

```txt
src/engine/assemblies/assemblyDefinitionTypes.ts
src/engine/assemblies/assemblyRegistry.ts
src/engine/assemblies/assemblyConfiguration.ts
src/engine/assemblies/assemblyConfigurationFactory.ts
src/engine/assemblies/assemblyTreeBuilder.ts
src/engine/assemblies/raw-definition/buildAssemblyFromRawDefinition.ts
src/engine/assemblies/raw-definition/createAssemblyDefinitionFromRaw.ts
src/engine/assemblies/raw-definition/parseRawAssemblyDefinition.ts
src/engine/assemblies/raw-definition/rawAssemblyConditionEvaluator.ts
src/engine/assemblies/raw-definition/rawAssemblyDefinitionComponentParsers.ts
src/engine/assemblies/raw-definition/rawAssemblyDefinitionParserReader.ts
src/engine/assemblies/raw-definition/rawAssemblyDefinitionTypes.ts
src/engine/assemblies/raw-definition/rawAssemblyDefinitionValueParsers.ts
src/engine/assemblies/raw-definition/rawAssemblyExpressionEvaluator.ts
src/features/kitchen-editor/catalogs/data/**/*.json
src/features/kitchen-editor/catalogs/registry/kitchenEditorCatalogConfig.ts
src/features/kitchen-editor/catalogs/registry/kitchenEditorCatalogRegistry.ts
src/features/kitchen-editor/catalogs/registry/kitchenEditorRawCatalogEntries.ts
src/features/kitchen-editor/catalogs/registry/loadKitchenEditorRawDefinitions.ts
```

Raw definitions support:

```txt
dimensions with controls and standard options
option groups
number / boolean / string option values
nested assembly components
primitive geometry components
include conditions
expression-based positions / sizes / rotations / option values
component roles
front outline edges
countertop and wall cutout behavior
```

Supported primitive geometry kinds:

```txt
box
cylinder
rectangular-frustum
l-shaped-prism
custom-mesh with meshId: countertop-slab
```

Do not treat internal nested parts as catalog-visible cards unless their registry entry intentionally exposes them.

## 19. Assembly placement and object alignment rules

Assembly placement and object alignment are engine behavior, not renderer-only behavior.

Public alignment entry:

```txt
src/engine/assemblies/placement/assemblyObjectAlignmentGuides.ts
```

Focused alignment files:

```txt
src/engine/assemblies/placement/alignment/assemblyObjectAlignmentConstants.ts
src/engine/assemblies/placement/alignment/assemblyObjectAlignmentTypes.ts
src/engine/assemblies/placement/alignment/assemblyObjectAlignmentFootprints.ts
src/engine/assemblies/placement/alignment/assemblyCountertopAlignmentGeometry.ts
src/engine/assemblies/placement/alignment/assemblyPlanObjectAlignment.ts
src/engine/assemblies/placement/alignment/assemblyPlanAlignmentTargets.ts
src/engine/assemblies/placement/alignment/assemblyPlanAlignmentCandidates.ts
src/engine/assemblies/placement/alignment/assemblyPlanAlignmentGuides.ts
src/engine/assemblies/placement/alignment/assemblyElevationObjectAlignment.ts
src/engine/assemblies/placement/alignment/assemblyElevationAlignmentBoxes.ts
src/engine/assemblies/placement/alignment/assemblyElevationAlignmentCandidates.ts
src/engine/assemblies/placement/alignment/assemblyElevationAlignmentGuides.ts
```

Rules:

```txt
keep the public entry small and meaningful; it is a real dispatcher/orchestrator, not a fake alias file
plan alignment target building, candidate selection, and guide building should stay in focused files
elevation alignment target boxes, candidate selection, and guide building should stay in focused files
do not merge the split alignment files back into one large file
preserve alignment behavior when refactoring
snapping thresholds and scoring should not change in maintenance work
use constants from assemblyObjectAlignmentConstants.ts instead of scattering magic numbers
```

Current alignment considers walls, placed assemblies, design reservation zones, countertop opening footprints/boxes, and wall opening footprints/boxes where relevant.

## 20. Assembly placement and editing conventions

Assembly position convention:

```txt
worldPositionInches is the assembly center point
zInches is the vertical center, not the bottom
defaultDistanceFromFloorInches is converted to center Z by adding half height
height edits preserve current distance from floor
```

Current behavior:

```txt
catalog selection starts an assembly-placement operation
placement candidate starts as waiting-for-pointer
candidate becomes positioned after pointer movement supplies a world position
floor plan movement changes X/Y and keeps Z fixed
elevation movement changes active-wall-face position and Z
elevation movement clamps bottom above or at floor
rotation is a separate drag state and snaps through assemblyRotationSnapping.ts
```

Current feedback limitation:

```txt
AssemblyPlacementInvalidReason exists as a type, but current feedback creation generally returns isValid: true.
Do not claim full collision/overlap validation exists unless it is implemented and wired into actions/UI/rendering.
```

## 21. Design reservation zone rules

Design reservation zones are first-class scene entities, not assemblies.

Current engine files:

```txt
src/engine/design-zones/designReservationZoneAlignment.ts
src/engine/design-zones/designReservationZoneDefaults.ts
src/engine/design-zones/designReservationZoneGeometry.ts
src/engine/design-zones/designReservationZoneTypes.ts
src/engine/scene-entities/designReservationZoneSceneEntityBounds.ts
```

Current UI/interaction/rendering files:

```txt
src/features/kitchen-editor/interaction/design-zones/DesignReservationZonePlacementSurface.tsx
src/features/kitchen-editor/interaction/design-zones/DesignReservationZoneDragSurface.tsx
src/features/kitchen-editor/interaction/design-zones/designReservationZoneElevationFrame.ts
src/features/kitchen-editor/rendering/design-zones/DesignReservationZoneLayer.tsx
src/features/kitchen-editor/rendering/design-zones/DesignReservationZonePlacementCandidateRenderer.tsx
src/features/kitchen-editor/rendering/design-zones/DesignReservationZoneRenderer.tsx
src/features/kitchen-editor/properties-panel/design-zones/DesignReservationZonePropertiesPanel.tsx
```

Supported purposes:

```txt
island
peninsula
tall-pantry
```

Default dimensions:

```txt
island: 72w x 36d x 34.5h
peninsula: 72w x 36d x 34.5h
tall-pantry: 36w x 24d x 84h
```

Rules:

```txt
reservation zones are placeholders for user/AI intent
the current code does not automatically populate reservation zones with cabinets
do not model reservation zones as assemblies unless the feature is intentionally redesigned
keep reservation zone alignment and bounds in engine files
keep visual zone rendering in rendering/design-zones files
shared selection/delete/duplicate/group/rotation behavior belongs under scene-entity ownership, not duplicated in design-zones
```

## 22. Assembly rendering responsibilities

Current assembly rendering files:

```txt
src/features/kitchen-editor/rendering/assemblies/AssemblyLayer.tsx
src/features/kitchen-editor/rendering/assemblies/PlacedAssemblyRenderer.tsx
src/features/kitchen-editor/rendering/assemblies/AssemblyRenderer.tsx
src/features/kitchen-editor/rendering/assemblies/AssemblyPrimitiveMesh.tsx
src/features/kitchen-editor/rendering/assemblies/AssemblyPrimitiveEdgeSegments.tsx
src/features/kitchen-editor/rendering/assemblies/AssemblyFrontOutlineLines.tsx
src/features/kitchen-editor/rendering/assemblies/AssemblyPlacementCandidateRenderer.tsx
src/features/kitchen-editor/rendering/assemblies/AssemblyPlacementFeedbackLayer.tsx
src/features/kitchen-editor/rendering/assemblies/AssemblyPlacementBoundingBox.tsx
src/features/kitchen-editor/rendering/assemblies/AssemblyObjectAlignmentGuides.tsx
src/features/kitchen-editor/rendering/assemblies/useAssemblyRenderItems.ts
```

Responsibility split:

```txt
AssemblyLayer owns assembly render item preparation, derived countertop opening usage, and render-local assembly tree caching.
PlacedAssemblyRenderer owns placed assembly root interaction once per assembly.
AssemblyRenderer renders primitive meshes, edge segments, front outline lines, and optional root pointer handling.
AssemblyPrimitiveMesh is visual-only: no scene store subscription and no placed assembly drag/selection logic.
AssemblyPlacementCandidateRenderer is visual-only and receives candidate assembly directly.
```

Do not push placed interaction into every primitive mesh. Do not put scene-entity selected-outline or group-control logic back under assemblies.

## 23. Assembly tree render-item cache rules

`useAssemblyRenderItems.ts` owns render-local reuse of built assembly trees.

Rules:

```txt
reuse base built assembly trees when the PlacedAssembly object reference is unchanged
reuse countertop-opening-applied built trees when both the PlacedAssembly and that assembly's host countertop openings are unchanged
do not rebuild every placed assembly tree just because one assembly moved
do not introduce a global mutable assembly tree cache unless invalidation is designed explicitly
keep cache local to rendering unless there is a clear engine-level caching requirement
```

## 24. Render visibility gating rules

Do not mount invisible interaction/render layers just to have them return `null` when the parent already knows they are irrelevant.

Current gating expectations:

```txt
PlacementSurface mounts only during active assembly placement
AssemblyDragSurface mounts only during active assembly move drag
SceneEntityMultiDragSurface mounts only during active scene-entity multi-move drag
SceneEntityRotationSurface mounts only during active assembly or reservation-zone rotation drag
DesignReservationZoneDragSurface mounts only during active reservation-zone move drag
WallSegmentDraftSurface mounts only while floor-plan wall drawing is active
DesignReservationZonePlacementSurface mounts while the reservation-zone draw tool is active
AssemblyPlacementCandidateRenderer mounts only during assembly placement
AssemblyPlacementFeedbackLayer mounts only when feedback exists
WallSegmentDraftRenderer and draft preview geometry run only in floor-plan draft mode
```

Rules:

```txt
gate at the parent when it avoids creating child store subscriptions
do not hide layers in a way that breaks active operations
keep floor-plan-only tools out of perspective/elevation when the workflow requires that
```

## 25. React memo and Zustand selector rules

React memoization should be applied only when it helps and props are stable enough.

Rules:

```txt
do not use React.memo to hide broad store subscriptions
first narrow derived props and selectors; then memoize visual components
do not memoize behavior-heavy components just because they render often
if a memoized component receives new arrays/objects every render, stabilize those props first
```

Zustand selector rules:

```txt
subscribe to stable source values first
avoid returning newly-created arrays/objects directly from store selectors
derive arrays/objects with useMemo outside the store selector when possible
use useDesignSceneStore.getState() for event-only action access
```

Bad pattern:

```ts
const selectedRefs = useDesignSceneStore((state) => getSceneEntityRefsFromSelection(state.designScene.activeSelection));
```

Preferred pattern:

```ts
const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
const selectedRefs = useMemo(() => getSceneEntityRefsFromSelection(activeSelection), [activeSelection]);
```

## 26. Geometry resource disposal rules

Generated Three.js `BufferGeometry` owned by a component must be disposed when replaced/unmounted.

Shared hook:

```txt
src/features/kitchen-editor/rendering/shared/useDisposableGeometry.ts
```

Use it for generated geometries such as:

```txt
custom assembly primitive geometries
rectangular frustum geometry
L-shaped prism geometry
custom mesh / countertop slab geometry
edge segment line geometry
wall segment geometry from wall rendering helpers
wall elevation view-zone ShapeGeometry
```

Do not use it for JSX-owned built-in geometries such as:

```tsx
<boxGeometry />
<cylinderGeometry />
```

React Three Fiber owns declarative JSX geometries/materials and should dispose them.

## 27. Active operation render-state rules

Avoid passing or subscribing to the full `activeSceneOperation` object unless the component truly needs it.

Prefer smaller derived values:

```txt
activeSceneOperationKind
positionedPlacementCandidate
wallSegmentDraft
designReservationZonePlacementCandidate
hasAssemblyPlacementOperation
```

Current flow:

```txt
DesignSceneCanvas uses operation kind for high-level mounting/gating.
DesignSceneRenderer derives wall draft, positioned assembly candidate, reservation zone candidate, and placement booleans before passing props down.
AssemblyPlacementCandidateRenderer receives candidate assembly directly.
Cutout source derivation receives positioned candidate data directly, not the full operation object.
```

Do not reintroduce broad `activeSceneOperation` subscriptions in camera controls, render layers, selected layers, or candidate renderers unless necessary.

## 28. Pointer callback stability rules

Use stable callbacks in render-heavy interaction layers, but do not change pointer behavior during cleanup.

Good cleanup targets:

```txt
DesignSceneCanvas.tsx
PlacementSurface.tsx
ElevationViewPaddingMaskOverlay.tsx
AssemblyDragSurface.tsx
SceneEntityMultiDragSurface.tsx
SceneEntityRotationSurface.tsx
DesignReservationZonePlacementSurface.tsx
DesignReservationZoneDragSurface.tsx
WallSegmentDraftSurface.tsx
WallSegmentMesh.tsx
```

Rules:

```txt
use useCallback for pointer handlers passed into memoized children or heavy canvas layers
use current store actions via getState() inside event handlers when the action itself does not need to trigger render
do not throttle pointer movement unless that is a dedicated behavior-tested change
do not change snapping, alignment, drag math, or camera behavior as part of callback cleanup
```

## 29. Selection lookup and panel rules

Selection lookup helpers belong in:

```txt
src/features/kitchen-editor/selection/sceneSelectionLookups.ts
```

Current helper responsibilities include:

```txt
buildPlacedAssemblyById
buildDesignReservationZoneById
getSelectedPlacedAssembly
getSelectedPlacedAssemblyFromScene
getSelectedPlacedAssemblies
getSelectedDesignReservationZoneFromScene
getSelectedDesignReservationZones
getSelectedWallSegment
getSelectedSceneEntityRefs
```

Current panel files:

```txt
src/features/kitchen-editor/editor-panel/KitchenEditorPanel.tsx
src/features/kitchen-editor/editor-panel/SelectedObjectPropertiesPanel.tsx
src/features/kitchen-editor/properties-panel/assemblies/AssemblyPropertiesPanel.tsx
src/features/kitchen-editor/properties-panel/assemblies/AssemblyPlacementSection.tsx
src/features/kitchen-editor/properties-panel/assemblies/AssemblyDimensionSection.tsx
src/features/kitchen-editor/properties-panel/assemblies/AssemblyOptionGroupsSection.tsx
src/features/kitchen-editor/properties-panel/design-zones/DesignReservationZonePropertiesPanel.tsx
src/features/kitchen-editor/properties-panel/scene-entities/SceneEntityMultiSelectionPanel.tsx
src/features/kitchen-editor/properties-panel/walls/WallSegmentPropertiesPanel.tsx
src/features/kitchen-editor/properties-panel/walls/WallSegmentFaceSettingsSection.tsx
```

Rules:

```txt
single assembly selection shows AssemblyPropertiesPanel
single reservation-zone selection shows DesignReservationZonePropertiesPanel
single wall segment selection shows WallSegmentPropertiesPanel
multi or mixed scene-entity selection shows SceneEntityMultiSelectionPanel
mixed scene-entity selection must not show a single-object properties editor
panels should subscribe directly to selected data they need
use stable callbacks with useDesignSceneStore.getState() for property mutations and deletes
memoize derived display values such as selected wall length when useful
```

## 30. Plan measurement rendering rules

Reusable plan measurement UI belongs in:

```txt
src/features/kitchen-editor/rendering/shared/PlanMeasurementLine.tsx
```

This component should stay generic. It should not know about walls, assemblies, openings, selection, or scene store state.

Feature-specific guide renderers should prepare domain-specific measurement objects and pass them into `PlanMeasurementLine`.

Current users include:

```txt
src/features/kitchen-editor/rendering/walls/WallPlanMeasurementGuides.tsx
src/features/kitchen-editor/rendering/walls/WallSegmentDraftRenderer.tsx
src/features/kitchen-editor/rendering/walls/WallOpeningPlanMeasurementGuides.tsx
src/features/kitchen-editor/rendering/assemblies/AssemblyObjectAlignmentGuides.tsx
src/features/kitchen-editor/rendering/scene-entities/SceneEntityWallMeasurementGuides.tsx
src/features/kitchen-editor/rendering/scene-entities/SceneEntityGroupGuides.tsx
```

Keep inches in guide inputs. Convert to pixels only at browser/UI boundaries when necessary.

## 31. Tiny file responsibility rule

Do not create a new file just to hold one tiny type, one constant, or one simple function unless the file has a stable source-of-truth responsibility.

Prefer merging tiny code into the nearest real owner file when:

```txt
it is only used by one owner
it exists only as a naming split
it creates import churn without improving responsibility
it is effectively a wrapper around one type/constant/function
```

Tiny files are acceptable when they are:

```txt
framework entrypoints
ambient/module declarations
stable source-of-truth domain primitives
constants intentionally centralized for cross-module use
files that represent explicit responsibility boundaries
```

Do not solve tiny-file issues by creating vague `helpers`, `utils`, `common`, `compat`, or `bridge` folders/files.

## 32. Naming rules

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
processor
thing
dataStuff
```

Prefer names that describe the real action:

```txt
buildAssemblyTree
createWallFootprint
projectSceneToFloorPlan
projectSceneToElevation
measureAssemblyBounds
createAssemblyPlacementFeedback
buildSceneEntityWallMeasurementGuides
applyHostCountertopOpeningsToAssemblyTree
getSelectedPlacedAssembly
buildCountertopOpeningsByHostCountertopId
createDesignReservationZoneFootprint
alignDesignReservationZone
createSceneEntityGroupFootprint
```

Use kebab-case for string IDs and normal TypeScript casing for variables, functions, types, and properties.

## 33. No fake alias / bridge / compatibility rules

This is an important implementation guardrail.

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

Do not add files whose only purpose is:

```txt
old name re-export
compatibility re-export
legacy wrapper
bridge from old folder to new folder
fake migration path
temporary alias that is never removed
```

Bad patterns:

```ts
export * from "../new-location/realFile";
```

```ts
export { NewThing as OldThing } from "./NewThing";
```

Preferred pattern:

```txt
rename/move the real file
update all imports
remove the old file
run import existence checks
```

## 34. Duplicate logic cleanup rule

Do not keep duplicated domain math or duplicated components when the responsibility is clearly shared.

Current shared locations include:

```txt
src/core/geometry/planPointGeometry.ts
src/core/geometry/polygonGeometry.ts
src/features/kitchen-editor/formatting/kitchenEditorLabelFormatting.ts
src/features/kitchen-editor/selection/sceneSelectionLookups.ts
src/features/kitchen-editor/rendering/shared/PlanMeasurementLine.tsx
src/features/kitchen-editor/rendering/shared/EdgeSegmentLines.tsx
src/features/kitchen-editor/rendering/shared/useDisposableGeometry.ts
src/engine/countertops/countertopDefinitionIds.ts
src/engine/countertops/applyCountertopOpeningsToAssemblyTree.ts
src/engine/scene-entities/sceneEntityGroupGeometry.ts
src/engine/scene-entities/measurement/sceneEntityWallMeasurementGuides.ts
src/engine/scene-entities/placedAssemblySceneEntityBounds.ts
src/engine/scene-entities/designReservationZoneSceneEntityBounds.ts
src/engine/walls/wallPlanGeometry.ts
src/features/kitchen-editor/rendering/scene-entities/SceneEntityVolumeBoundingBox.tsx
src/features/kitchen-editor/rendering/scene-entities/SelectedSceneEntityLayer.tsx
```

Search for:

```txt
unused exports
unused imports
unused props
write-only fields
dead fields in returned objects
action functions that are never called
always-false debug branches
duplicated local helper functions
unnecessary wrapper helpers
duplicate components with the same responsibility
old names left behind after a responsibility moved
```

If two components are similar because they represent the same domain responsibility, move that responsibility to the shared domain owner. If two components are similar only visually but differ in domain behavior, keep them separate or extract only the visual primitive.

## 35. Red-flag search terms and pattern review

Search these before returning code:

```txt
@/features/kitchen-editor inside src/engine
legacy
fallback
migration
migrate
compat
compatibility
deprecated
bridge
alias
shim
resolve
resolver
Resolved
helpers
utils
misc
common
readOnly
checkPermission
modeHelper
permissionManager
manager
```

Also review for these structural patterns:

```txt
engine files importing feature files
fake compatibility exports or old-name re-export aliases
generic helper/utility folders without real responsibility
duplicate selected-outline layers for assemblies and reservation zones
assembly-only duplicate/delete UI for behavior that should be scene-entity behavior
separate pointer surfaces when one scene-entity pointer surface handles equivalent behavior
always-false debug render branches
one-type / one-constant / one-function files without stable source-of-truth responsibility
Zustand selectors that allocate new arrays or objects directly
```

Not every match is automatically wrong, but every match must be reviewed.

Expected clean state:

```txt
no src/engine imports from src/features
no old scene/editor view type names
no fake compatibility exports, bridge files, or old-name re-export aliases
no generic helper/utility folders added without real responsibility
no duplicate selected-outline layers for assemblies and reservation zones
no assembly-only duplicate/delete UI for scene-entity behavior
no separate rotation surfaces when one scene-entity rotation surface handles the shared pointer behavior
AssemblyPrimitiveMesh remains visual-only
PlacedAssemblyRenderer owns placed assembly interaction once per assembly
current toolbar active tools remain distinct from camera commands
AI panel remains a shell until a real command layer is implemented
```

## 36. Behavior-risk red flags

Treat these as risky behavior changes, not casual cleanup:

```txt
global mutable geometry cache
pointer throttling
collision validation rewrite
snapping score change
camera feel change
manual cutout editing
AI auto-placement
hidden auto-commit
duplicate scene state
render-only source of truth
reactive full-scene fit-frame recomputation
wall clipping plane comeback
```

Start those only after current behavior has a manual regression pass and the feature scope is explicit.

## 37. Verification checklist before returning code

Run the strongest checks available from the uploaded package.

Minimum checks when only `src` is available:

```txt
TypeScript transpile syntax check for TS/TSX files
local import existence check
named import/export check
JSON parse check for catalog JSON files
import cycle check
red-flag search
confirm src/engine has no imports from src/features
confirm no fake alias/bridge files were added
confirm no vague helper/utility folders were added
confirm no duplicate selected scene-entity ownership reappeared
confirm AssemblyPrimitiveMesh has no store subscriptions or pointer handlers
confirm generated custom geometries use disposal where owned by the component
confirm camera commands are not active toolbar tools
confirm AI panel does not import scene store or mutate the scene unless command-layer work intentionally added it
confirm Zustand selectors do not return newly-created arrays/objects directly when that can cause render loops
```

When the full project is available, also run:

```bash
npm run lint
npm run build
npm run test
```

If full project config is not available, state that clearly instead of claiming the real build passed.

## 38. Manual behavior checks after cleanup/performance work

After cleanup/performance work, manually test:

```txt
1. Select a cabinet by clicking any visible primitive part.
2. Confirm selected blue bound is consistent in perspective, floor plan, and elevation.
3. Drag a cabinet in floor plan.
4. Drag a cabinet in elevation.
5. Rotate a selected cabinet in floor plan.
6. Place a cabinet in floor plan.
7. Place a cabinet in elevation.
8. Select assembly + assembly, reservation zone + reservation zone, and assembly + reservation zone.
9. Confirm mixed scene-entity selected boxes, group guides, duplicate, delete, drag, undo, and redo work.
10. Confirm single assembly properties still work.
11. Confirm single reservation-zone properties still work.
12. Confirm mixed scene-entity selection shows the multi-selection panel, not a single-object editor.
13. Draw a wall segment in floor plan.
14. Confirm wall drawing does not activate in perspective/elevation.
15. Select wall segments and edit wall height/thickness.
16. Confirm selected wall elevation navigator still works.
17. Confirm locked wall elevation view still fits the wall/view-zone rectangle.
18. Confirm padding mask covers outside the elevation view-zone.
19. Confirm floor plan zoom/fit works.
20. Confirm perspective pan/rotate/zoom/fit works.
21. Confirm camera states persist when switching views.
22. Place a countertop slab plus drop-in sink/cooktop and confirm cutouts appear.
23. Move sink/cooktop and confirm cutouts follow.
24. Place wall window/door and confirm derived wall opening appears.
25. Confirm normal cabinets do not create wall/countertop cutout work.
26. Place, drag, rotate, duplicate, edit, and delete a design reservation zone.
27. Confirm AI chat stores local messages only and does not change the scene.
28. Confirm undo/redo/restore behavior still works after scene edits.
29. Confirm Delete/Backspace/Escape keyboard behavior still works outside inputs.
```

## 39. Implementation standard

For cleanup work:

```txt
keep behavior unchanged unless explicitly requested
make small focused changes
rename/move the real thing, not alias wrappers
update every call site
delete stale files
avoid compatibility shims
avoid bridge files
avoid fake migrations
preserve source-of-truth scene data
preserve derived wall/countertop cutout behavior
preserve scene-entity selected behavior
preserve elevation view-zone/padding-mask behavior
preserve camera feel
verify imports
run syntax/build checks when possible
```

For feature work:

```txt
keep implementation small and testable
avoid changing unrelated behavior
add pure domain helpers under engine
add UI behavior under features/kitchen-editor
add store mutations through focused scene action modules
add/update checks for changed behavior when project config is available
```

For behavior-sensitive work:

```txt
separate risky behavior changes from safe organization/performance work
preserve placement/drag/delete behavior unless explicitly changed
preserve elevation drag frame behavior unless explicitly changed
test wall and countertop cutouts after derived-source/caching changes
test wall elevation mask/navigation after wall geometry changes
test catalog loading after registry/parser changes
test front outlines after front-outline changes
test reservation zone placement/drag/rotation after scene-entity changes
test selected bounds in all three view modes after selection/rendering changes
```

## 40. Recommended next cleanup targets

Safe next targets:

```txt
small property panel memo cleanup
catalog loading / raw-definition parser review
front-outline render cost audit
AI command-layer planning for one deterministic command
full project lint/build/test once package config is available
```

Avoid starting risky changes such as:

```txt
pointer throttling
global mutable geometry caches
snapping-score changes
collision validation rewrites
AI auto-placement engine
manual cutout editing comeback
```

Start those only after current behavior has a manual regression pass and the feature scope is explicit.
