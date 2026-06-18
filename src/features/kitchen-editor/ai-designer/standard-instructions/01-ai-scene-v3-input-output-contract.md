# 01 - Scene V3 Input / Output Contract

The only supported scene document schema is `kitchen-editor-scene/v3` with inch units.

The scene package owns:

- `schemaVersion`
- `units`
- `coordinateSystem`
- `catalog.mode`
- `catalog.requiredDefinitionIds`
- `scene.placedAssemblies`
- `scene.placedWallGraphs`
- `scene.designReservationZones`

## Preserve design reservation zones

`scene.designReservationZones` contains user-authored 3D preserved build volumes for AI design. Preserve these zones exactly in output unless the user explicitly asks to edit them.

Each zone includes:

- `id`
- `reservedFor`: `island`, `peninsula`, or `tall-pantry`
- `baseCenterPointInches`
- `rotationDegrees.zDegrees`
- `sizeInches.widthInches` / `depthInches` / `heightInches`

Use zones as build boundaries and guidance. Do not convert a zone into a placed assembly.

## Preserve wall graphs

`scene.placedWallGraphs` is the room source of truth. Copy the input wall graphs to the output exactly unless the user explicitly asks to edit walls.

Do not reinterpret wall nodes from screenshots. Wall nodes are world-space floor points. Wall segments are 3D wall solids with start node, end node, thickness, height, face sides, and placement policies.

## Preserve fixed placed assemblies

Input `scene.placedAssemblies` may contain user-placed cabinets, appliances, doors, windows, openings, panels, fillers, or other objects.

Before design, classify each input assembly:

- fixed input door/window/opening
- fixed input appliance
- fixed input cabinet/object
- movable only if the user explicitly says it may move

By default, all input assemblies are fixed and must be preserved.

## Placed assembly output shape

Each placed assembly must include:

- unique `id`
- valid `definitionId`
- `configuration.sizeInches`
- `configuration.optionValues`
- `configuration.componentOverrides`
- `worldPositionInches`
- `rotationDegrees`

Use the catalog defaults for all option ids that have default values unless the user requested a different valid value.

## Catalog required ids

`catalog.requiredDefinitionIds` must include every definition id used by `scene.placedAssemblies`. Keep the list sorted or consistently ordered.

## No derived opening arrays

Do not output separate wall-opening arrays or countertop-opening arrays unless the schema explicitly supports them. Doors/windows/openings and sink/cooktop cutouts are represented by placed assemblies and engine-derived behavior.
