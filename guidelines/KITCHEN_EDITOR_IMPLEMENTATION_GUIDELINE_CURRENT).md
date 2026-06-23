# Kitchen Editor Implementation Guideline — Current Codebase

This guideline describes the current `src` architecture after the SceneEntity spatial-guide cleanup. Use it as the maintenance and implementation reference for future work. It is written for the current codebase only; do not treat older phase names, older guide folders, or previous migration plans as current architecture.

The core direction is:

```txt
DesignScene source of truth
-> derived SceneEntity / wall geometry
-> SpatialSceneSnapshot
-> SceneEntity operation actions
-> spatial guide solvers
-> dumb render layers and UI overlays
```

The goal of future implementation is to preserve existing visible behavior while keeping ownership clear, avoiding duplicate geometry computation, and avoiding compatibility-style leftovers.

---

## 1. Source-of-truth scene model

`DesignScene` is the runtime source of truth:

```ts
export type DesignScene = Readonly<{
  sceneEntities: readonly SceneEntity[];
  placedWallGraphs: readonly PlacedWallGraph[];
  activeSelection: SceneSelection | null;
  activeSceneOperation: SceneOperation | null;
}>;
```

Do not add separate live scene arrays such as:

```txt
placedAssemblies
designReservationZones
wallOpeningEntities
measurementEntities
alignmentEntities
```

Placed assemblies and reservation zones are stored only through `sceneEntities`. When a child-specific collection is needed, derive it through collection readers such as:

```ts
getPlacedAssembliesFromSceneEntities(...)
getDesignReservationZonesFromSceneEntities(...)
getSceneEntityByRef(...)
getSceneEntitiesByRefs(...)
```

Derived local arrays are allowed in renderers, cutout derivation, camera-fit helpers, and selection helpers only when they are computed from `sceneEntities`. They must not become a `DesignScene` field or a second source of truth.

---

## 2. SceneEntity parent model

`SceneEntity` is the parent model for selectable and movable design objects.

```ts
export type SceneEntityKind = "placed-assembly" | "design-reservation-zone";

export type SceneEntityBase<TKind extends SceneEntityKind> = Readonly<{
  id: string;
  entityKind: TKind;
  worldPositionInches: Point3DInches;
  rotationDegrees: Readonly<{ zDegrees: number }>;
}>;

export type SceneEntity = PlacedAssembly | DesignReservationZone;
```

`worldPositionInches` is the center of the SceneEntity volume. `zInches` is vertical center, not bottom.

Distance from floor is derived:

```ts
const distanceFromFloorInches =
  sceneEntity.worldPositionInches.zInches -
  getSceneEntitySizeInches(sceneEntity).heightInches / 2;
```

Do not add `baseCenterPointInches` or bottom-position fields.

---

## 3. Child responsibilities

### PlacedAssembly owns assembly-specific behavior

PlacedAssembly owns:

```txt
definitionId
configuration
catalog selection
assembly dimension controls through configuration
assembly option groups
assembly tree building
primitive assembly rendering
front outline rendering
countertop cutout behavior
wall cutout behavior
placed assembly candidate creation
```

PlacedAssembly must not own generic SceneEntity behavior such as movement, alignment, selected highlights, delete, duplicate, group behavior, wall measurement guides, or shared transform editing.

### DesignReservationZone owns reservation-zone-specific behavior

DesignReservationZone owns:

```txt
reservedFor
sizeInches
default purpose/default dimensions
zone visual rendering
reservation-zone candidate creation
reservation-zone-specific property editing
```

Reservation zones use `worldPositionInches`, not `baseCenterPointInches`.

---

## 4. Parent-owned SceneEntity behavior

Generic behavior belongs to SceneEntity ownership:

```txt
identity and refs
transform access/mutation
size access
distance-from-floor derivation
bounds and footprints
selected highlight
floor-plan edit controls
rotation controls
placement lifecycle
move lifecycle
rotation lifecycle
alignment and alignment guide generation
wall measurement guide generation
group selection, group movement, and group guides
delete / duplicate
shared transform property editing
history for SceneEntity actions
keyboard delete/cancel behavior
```

Do not duplicate these responsibilities in PlacedAssembly, DesignReservationZone, or React render layers.

