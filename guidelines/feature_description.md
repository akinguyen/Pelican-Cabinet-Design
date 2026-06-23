# Kitchen Editor Feature Description

This document describes the currently implemented feature set in the uploaded `src` package. It is based on the codebase inspection and updates the provided feature description to match the actual runtime functions, components, data models, and known non-implemented areas. The package is a source-only Next/React kitchen editor prototype; it does not contain package metadata, tests, backend routes, or persisted document import/export flows.

## 1. Workspace layout

**Status:** Implemented

**Description:**  
The app opens directly into the Kitchen Editor and uses a three-column workspace: AI chat on the left, scene viewport in the center, and catalog/properties on the right.

**Functional Features:**

- `src/app/page.tsx` renders `KitchenEditorApp` directly.
- `KitchenEditorApp` installs global editor keyboard shortcuts and renders `KitchenWorkspaceShell` around `DesignSceneViewport`.
- `KitchenWorkspaceShell` manages a CSS grid with a left AI panel, center header/toolbar/viewport region, and right editor panel.
- The AI sidebar and editor sidebar collapse independently.
- Collapsing either side panel changes the grid column widths and expands the center viewport.
- The center area contains the workspace header, view-mode tabs, history/camera/tool toolbar, and React Three Fiber scene viewport.
- The right editor panel always hosts the catalog panel and overlays selected-object properties when a compatible selection exists.
- The header labels the app as `Kitchen Editor` and describes it as a `3D source-of-truth prototype`.

## 2. View modes and camera controls

**Status:** Implemented

**Description:**  
Perspective, Floor Plan, and Elevation are alternate views over the same runtime `DesignScene`. Each view has its own camera behavior and stored camera state.

**Functional Features:**

- View modes are represented by `SceneViewMode = "perspective" | "floor-plan" | "elevation"`.
- `SceneViewModeTabs` switches the active view in `useDesignSceneStore`.
- `DesignSceneCanvas` mounts the correct camera type for each mode: perspective camera for Perspective, orthographic cameras for Floor Plan and Elevation.
- Perspective uses orbit controls, perspective fit/zoom behavior, an axis gizmo, and a view gizmo.
- Floor Plan uses top-down orthographic orbit controls with rotate disabled.
- Elevation uses orthographic controls and, when a wall elevation target exists, locks the camera to the active wall-face frame.
- Toolbar camera commands support zoom out, zoom in, and fit view.
- Camera state is stored per view mode: one perspective state, one floor-plan state, a default elevation state, and keyed elevation states per wall-face view.
- Switching view mode clears camera command state, active scene-entity measurement label overlays, and incompatible floor-plan-only operations.
- Wall drawing is only enabled in Floor Plan.
- Draw Reservation Zone works in Perspective, Floor Plan, and Elevation through the shared scene-entity placement surface.
- Assembly placement also works through the shared scene-entity placement surface in Perspective, Floor Plan, and Elevation.

## 3. Runtime scene source of truth and history

**Status:** Implemented as runtime state; persisted document workflow not implemented

**Description:**  
`DesignScene` is the in-memory source of truth for editor state. Scene history supports runtime undo, redo, and restore but is not a persisted document contract.

**Functional Features:**

- `DesignScene` contains `sceneEntities`, `placedWallGraphs`, `activeSelection`, and `activeSceneOperation`.
- Scene entities currently include placed assemblies and design reservation zones.
- Wall segments live inside placed wall graphs rather than generic scene entities.
- `useDesignSceneStore` is a Zustand store composed from focused action factories.
- The initial scene is empty and starts in Perspective mode.
- History is stored as `past` and `future` arrays of scene snapshots.
- Up to 100 history entries are retained.
- Meaningful scene mutations record action-specific labels such as placing, moving, rotating, deleting, drawing, or editing entities/walls.
- Toolbar history controls expose Undo, Redo, and a Recent scene changes dropdown.
- Keyboard shortcuts support Ctrl/Meta+Z, Ctrl/Meta+Shift+Z, Ctrl/Meta+Y, Escape, Delete, and Backspace outside editable fields.
- Undo, redo, and history restore clear transient interaction state such as active drag, camera command, active toolbar tool, and alignment guides.
- There is no `DesignSceneDocument` schema, parser, creator, import/export flow, replace flow, server persistence, or document-level migration layer in the current package.

## 4. Scene entity selection and editing

**Status:** Implemented

**Description:**  
Placed assemblies and design reservation zones share generic scene-entity selection, multi-selection, movement, rotation, duplicate/delete, bounds, and measurement behavior. Wall segments remain a separate selection type because they have graph topology and wall-specific editing.

