# Kitchen Editor Feature Description - Current

This document describes the active feature set in the current package. It intentionally excludes removed workspace-mode and mode-switch behavior.

## 1. Workspace layout

- The app opens directly into Kitchen Editor.
- The center area contains the header, view tabs, toolbar, and scene viewport.
- The left panel contains the AI chat with scrollable scene context and a fixed bottom composer.
- The right panel contains the catalog and selected-object properties.
- The left AI panel and right editor panel can be collapsed independently.
- Collapsing either side panel expands the center viewport area.

## 2. View modes

- Perspective, Floor Plan, and Elevation are view modes over the same `DesignScene`.
- Camera state is tracked per view mode.
- Floor plan supports wall drawing.
- The Draw Reservation Zone tool creates a placement candidate in perspective, floor plan, and elevation.
- Perspective renders placed assemblies, walls, and transparent 3D DesignReservationZone volumes.
- Perspective does not activate wall drawing, but it does support DesignReservationZone placement.
- Elevation supports wall-face navigation and wall/assembly editing workflows.
- Elevation renders DesignReservationZone volumes through the same scene-object view pipeline and supports DesignReservationZone placement on the active elevation plane.

## 3. Editing workflows

- Users can place assemblies from the catalog.
- Users can select assemblies, wall segments, and DesignReservationZone volumes.
- Users can drag assemblies in floor plan, perspective, and elevation.
- Users can rotate selected assemblies in floor plan.
- Users can edit selected assembly dimensions, placement values, and option values.
- Users can duplicate and delete selected assemblies.
- Users can draw wall segments in floor plan.
- Users can edit selected wall segment height, thickness, preferred view face side, and cabinet placement face policies.
- Users can draw DesignReservationZone volumes in floor plan, perspective, and elevation.
- Users can select, move, delete, and edit selected DesignReservationZone volumes from any scene view. Floor-plan rotation uses the shared scene-entity rotation UI.

## 4. Design reservation zones

- `DesignReservationZone` is scene source-of-truth data.
- A zone is a user-authored 3D preserved build volume for an island, peninsula, or tall pantry.
- The draw tool uses a scene-entity placement candidate: the preview appears under the pointer, snaps like an object, shows wall measurements in floor plan, and commits on click.
- Floor plan renders the zone as a dashed footprint derived from the same 3D volume geometry.
- Perspective is the source-of-truth visual behavior and renders the zone as a transparent 3D cuboid with dashed/segmented edges.
- Perspective and elevation zone rendering obey scene depth, so walls can occlude zones like normal scene objects.
- Selected zone outlines, delete controls, and floor-plan rotation controls reuse shared SceneEntity UI components with placed assemblies. Reservation zones do not expose duplicate controls.
- Zone placement and movement snap through SceneEntityBounds, so assemblies and reservation zones align to each other and to walls.
- Selected, moving, and placement-candidate zones show floor-plan wall distance measurements like placed assemblies.
- Default dimensions are 72 × 36 × 34.5 for island/peninsula and 36 × 24 × 84 for tall pantry.
- Reserved purpose, placement, dimensions, and delete are editable from the properties panel.
- Changing the reserved purpose applies the selected purpose's default dimensions.
- Distance from floor is editable and maps to `baseCenterPointInches.zInches`.
- Zones are not placed assemblies.
- Zones do not cut walls or countertops.

## 5. AI side panel

- The AI side panel is part of the editable workspace.
- It does not lock manual scene editing.
- It renders chat UI only.
- It displays selected assembly, wall, and DesignReservationZone summaries as scrollable read context inside the chat.
- The chat/context area scrolls independently from the composer.
- The bottom composer and Send button stay visible.
- The chat UI is currently a placeholder for future AI connection work.

## 6. Catalog and properties panel

- The right editor panel contains the catalog browser and properties panel.
- Catalog groups include basic units, cabinets, surfaces, appliances, openings, and fixtures.
- The catalog selector uses a narrower rail than the previous 360px panel layout.
- Selected object properties overlay within the right panel.
- Selected DesignReservationZone properties are ordered as Reserved for, Placement, Dimensions, and Actions. Actions contains Delete only.

## 7. Scene data and documents

- `DesignScene` is the source of truth.
- Scene documents use schema version `kitchen-editor-scene/v3`.
- The scene contains wall graphs, placed assemblies, active selection, active operations, and `designReservationZones`.
- Wall segment cabinet placement policies are stored as `cabinetPlacementFacePolicies` with side A and side B values.
- Scene document parsing validates required wall placement policy fields.
- Scene document parsing requires `kitchen-editor-scene/v3` and requires `scene.designReservationZones` to be present as an array.

## 8. Derived cutouts and openings

- Wall openings are derived from placed assemblies and positioned candidates that declare wall cutout behavior.
- Countertop openings are derived from countertop slab hosts and assemblies that declare countertop cutout behavior.
- Wall and countertop cutout math remains in engine modules.
- DesignReservationZone volumes do not create wall openings or countertop cutouts.

## 9. AI export packages

AI input export creates:

```txt
01-standard-instructions/*
02-current-scene-for-ai.json
03-catalog-reference.json
04-derived-placement-helpers.json
05-user-request-template.md
```

The scene package includes `designReservationZones`.

The derived placement helper package includes:

- wall face placement guides
- supported cabinet corner placement guides
- DesignReservationZone guides with base/top corners, local axes, rotation, size, and height range