---

## 5. SceneEntity transform, collection, and bounds ownership

### Transforms

Transform helpers belong in:

```txt
src/engine/scene-entities/sceneEntityTransforms.ts
```

This file owns:

```ts
getSceneEntitySizeInches(...)
getSceneEntityDistanceFromFloorInches(...)
createSceneEntityWithWorldPosition(...)
createSceneEntityWithRotationZ(...)
createSceneEntityWithDistanceFromFloor(...)
createSceneEntityWithHeightPreservingDistanceFromFloor(...)
```

### Collection editing

Collection editing belongs in:

```txt
src/engine/scene-entities/sceneEntityCollectionEditing.ts
```

This file owns:

```ts
getPlacedAssembliesFromSceneEntities(...)
getDesignReservationZonesFromSceneEntities(...)
getSceneEntityByRef(...)
getSceneEntitiesByRefs(...)
replaceSceneEntity(...)
replaceSceneEntities(...)
removeSceneEntities(...)
duplicateSceneEntities(...)
```

Avoid repeated local map/filter mutation logic inside action modules.

### Bounds

Bounds entry point:

```txt
src/engine/scene-entities/sceneEntityBounds.ts
```

Shared callers should use:

```ts
createSceneEntityBounds(...)
createSceneEntityBoundsForRefs(...)
```

Child-specific bounds builders stay focused:

```txt
placedAssemblySceneEntityBounds.ts
designReservationZoneSceneEntityBounds.ts
```

---

## 6. Movement frame model

SceneEntity movement uses a movement frame:

```txt
floor-plane      -> floor/perspective movement
wall-face-plane  -> elevation movement
```

Current owner:

```txt
src/engine/scene-entities/sceneEntityMovementFrame.ts
```

Floor/perspective:

```txt
horizontal axis = world X
vertical axis   = world Y
normal axis     = world Z
```

Elevation:

```txt
horizontal axis = active wall-face direction
vertical axis   = world Z
normal axis     = outward wall-face direction
```

Elevation movement should preserve depth from the wall face. Alignment and measurement in elevation should ignore depth for solving; depth is only used to render overlays in front of objects/walls.

Do not create small wrapper files around movement-frame functions. If a movement helper is generic, put the real implementation in the movement-frame owner and import it directly.

---

## 7. Spatial guide architecture

SceneEntity alignment and SceneEntity wall-distance measurement are implemented through the spatial-guide system:

```txt
src/engine/scene-entities/spatial-guides/
```

Important files:

```txt
spatialGuideFrame.ts
spatialGuideProjection.ts
spatialGuideOverlay.ts
spatialSceneSnapshot.ts
sceneEntitySpatialGuideEngine.ts
spatialGuideTypes.ts
spatialGuideConstants.ts
alignment/spatialAlignmentTargets.ts
alignment/spatialAlignmentSolver.ts
alignment/spatialAlignmentSegments.ts
measurement/spatialMeasurementSolver.ts
measurement/spatialMeasurementGeometry.ts
measurement/spatialPlanMeasurementSolver.ts
measurement/spatialElevationMeasurementSolver.ts
measurement/spatialFloorMeasurementSolver.ts
```

The spatial-guide system solves in a projected 2D guide plane:

```txt
Floor plan / perspective:
  U = world X
  V = world Y
  N = world Z

Elevation:
  U = along active wall face
  V = world Z
  N = depth from wall face
```

Solvers compare `U` and `V`. `N` is render placement only.

---

## 8. SpatialSceneSnapshot ownership

`SpatialSceneSnapshot` is the shared derived geometry cache for spatial guides:

```txt
src/engine/scene-entities/spatial-guides/spatialSceneSnapshot.ts
```

It centralizes geometry that alignment and measurement both need:

```txt
scene entity bounds records
projected scene entity subjects
plan wall alignment edge records
plan wall measurement edges
elevation wall-face bounds
elevation wall-face subject
```

Alignment and measurement should consume the snapshot. They should not separately rebuild the same wall edges, active elevation wall-face projection, or SceneEntity target subjects.

Allowed flow:

```txt
sceneEntities + placedWallGraphs + spatialGuideFrame
-> createSpatialSceneSnapshot(...)
-> alignment target selection
-> measurement guide solving
```

