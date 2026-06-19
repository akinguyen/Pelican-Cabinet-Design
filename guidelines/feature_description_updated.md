# Kitchen Editor Feature Description - Current

This document describes the active feature set in the current `src` package. It describes only implemented behavior and intentionally excludes removed DesignSceneDocument, AI export/import, AI-agent, and workspace-mode flows.

## 1. Workspace layout

- The app opens directly into the Kitchen Editor.
- The workspace uses a three-column layout: left AI chat panel, center editor viewport, and right editor panel.
- The center area contains the header, view tabs, editor toolbar/history controls, and scene viewport.
- The left AI panel and right editor panel can be collapsed independently.
- Collapsing either side panel expands the center viewport area.
- The right editor panel contains the catalog browser and overlays selected-object properties when a compatible object is selected.

## 2. View modes and viewport controls

- Perspective, Floor Plan, and Elevation are view modes over the same runtime `DesignScene`.
- Camera state is tracked per view mode.
- Toolbar camera commands include zoom out, zoom in, and fit view.
- Perspective uses perspective camera controls and a view gizmo.
- Floor Plan uses orthographic camera controls and supports wall drawing.
- Elevation uses orthographic camera controls, wall-face navigation, and a padding mask around the active wall elevation view zone.
- Wall drawing is floor-plan only.
- The Draw Reservation Zone tool works in perspective, floor plan, and elevation.
- Assembly placement works through the shared placement surface for perspective, floor plan, and elevation.

## 3. Scene source of truth and history

- `DesignScene` is the runtime source of truth.
- The scene contains placed assemblies, placed wall graphs, design reservation zones, active selection, and the active scene operation.
- Scene history provides undo, redo, and restore through runtime scene snapshots.
- The toolbar includes Undo, Redo, and a recent-history dropdown.
- Meaningful scene mutations record action-specific history entries.
- Undo/redo/restore clear transient interaction state such as active drag, placement feedback, alignment guides, active toolbar tool, camera command, and active scene operation.
- The current package does not include a DesignSceneDocument schema, document parser, document creator, import/export document flow, or scene-document replace flow.
- Scene history is runtime undo/redo state, not a persisted document contract.

## 4. Scene entity selection and editing

- Placed assemblies and design reservation zones are both scene entities for selection, multi-selection, selected outlines, group guides, duplicate/delete controls, and group movement.
- Wall segments remain separate from generic scene-entity selection because they have wall graph, topology, and elevation-specific behavior.
- Users can single-select assemblies, design reservation zones, and wall segments.
- Users can multi-select assemblies and design reservation zones together with Shift, Ctrl, or Meta selection.
- Mixed scene-entity selections can include assemblies and design reservation zones in the same selected group.
- Multi-selected scene entities render shared selected bounds, group edit controls, and floor-plan group guides while moving.
- Users can duplicate or delete single scene entities and multi-selected scene-entity groups.
- Mixed duplicate/delete operations record one history entry for the whole user action.
- Mixed scene-entity movement records one history entry for the group move.
- Single assembly selection shows assembly properties.
- Single design reservation zone selection shows design reservation zone properties.
- Multi scene-entity selection shows a multi-selection summary instead of a single-object properties editor.

## 5. Assembly workflows

- Users can place assemblies from the catalog.
- Catalog selection starts an assembly placement candidate.
- Placement candidates become positioned after pointer movement supplies a world position.
- Floor-plan and perspective placement preserve the assembly distance from floor.
- Elevation placement uses the active wall-face elevation frame when available and clamps the assembly above the floor.
- Users can drag assemblies in perspective, floor plan, and elevation.
- Users can rotate a single selected assembly in floor plan.
- Assembly rotation snaps through the assembly rotation snapping rules.
- Users can edit selected assembly placement values, dimensions, and option values from the properties panel.
- Users can duplicate and delete assemblies through shared scene-entity controls.
- Assembly placement feedback currently remains permissive; the current code does not provide production collision/overlap validation.

## 6. Design reservation zone workflows

- `DesignReservationZone` is scene source-of-truth data and is not a placed assembly.
- A reservation zone is a user-authored 3D reserved build volume for an island, peninsula, or tall pantry.
- Supported purposes are island, peninsula, and tall pantry.
- Default dimensions are 72 × 36 × 34.5 inches for island/peninsula and 36 × 24 × 84 inches for tall pantry.
- Users can create reservation zones with the Draw Reservation Zone tool in perspective, floor plan, and elevation.
- The placement preview appears under the pointer, uses scene-entity alignment behavior, shows wall measurements in floor plan, and commits on click.
- Users can select, multi-select, move, duplicate, delete, rotate, and edit reservation zones.
- Floor-plan rotation uses the shared scene-entity rotation UI.
- Reservation zone placement and movement align with walls, assemblies, and other reservation zones through scene-entity bounds.
- Floor plan renders reservation zones as dashed footprints derived from the same 3D zone geometry.
- Perspective and elevation render reservation zones as transparent 3D cuboids with dashed/segmented edges.
- Reservation zone rendering obeys scene depth in perspective and elevation, so walls can occlude zones like normal scene objects.
- The properties panel supports purpose, placement, dimensions, rotation, distance from floor, and delete.
- Changing the reserved purpose applies that purpose's default dimensions.
- Distance from floor maps to `baseCenterPointInches.zInches`.
- Reservation zones do not automatically populate cabinets.
- Reservation zones do not create wall openings or countertop cutouts.