**Functional Features:**

- Users can select one placed assembly, one design reservation zone, or one wall segment.
- Users can multi-select placed assemblies and design reservation zones together with Shift, Ctrl, or Meta selection gestures in rendered entity components.
- Mixed scene-entity selections can include assemblies and design reservation zones in one selected group.
- `SceneSelection` supports single scene entity, multiple scene entities, and placed wall segment selections.
- Selected scene entities render shared bounds through `SelectedSceneEntityLayer` and `SceneEntityVolumeBoundingBox`.
- Multi-selected scene entities render group bounds and can be moved as a group.
- Single and group scene-entity movement use the same movement action pipeline.
- Duplicate and delete actions work for single and multi scene-entity selections.
- Mixed duplicate/delete operations are stored as one history entry for the user action.
- Single assembly selection opens assembly properties.
- Single design reservation zone selection opens reservation-zone properties.
- Single wall segment selection opens wall-segment properties.
- Multi scene-entity selection opens a summary/actions panel instead of a single-object editor.

## 5. Assembly workflows

**Status:** Implemented, with permissive placement validation

**Description:**  
Assemblies are catalog-backed scene entities built from raw JSON definitions and placed into the shared runtime scene.

**Functional Features:**

- Users select assembly definitions from the right catalog panel.
- Catalog selection creates a placed assembly with default configuration and starts a scene-entity placement candidate.
- Placement candidates initially wait for pointer movement, then become positioned and can be committed on click.
- Perspective and Floor Plan placement preserve the assembly's configured distance from floor.
- Elevation placement uses the active wall-face movement frame when available, offsets assemblies outward from the wall by half their depth, aligns rotation to the wall face, and clamps them above floor.
- Users can move assemblies in Perspective, Floor Plan, and Elevation.
- Users can rotate a single selected assembly in Floor Plan through the scene-entity rotation control.
- Rotation snaps to 45-degree increments within a 5-degree threshold.
- Users can edit assembly X/Y placement, distance from floor, rotation, dimensions, and option values from the properties panel.
- Height changes preserve distance from floor.
- Assemblies can be duplicated or deleted through shared scene-entity controls.
- Assembly rendering uses cached built assembly trees through `useAssemblyRenderItems`.
- Assembly placement remains permissive: the current code does not include production collision, overlap, or invalid-placement enforcement.

## 6. Design reservation zone workflows

**Status:** Implemented for user-authored reservation volumes; automatic cabinet generation not implemented

**Description:**  
A design reservation zone is a user-authored 3D reserved build volume for future kitchen planning. It is scene source-of-truth data, not a placed assembly and not an automatic cabinet generator.

**Functional Features:**

- `DesignReservationZone` is a generic scene entity with `entityKind: "design-reservation-zone"`.
- Supported purposes are island, peninsula, and tall pantry.
- Default dimensions are 72 × 36 × 34.5 inches for island and peninsula, and 36 × 24 × 84 inches for tall pantry.
- The Draw Reservation Zone toolbar tool starts an island reservation-zone placement candidate.
- The tool works in Perspective, Floor Plan, and Elevation.
- Placement preview appears under the pointer after pointer movement.
- Placement and movement use scene-entity alignment behavior against walls, assemblies, and other reservation zones.
- Floor-plan placement/selection measurements can show wall distances for reservation zones.
- Reservation zones can be selected, multi-selected with assemblies, moved, duplicated, deleted, rotated in Floor Plan, and edited in the properties panel.
- The properties panel supports purpose, X/Y placement, distance from floor, rotation, width, depth, height, duplicate, and delete.
- Changing the purpose applies that purpose's default dimensions while preserving distance from floor.
- Floor Plan renders reservation zones as dashed footprints derived from the same 3D zone geometry.
- Perspective and Elevation render reservation zones as transparent cuboids with segmented/dashed edges.
- Reservation-zone rendering participates in scene depth in Perspective and Elevation.
- Reservation zones do not automatically populate cabinets.
- Reservation zones do not create wall openings or countertop openings.

## 7. Wall workflows

**Status:** Implemented

**Description:**  
Walls are editable graph data. Users draw wall segments in Floor Plan, inspect wall measurements, navigate elevations, and edit wall segment settings.

**Functional Features:**