Avoid this repeated flow in solvers:

```txt
placedWallGraphs
-> createWallGraphs3DEdges(...)
-> filter edges again
-> project active wall face again
```

The snapshot is derived. It must not be stored inside `DesignScene`. It can be memoized by render/view code and can later be cached inside operation sessions.

---

## 9. Alignment behavior contract

Alignment is SceneEntity-owned and produced by the spatial-guide system.

### Floor plan and perspective-plan movement

Preserve:

```txt
object-to-object alignment
object-to-finite-wall-edge alignment
object-to-finite-wall-centerline alignment
guide lines extend between moving bounds and target bounds
```

Wall targets must be finite. Do not use infinite wall lines for guide spans.

### Elevation movement

Elevation behaves like a flat 2D wall-face drafting plane.

Preserve:

```txt
object-to-object alignment
object-to-active-wall-face left/center/right alignment
object-to-active-wall-face bottom/center/top alignment
depth from wall face ignored for snapping
red view-zone ignored for snapping
mask pixels ignored for snapping
guide lines render in front and extend fully to target bounds
```

### Candidate priority

When snap distances tie, object-to-object should win over wall-face, wall-face should win over wall-centerline, and wall-centerline should win over floor-line. This prevents object-to-object guides from disappearing when a wall/floor target has the same distance.

---

## 10. Measurement distance behavior contract

SceneEntity wall-distance measurement belongs to the spatial-guide system, but it is separate from alignment. Alignment asks what an object should snap to. Measurement asks what distance should be displayed.

### Floor plan measurement

Preserve:

```txt
2D object footprint / projected bounds to finite wall footprint edge
measurement ray must hit a real finite wall edge
no hit = no guide
```

Do not show distance guides that project through empty space without a finite wall hit.

### Perspective measurement

Preserve the current perspective contract:

```txt
perspective measurement = floor-plan XY wall-distance measurement + optional floor-distance guide
```

Do not replace it with true 3D nearest-wall measurement. Perspective looks 3D, but its wall-distance logic is plan-based.

### Elevation measurement

Preserve:

```txt
project object bounds into active wall-face plane
measure to active wall-face rectangle boundaries
depth ignored
measurement line rendered as a WebGL overlay
measurement label rendered as a top-level DOM overlay above the elevation mask
```

Do not use red view-zone bounds for elevation measurement. Do not use screen-space mask pixels as measurement targets.

---

## 11. Overlay rendering policy

Spatial guide engine outputs world-space guide geometry. Render layers draw it.

### Alignment guides

Renderer:

```txt
src/features/kitchen-editor/rendering/scene-entities/SceneEntityAlignmentGuides.tsx
```

Alignment lines should render as WebGL overlays with depth disabled and a high render order.

### Measurement lines

Renderer:

```txt
src/features/kitchen-editor/rendering/scene-entities/SceneEntityWallMeasurementGuides.tsx
```

Measurement lines should render like alignment lines: WebGL overlay, depth disabled, high render order.

### Elevation measurement labels

Elevation labels use a DOM overlay:

```txt
SceneEntityWallMeasurementLabelProjector.tsx
SceneEntityWallMeasurementLabelsOverlay.tsx
```

The projector converts engine-produced label world points into screen pixels. The overlay displays the value above the elevation mask and clamps the label inside the visible wall-face frame.

The projector and overlay must not compute distances, wall hits, or measurement targets. They are presentation-only.

Current store field:

```txt
activeSceneEntityWallMeasurementLabelScreenItems
```

This is render/UI state, not `DesignScene` state. Do not record it in history. Do not use it as measurement source-of-truth.

---

## 12. Placement lifecycle

Use one placement operation:

```txt
scene-entity-placement
```

Parent-owned placement action:

```txt
src/engine/scene/actions/sceneEntityPlacementActions.ts
```

Parent-owned placement surface:

```txt
src/features/kitchen-editor/interaction/scene-entities/SceneEntityPlacementSurface.tsx
```

Child-specific candidate creation is allowed:

```txt
PlacedAssembly candidate = catalog/configuration-specific setup
DesignReservationZone candidate = reservation-zone defaults
```