## 7. Wall workflows

- Users can draw wall segments in floor plan.
- Wall drawing supports empty-point starts, snapping to existing wall nodes, snapping to existing segment bodies, segment splitting at inserted nodes, graph merging, horizontal/vertical guide snapping, and a minimum committed segment length.
- Users can select wall segments.
- Users can edit selected wall segment height, thickness, preferred view face side, and cabinet placement face policies.
- Wall segment deletion can split disconnected graph components and remove orphan nodes.
- Elevation mode supports wall-face navigation through the wall elevation navigator.
- The active wall elevation view derives its frame, view zone, camera frame, and padding mask from wall geometry.

## 8. Catalog and raw assembly definitions

- The right editor panel contains the catalog browser.
- Catalog selector groups include Basic Units, Cabinets, Surfaces, Appliances, Openings, and Fixtures.
- Cabinet catalogs include base cabinets, wall cabinets, pantry cabinets, and built-in cabinets.
- Catalog entries are loaded from raw JSON catalog data and registered through the kitchen editor catalog registry.
- Raw assembly definitions support dimensions, option groups, nested assembly components, primitive geometry components, include conditions, expression-based values, component roles, front outline edges, and cutout behavior.
- Supported primitive geometry kinds include box, cylinder, rectangular-frustum, L-shaped prism, and custom mesh with `meshId: countertop-slab`.

## 9. Properties panel

- The properties panel overlays the catalog area when an object or compatible selection is active.
- Single assembly properties include placement, dimensions, and option groups.
- Single wall segment properties include wall height, wall thickness, preferred view face side, and cabinet placement face policies.
- Single design reservation zone properties are ordered as Reserved for, Placement, Dimensions, and Actions.
- Multi scene-entity selection shows a summary with total selected, assembly count, and reservation-zone count.
- Mixed or multi scene-entity selection does not show a single assembly or single reservation-zone editor.

## 10. Derived cutouts and openings

- Wall openings are derived from placed assemblies and positioned assembly candidates that declare wall cutout behavior.
- Countertop openings are derived from countertop slab hosts and assemblies that declare countertop cutout behavior.
- Wall and countertop cutout math lives in engine modules.
- Door/window-like assemblies can create wall openings through wall cutout behavior.
- Drop-in sink/cooktop-style assemblies can create countertop openings through countertop cutout behavior.
- Design reservation zones do not create wall openings or countertop openings.
- Manual wall opening editing and manual countertop cutout editing are not implemented.

## 11. Rendering and visual feedback

- Wall, assembly, reservation-zone, selected-scene-entity, placement-feedback, guide, and interaction layers are composed in the scene renderer.
- Assembly rendering uses render-local assembly tree caching through `useAssemblyRenderItems`.
- Selected scene-entity volume bounds use one shared scene-entity bounding box renderer across perspective, floor plan, and elevation.
- Scene-entity group guides render dashed group bounds and wall measurements for multi-selected scene entities during group movement.
- Scene-entity wall measurements are shared between assemblies and design reservation zones where applicable.
- Assembly object alignment guides show snapping/alignment feedback during placement and movement.
- Front outline lines render in elevation when assemblies declare front outline edges.
- Generated component-owned geometries use explicit disposal where required.

## 12. AI side panel

- The AI side panel is part of the editable workspace.
- It renders a local chat UI shell only.
- It keeps local chat messages in component state.
- It does not subscribe to scene state.
- It does not display selected-object scene context.
- It does not call an AI service or backend.
- It does not execute scene commands.
- It does not mutate the scene.
- The composer and Send button stay visible at the bottom of the chat panel.
- The chat UI is a placeholder for a future explicit command layer or AI service integration.

## 13. Not-present capabilities

The current package does not include active flows for:

```txt
DesignSceneDocument import/export
scene document schema/parser/creator/replace flow
AI export packages
AI input package export button
AI output JSON import workflow
AI agent implementation
AI selected-object summary components
AI command execution
designer/read-only workspace mode
manual countertop cutout editing
manual wall opening/cutout editing
automatic AI cabinet generation inside reservation zones
production collision/overlap validity enforcement for placement
```

Do not describe these as current features unless they are intentionally rebuilt in code.