- The Draw Wall Segment toolbar tool is floor-plan only.
- Wall drawing starts a `wall-segment-draft` scene operation.
- Wall drawing supports empty point starts, snapping to existing wall nodes, snapping to existing segment bodies, segment splitting at inserted nodes, and graph merging.
- Horizontal and vertical guide snapping is implemented during wall drawing.
- Minimum committed wall segment length is 3 inches.
- Wall drawing preview preserves the current wall visual style and adds measurement/guide feedback.
- Active wall drawing renders red dashed alignment guide lines for horizontal/vertical snapping.
- Active wall drawing renders a draft segment measurement label and angle/corner guide labels based on the start anchor and current hover point.
- Wall anchor rings display active start/hover anchors while drawing.
- Users can select wall segments.
- Users can edit selected wall segment height and thickness.
- Users can edit preferred elevation view face side.
- Users can set side A and side B cabinet placement requirements: No cabinets, Optional, or Required.
- Wall deletion removes the segment, removes orphan nodes, splits disconnected graph components, and updates the elevation target if needed.
- Elevation mode supports wall-face navigation across wall segments and wall sides.
- The active wall elevation view derives its view zone, camera frame, padding mask, and face navigation labels from wall geometry.

## 8. Catalog browser and raw assembly definitions

**Status:** Implemented

**Description:**  
The right panel contains a catalog browser backed by raw JSON assembly definitions. Catalog cards display generated SVG previews and default size labels.

**Functional Features:**

- Catalog selector groups are Basic Units, Cabinets, Surfaces, Appliances, Openings, and Fixtures.
- The Cabinets group contains a type selector for Base Cabinets, Wall Cabinets, Pantry Cabinets, and Built-in Cabinets.
- Category selectors filter the active catalog type.
- Visible catalog categories are defined in `kitchenEditorCatalogConfig.ts`.
- Visible Basic Units categories are All, Panels, and Fillers.
- Door and drawer raw definitions exist, but their registry entries are internal because they do not include visible catalog IDs/categories.
- The uploaded codebase contains 45 raw JSON assembly definition files.
- Raw definitions are parsed, converted to `AssemblyDefinition`, registered in `kitchenEditorCatalogRegistry`, and displayed if marked visible.
- Catalog cards render generated SVG previews with light neutral styling instead of relying on external image files.
- Preview generation supports basic units, cabinet variants, surfaces, appliances, openings, fixtures, and a default box fallback.
- Catalog cards show definition name and formatted default dimensions.
- Raw definitions support dimensions, option groups, nested assemblies, primitive geometry components, include conditions, expression-based values, component roles, material overrides, front outline edges, and cutout behavior.
- Raw primitive geometry parser accepts box, cylinder, rectangular-frustum, and L-shaped prism definitions.
- Countertop slabs are raw box primitives with role `countertop-slab`; derived countertop openings can later convert those primitives into a generated `custom-mesh` countertop slab during render-tree processing.

## 9. Properties panel

**Status:** Implemented

**Description:**  
The selected-object properties overlay appears over the catalog area whenever the current selection can be edited.

**Functional Features:**

- `SelectedObjectPropertiesPanel` decides which properties UI to show from current selection and scene data.
- Single assembly properties show selected assembly identity, placement, dimensions, option groups, duplicate, and delete.
- Assembly dimension fields support select options, custom value mode where allowed, min/max/step constraints, and height preservation of distance from floor.
- Assembly option fields support checkbox, select, and numeric controls according to raw definition metadata.
- Single design reservation zone properties show identity, Reserved for, Placement, Dimensions, duplicate, and delete.
- Single wall segment properties show identity, wall face settings, read-only segment length, height, thickness, and delete.
- Multi scene-entity selection shows a summary with total selected, assembly count, reservation-zone count, duplicate selected, and delete selected.
- Mixed or multi scene-entity selection does not show a single-object editor.

## 10. Derived cutouts and openings

**Status:** Partially implemented: derived runtime geometry only

**Description:**  
Wall openings and countertop openings are derived from placed assemblies and active placement candidates when definitions declare cutout behavior. Manual opening/cutout editing is not implemented.

**Functional Features:**

- Wall openings are derived from placed assemblies and positioned assembly candidates that declare wall cutout behavior.
- Door/window assemblies can create wall openings through wall cutout behavior.
- Wall opening geometry includes wall-face axes, cut footprints, intersection outlines, and plan measurement guides.
- The wall renderer can display wall geometry with derived openings and opening outlines.
- Countertop openings are derived from countertop host assemblies and assemblies that declare countertop cutout behavior.
- Drop-in sink/cooktop-style assemblies can create countertop openings through countertop cutout behavior.
- Countertop opening logic clips requested polygons to the host countertop and applies openings to countertop slab primitives.
- Countertop slabs with openings are rendered as generated custom mesh geometry.
- Design reservation zones do not create wall openings or countertop openings.
- Manual wall opening editing is not implemented.
- Manual countertop cutout editing is not implemented.

## 11. Rendering and visual feedback