But once a candidate exists, the SceneEntity placement lifecycle owns:

```txt
waiting-for-pointer / positioned state
pointer updates
movement frame
spatial alignment
candidate positioning
commit/cancel
selection after commit
history entry
```

Do not reintroduce separate placement lifecycles for assemblies or reservation zones.

---

## 13. Move lifecycle

Use one move drag lifecycle:

```txt
scene-entity-move
```

Parent-owned move action:

```txt
src/engine/scene/actions/sceneEntityMoveActions.ts
```

Parent-owned move surface:

```txt
src/features/kitchen-editor/interaction/scene-entities/SceneEntityMoveDragSurface.tsx
```

Single-object and multi-object movement use the same drag state. A single drag is a one-item SceneEntity move.

Move updates should:

```txt
use the active movement frame
use the spatial guide engine for snapping/guides
preserve elevation depth from the active wall face
update activeSceneEntityAlignmentGuides
record history only on committed change
```

Avoid geometry wrappers whose only purpose is to rename another movement-frame function.

---

## 14. Rotation lifecycle

Use one rotation lifecycle:

```txt
scene-entity-rotation
```

Parent-owned rotation action:

```txt
src/engine/scene/actions/sceneEntityRotationActions.ts
```

Parent-owned rotation surface:

```txt
src/features/kitchen-editor/interaction/scene-entities/SceneEntityRotationSurface.tsx
```

Rotation control renderer:

```txt
src/features/kitchen-editor/rendering/scene-entities/SceneEntityRotationControl.tsx
```

Rotation is floor-plan-only. It should finish on window pointer-up so it does not get stuck if released outside the object. The handle angle should remain where the user released it by using `lastRotationHandleCenterAngleDegreesBySceneEntityKey` UI state.

Do not recreate old floor-plan-only naming or child-specific rotation controls.

---

## 15. Selection, selected visuals, and properties

SceneEntity selected visuals belong under:

```txt
src/features/kitchen-editor/rendering/scene-entities/
```

This area owns:

```txt
SelectedSceneEntityLayer
SceneEntityVolumeBoundingBox
SceneEntityFloorPlanEditControls
SceneEntityRotationControl
SceneEntityGroupGuides
SceneEntityAlignmentGuides
SceneEntityWallMeasurementGuides
SceneEntityWallMeasurementLabelProjector
SceneEntityWallMeasurementLabelsOverlay
```

Shared transform editing belongs in:

```txt
src/engine/scene/actions/sceneEntityTransformEditingActions.ts
src/features/kitchen-editor/properties-panel/scene-entities/
```

The shared transform section owns:

```txt
X position
Y position
Distance from floor
Rotation
```

Assembly property panels keep dimensions/options/configuration-specific fields. Reservation-zone property panels keep reservation-zone-specific fields.

Do not show a single-object child-specific editor for mixed or multi SceneEntity selection.

---

## 16. Wall system boundary

Walls are not SceneEntities. Keep wall-specific behavior separate:

```txt
wall graph topology
wall segment splitting/merging
wall segment selection
wall elevation navigation
wall face side settings
wall geometry
wall openings
wall plan length measurements
wall opening plan measurements
wall drawing/draft behavior
```

SceneEntities may align to wall faces, wall centerlines, and active elevation wall-face boundaries through spatial guide subjects, but walls remain their own editing family.

Do not create `WallSceneEntity`, `WallFaceSceneEntity`, `WallOpeningSceneEntity`, `MeasurementSceneEntity`, or `AlignmentSceneEntity`.

---

## 17. Door/window wall-opening outline

The black wall-opening intersection outline is a floor-plan-only wall feature:

```txt
src/features/kitchen-editor/rendering/walls/WallOpeningIntersectionOutlines.tsx
```

Behavior contract:

```txt
renders only in floor plan
renders above the wall
has clickable/drag target behavior
selects and moves the source door/window PlacedAssembly
hidden in perspective
hidden in elevation
```

Do not implement this as a perspective feature. Do not create a separate wall-opening scene entity. The source remains the door/window placed assembly.

---

## 18. Derived cutout behavior

Countertop openings and wall openings are derived from placed assemblies through the assembly/catalog/wall/countertop systems.

Cutout behavior remains PlacedAssembly-specific and should read placed assemblies derived from `sceneEntities`.

Do not move cutout behavior to generic SceneEntity. Do not align or measure against derived cutout/opening targets. Align and measure against source SceneEntities and wall geometry.

---

## 19. Rendering ownership

Rendering should be dumb where possible.

Child-specific renderers:

```txt
AssemblyLayer
PlacedAssemblyRenderer
AssemblyRenderer
AssemblyPrimitiveMesh
AssemblyFrontOutlineLines
DesignReservationZoneLayer
DesignReservationZoneRenderer
DesignReservationZonePlacementCandidateRenderer
```

SceneEntity renderers:

```txt
SelectedSceneEntityLayer
SceneEntityVolumeBoundingBox
SceneEntityFloorPlanEditControls
SceneEntityRotationControl
SceneEntityGroupGuides
SceneEntityAlignmentGuides
SceneEntityWallMeasurementGuides
SceneEntityWallMeasurementLabelProjector
SceneEntityWallMeasurementLabelsOverlay
```

Render components should not compute spatial alignment candidates, wall hit tests, or distance measurements. They should draw engine-produced geometry and UI labels.

---

## 20. Zustand selector rules

Subscribe to stable source values first.

Preferred:

```ts
const sceneEntities = useDesignSceneStore((state) => state.designScene.sceneEntities);
const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);

const selectedRefs = useMemo(
  () => getSceneEntityRefsFromSelection(activeSelection),
  [activeSelection],
);
```

Avoid selectors that return freshly created arrays or objects directly from the store selector.

Derived arrays, maps, and snapshots should generally be created with `useMemo` outside the store selector.

---

## 21. Naming rules

Use current names for current behavior:

```txt
SceneEntity
SceneEntityRef
SceneEntityBounds
SceneEntityMovementFrame
SpatialGuideFrame
SpatialSceneSnapshot
SpatialGuideSubject
SceneEntityAlignmentGuide
SceneEntityWallMeasurementGuide
SceneEntityPlacementSurface
SceneEntityMoveDragSurface
SceneEntityRotationSurface
SceneEntityRotationControl
```

If a type/file is no longer child-specific, rename/move the real thing and update all imports directly. Do not add re-export bridge files.

Avoid names that imply fake scene entities for walls, measurements, or alignment.

---

## 22. No fake abstraction, tiny-file, or needless-indirection rule

A small file, helper, wrapper, adapter, or function is acceptable only when it owns a real responsibility. Do not add an abstraction just to make an implementation look organized.

A file being short is not automatically wrong. Some short files are valid when they define an important type, constant set, public boundary, or focused renderer. The red flag is a tiny file whose only purpose is to forward, rename, hide, or duplicate logic that already has a clear owner.

Bad tiny-file patterns:

```txt
file exists only because the AI wanted a new file for a tiny change
file contains one function that just calls another function with the same args
file contains one re-export to preserve an old import path
file contains a helper used once and hiding a simple expression
file contains a renamed copy of logic that already exists elsewhere
file exists only to avoid updating imports after a real file was moved
file splits one concept so far that the caller must jump across many files to read a simple flow
```

Bad wrapper patterns:

```txt
file only re-exports another file under a different name
function only forwards the same arguments to another function
helper only renames a concept without changing behavior
adapter with no real adaptation
wrapper created only to avoid updating imports
temporary migration path kept in the codebase
old-name compatibility layer
catch-all utils file with unrelated helpers
one-line indirection that hides the real owner
```

Bad example:

```ts
export * from "../real-owner/realFile";
```

Bad example:

```ts
export function createThing(args: ThingArgs): Thing {
  return createRealThing(args);
}
```

Preferred pattern:

```txt
move or rename the real owner
update every import directly
delete the old file
run import/export checks
```

A wrapper is allowed only when it adds a real boundary, for example converting external input, normalizing data, enforcing an invariant, adapting a third-party API, or defining a stable public API for a real subsystem. The wrapper must have a name that explains that responsibility.

When adding a file, ask:

```txt
Does this file own a behavior, invariant, type family, renderer, or public subsystem boundary?
Would deleting this file and importing the real owner directly keep the code clearer?
Is this logic already implemented somewhere else?
Will future maintainers know where to change this behavior?
```

If the answer shows the file is only tiny indirection, do not add it.

### No repeated logic rule

Before adding a helper or implementation block, search for an existing owner and reuse it. Repetition is a red flag even when the copied code is small.

Do not duplicate these common logic families:

```txt
SceneEntity bounds calculation
SceneEntityBounds -> SpatialGuideBounds projection
wall edge extraction from placed wall graphs
active elevation wall-face projection
plan ray / finite wall edge intersection
measurement label formatting
overlay point creation
movement-frame point projection
low-level vector math helpers
selection ref extraction
scene entity replacement/removal/duplication collection edits
```

Preferred pattern:

```txt
find the real owner
import the owner directly
extend the owner only if the responsibility belongs there
keep one source for each calculation
```

If no owner exists, create one focused owner instead of copying the same logic into multiple feature files.

---

## 23. Common implementation red flags

Treat these as strong warnings during code review. Not every text match is automatically wrong, but every match must be reviewed. Prefer removing the pattern instead of documenting around it.

### Source-of-truth drift

Do not create a second source of truth for data already represented by `DesignScene`, `SceneEntity`, `PlacedWallGraph`, or `SpatialSceneSnapshot`.

Red flags:

```txt
new live arrays beside sceneEntities
new live wall-opening or measurement entity arrays
duplicated position fields for the same object
render-only screen coordinates stored as design data
SpatialSceneSnapshot stored as persistent design data
selection state duplicated in child feature state
```

Acceptable: local derived arrays produced from `sceneEntities` using collection readers, as long as they are not written back as independent source-of-truth fields.

### Ownership boundary leaks

Generic scene behavior belongs to the SceneEntity layer or the spatial-guide engine. Child domains own only child-specific data and rendering.

Red flags:

```txt
assembly-only or reservation-zone-only implementation for generic move/place/rotate behavior
child-specific active guide arrays for generic guides
child-specific drag surfaces for generic SceneEntity drag behavior
wall, measurement, alignment, or guide objects introduced as fake SceneEntities
feature-layer React components calculating engine geometry
engine modules importing from features
```

Acceptable: child-specific candidate creation and child-specific property editors, as long as shared lifecycle and scene mutation remain SceneEntity-owned.

### Fake migration / compatibility / wrapper code

Do not leave migration scaffolding in the current codebase.

Search terms to review:

```txt
compat
compatibility
bridge
alias
shim
legacy
migration
migrate
wrapper
adapter
temporary
todo remove
old path
old name
```

These terms are not automatically wrong. They are red flags when they indicate an old-name re-export, fake bridge file, temporary path, or wrapper with no real behavior.

### Tiny file and needless-file red flags

Avoid creating a new file for a tiny change unless the file owns a real concept. A small file is acceptable for important types/constants or a focused component, but it is not acceptable when it only hides a one-line call or duplicates an existing owner.

Red flags:

```txt
new file contains only one trivial forwarding function
new file contains only an old-name re-export
new file exists only to make the diff look organized
new file duplicates a helper from spatialGuideProjection, spatialSceneSnapshot, or movement-frame code
new file is named helper/utils/common but has no clear domain owner
new file forces readers to jump through indirection for a simple behavior
```

Preferred: add the code to the real owner, or rename/move the real owner and update imports directly.

### Repetition and duplicate-logic red flags

Do not copy/paste calculation logic when an existing owner can be imported. Repeated code makes the guide system harder to reason about and causes future floor-plan/elevation/perspective drift.

Red flags:

```txt
same geometry calculation appears in alignment and measurement
same wall extraction appears in more than one solver
same SceneEntity projection appears outside spatialGuideProjection or SpatialSceneSnapshot
same elevation wall-face bounds are recomputed outside the snapshot
same label formatting appears in multiple renderers
same ray intersection math appears in multiple files
same movement delta projection is implemented separately for move and placement
same selection/ref filtering is implemented by local map/filter instead of collection readers
```

Preferred: centralize repeated logic in the correct owner and import it. If the owner is unclear, create one focused owner and remove the duplicates in the same change.

### Unnecessary helper/function/file