**Status:** Implemented

**Description:**  
The scene renderer composes wall, assembly, reservation-zone, selection, measurement, guide, and invisible interaction layers in React Three Fiber.

**Functional Features:**

- `DesignSceneCanvas` provides canvas, camera, lighting, grid, gizmos, controls, and pointer-missed selection clearing.
- `DesignSceneRenderer` composes wall, assembly, reservation-zone, placement, selection, measurement, alignment guide, drag surface, rotation surface, and wall-draft layers.
- Walls render committed segments, selected overlays, active elevation view zones, draft previews, plan measurements, wall openings, opening outlines, and opening measurements.
- Assemblies render built assembly trees, primitive meshes, primitive edge segments, and optional front outline lines in Elevation.
- Assembly render trees are cached with `useAssemblyRenderItems` and rebuilt when definitions/configuration/cutouts change.
- Reservation zones render as dashed footprints in Floor Plan and transparent volumes in Perspective/Elevation.
- Selected scene entities render volume bounding boxes in all views.
- Floor Plan selected single scene entities can show an interactive rotation handle.
- Scene-entity wall measurement guides are shared between assemblies and reservation zones.
- Floor Plan and Perspective render measurement labels through in-scene `Html` labels.
- Elevation projects measurement labels to screen overlay positions so labels can remain clipped within the active wall-face viewport mask.
- Alignment guides render snapping/alignment feedback during placement and movement.
- Generated component-owned geometries use explicit disposal where required.

## 12. Spatial alignment and measurements

**Status:** Implemented

**Description:**  
A shared spatial-guide engine aligns scene entities and generates wall measurement guides across movement frames.

**Functional Features:**

- Spatial guide frames abstract Floor Plan/Perspective movement as a floor plane and Elevation movement as a wall-face plane.
- Alignment targets include scene entities, wall faces, wall centerlines, and floor lines where applicable.
- Single-entity movement/placement and group movement use the same alignment engine.
- Group alignment uses the bounding subject of all moving entities.
- Alignment snap thresholds are 2 inches for plan and elevation modes.
- Plan measurements are generated from entity footprint/bounds face anchors to nearest wall measurement edges.
- Perspective measurement policy combines plan-style X/Y wall distances with an optional floor measurement.
- Elevation measurement policy generates left, right, top, and bottom distances relative to the active wall-face frame.
- Movement updates the source scene entity positions continuously, so selected measurements update dynamically while dragging.

## 13. AI side panel

**Status:** UI shell only

**Description:**  
The AI side panel is present in the workspace but is not connected to scene state, an AI service, a backend, or scene commands.

**Functional Features:**

- `KitchenAiPanel` stores local chat messages and input value in React component state.
- `AiChatPanel` renders a local chat UI, status card, message list, composer, and Send button.
- Sending a message appends the user message and a fixed assistant shell response.
- The composer and Send button remain visible at the bottom of the chat panel.
- The panel explicitly says it is not connected to scene editing.
- It does not subscribe to scene state.
- It does not show selected-object context.
- It does not call an AI service or backend.
- It does not execute commands or mutate the scene.

## 14. Keyboard and interaction cleanup

**Status:** Implemented

**Description:**  
Global keyboard handling provides common editing shortcuts while preserving normal typing behavior inside form controls.

**Functional Features:**

- Keyboard shortcuts are installed once by `KeyboardShortcuts`.
- Editable targets are ignored: input, textarea, select, and contenteditable elements.
- Ctrl/Meta+Z runs undo.
- Ctrl/Meta+Shift+Z and Ctrl/Meta+Y run redo.
- Escape clears the current active interaction in priority order: wall draft, scene-entity placement, scene-entity move drag, scene-entity rotation drag, then selection.
- Delete/Backspace deletes the selected wall segment if a wall segment is selected.
- Delete/Backspace otherwise deletes selected scene entities.

## 15. Not-present capabilities

**Status:** Not implemented in this package

**Description:**  
The uploaded `src` package intentionally excludes several flows that may have existed in other project phases or are planned for the future.

**Functional Features:**

The current package does **not** include active implementation for:

```txt
DesignSceneDocument import/export
scene document schema/parser/creator/replace flow
AI export packages
AI input package export button
AI output JSON import workflow
AI agent implementation
AI selected-object summary components
AI command execution
Gemini/OpenAI/backend AI service calls
designer/read-only workspace mode
manual countertop cutout editing
manual wall opening/cutout editing
automatic AI cabinet generation inside reservation zones
production collision/overlap validity enforcement for placement
server persistence or database integration
```

These should not be described as current features unless they are intentionally rebuilt in code.