Do not split code into tiny files or helpers unless the split reduces complexity or creates a real owner.

Red flags:

```txt
helper used once and hiding a simple expression
function name repeats the caller intent but does not own behavior
file contains only one trivial forwarding function
utility file mixes unrelated geometry, rendering, and state helpers
helper accepts broad objects when it only needs one field
helper returns a renamed copy of its input
```

Preferred: keep simple logic inline until it repeats or becomes a real concept. When extracting, name the helper after the invariant or transformation it owns.

### Redundant computation

Shared derived geometry must be built once and reused. `SpatialSceneSnapshot` is the owner for guide-related derived scene and wall geometry.

Red flags:

```txt
extracting wall edges separately in alignment and measurement
projecting the same SceneEntity bounds in multiple solvers
projecting the active elevation wall face separately in alignment and measurement
recreating SpatialSceneSnapshot inside each solver instead of passing it in
copy-pasted vector math helpers across files
renderer recomputes measurement or alignment geometry already produced by the engine
```

Preferred flow:

```txt
sceneEntities + placedWallGraphs + SpatialGuideFrame
  -> SpatialSceneSnapshot
  -> alignment solver and measurement solver consume the snapshot
```

### Spatial guide contract violations

The spatial guide engine solves alignment and measurement in the active 2D guide frame. Rendering converts the result to world/screen overlays.

Red flags:

```txt
red view-zone snapping in elevation
mask-pixel snapping or measurement
screen-space measurement geometry
true 3D perspective wall-distance measurement
using depth to block elevation alignment or elevation measurement
React-side alignment solving
React-side measurement solving
bypassing SpatialSceneSnapshot for wall/entity target geometry
```

Perspective measurement must remain plan XY wall distance plus optional floor-distance guide. Elevation guide solving must ignore depth and use the active wall-face plane.

### Measurement and overlay red flags

Measurement geometry belongs to the spatial-guide engine. Label presentation belongs to the rendering layer.

Red flags:

```txt
measurement label screen position used as measurement source
Drei/DOM label computes distance or wall hit
line and label generated from different geometry
label visibility fixed by changing measurement math
render-order patch used to hide a geometry bug
per-frame screen projection stored as persistent design scene data
```

Acceptable: a render-only label projector converting engine-produced label world points to screen pixels for a DOM overlay.

### State and history red flags

Do not persist transient interaction or presentation details as real design state.

Red flags:

```txt
history entries for hover, guide-only updates, pointer preview, camera state, or label projection
active guide arrays stored inside DesignScene
DOM overlay state stored as design data
snap candidates stored after the operation finishes
operation caches treated as scene truth
```

Committed placement, movement, rotation, delete, duplicate, and transform edits should record history. Preview-only state should not.

### Rendering responsibility red flags

Renderers should draw prepared data. They should not decide geometry behavior.

Red flags:

```txt
renderer filters wall edges for measurement
renderer chooses alignment candidates
renderer mutates scene entities directly
renderer duplicates projection math from the engine
selected highlight layer owns child-specific behavior
measurement label overlay owns measurement rules
```

Preferred: engine produces world-space guide primitives and label anchors; renderers only display them.

### Dependency and import red flags

Keep engine, features, and UI boundaries clean.

Red flags:

```txt
engine importing from features
engine importing React components
feature renderer importing private action internals when a public action exists
circular imports between spatial-guides, scene actions, and rendering
barrel exports that hide ownership or create cycles
```

### Naming red flags

Names should describe current ownership and behavior.

Red flags:

```txt
names that imply walls, measurements, alignments, or overlays are SceneEntities
names that imply a file is temporary or transitional
names that describe an old implementation instead of the current owner
catch-all names such as misc, common, helpers, utils for unrelated behavior
```

Rename the real owner and update imports directly. Do not keep an old name as an alias.

### Behavior-changing cleanup red flags

Cleanup must preserve the current feature contract unless the task explicitly asks for behavior change.

Red flags:

```txt
changing perspective measurement to true 3D while refactoring
making elevation alignment depend on depth while cleaning code
removing floor-plan wall hit validation from measurement guides
moving wall-opening outline behavior into the spatial guide engine
combining wall length labels with SceneEntity wall measurement guides
```

When simplifying, first state the behavior contract, then prove the new implementation preserves it.

---

## 24. Verification checklist

Minimum checks when only `src` is available:

```txt
TypeScript syntax/transpile check across src/**/*.ts(x)
local import existence check
named import/export check
JSON parse check for catalog JSON
red-flag search for fake wrappers, bridges, aliases, shims, migration paths, and unused helpers
confirm no engine imports from features
confirm no fake alias/bridge/compatibility files were added
confirm no one-line forwarding wrapper/helper files were added
confirm no unnecessary tiny files were added for one-function indirection
confirm no new helper duplicates logic that already has an owner
confirm no duplicate selected SceneEntity ownership reappeared
confirm no repeated wall-edge extraction or SceneEntity projection was added outside SpatialSceneSnapshot
confirm no duplicated label formatting, overlay point creation, or ray-intersection helpers were added
confirm SpatialSceneSnapshot is consumed by alignment and measurement
confirm perspective measurement remains plan XY + optional floor distance
confirm elevation guide solving ignores depth
confirm elevation measurement labels are presentation-only DOM overlay
confirm AssemblyPrimitiveMesh remains visual-only
confirm AI panel does not mutate the scene directly
```

When the full project is available, run:

```txt
npm run lint
npm run build
npm run test
```

---

## 25. Manual regression checklist

After SceneEntity or spatial-guide work, test:

```txt
1. Select assembly in perspective, floor plan, and elevation.
2. Select reservation zone in perspective, floor plan, and elevation.
3. Place assembly in floor plan.
4. Place reservation zone in floor plan.
5. Drag assembly in floor plan.
6. Drag reservation zone in floor plan.
7. Drag assembly in elevation.
8. Drag reservation zone in elevation.
9. Multi-select assembly + assembly.
10. Multi-select reservation zone + reservation zone.
11. Multi-select assembly + reservation zone.
12. Confirm group guides and group movement.
13. Rotate assembly in floor plan.
14. Rotate reservation zone in floor plan.
15. Release rotation pointer outside object and confirm rotation finishes.
16. Confirm rotation handle stays where pointer was released.
17. Floor plan: object-to-object alignment guide extends between objects.
18. Floor plan: object-to-wall-edge guide extends to finite wall edge.
19. Floor plan: object-to-wall-centerline guide extends to finite wall centerline.
20. Floor plan: measurement guide shows only when ray hits finite wall edge.
21. Floor plan: measurement guide hides when ray passes through empty space.
22. Perspective: measurement matches floor-plan XY wall distance behavior.
23. Perspective: floor-distance guide appears only when object floats above floor.
24. Elevation: object-to-object alignment ignores depth.
25. Elevation: object-to-wall-face alignment ignores depth.
26. Elevation: guide extends fully to object or wall-face target.
27. Elevation: measurement line renders above wall/object.
28. Elevation: measurement label remains visible above mask.
29. Floor plan: door/window black wall-opening outline is visible and draggable.
30. Perspective: door/window black wall-opening outline is hidden.
31. Elevation: door/window black wall-opening outline is hidden.
32. Confirm wall length labels still render in floor plan.
33. Confirm wall drawing still works only in floor plan.
34. Confirm wall segment editing still works.
35. Confirm wall elevation navigator still works.
36. Confirm sink/cooktop countertop cutouts still derive from placed assemblies.
37. Confirm door/window wall openings still derive from placed assemblies.
38. Duplicate selected SceneEntities.
39. Delete selected SceneEntities.
40. Undo/redo placement, move, rotation, duplicate, and delete.
41. Confirm AI panel does not mutate the scene directly.
```

---

## 26. Future cleanup direction

The current clean direction is good, but future cleanup should continue reducing duplicate derived geometry and render-only global state.

Preferred future direction:

```txt
cache SpatialSceneSnapshot per active operation session
split operation session state from action orchestration when needed
move all measurement labels to a single DOM overlay if perspective/floor-plan behavior can be preserved exactly
keep DesignScene pure
keep renderers dumb
```

Do not do large unrelated rewrites while changing guide behavior. Each cleanup phase should preserve visible behavior unless the task explicitly asks for a behavior change.
