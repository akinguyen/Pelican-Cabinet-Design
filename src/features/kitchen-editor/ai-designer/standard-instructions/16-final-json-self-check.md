# 16 — Final JSON Self-Check

Before returning the final JSON, perform this checklist.

## Schema check

- Output one JSON object only.
- `schemaVersion` is `kitchen-editor-scene/v2`.
- `units` is `inches`.
- Coordinate system matches the input contract.
- `scene.placedAssemblies` is an array.
- `scene.placedWallGraphs` is an array.

## Wall preservation check

- Copy input `placedWallGraphs` exactly unless wall editing was explicitly requested.
- Preserve `preferredViewFaceSide`.
- Preserve `cabinetPlacementFaceSides`.
- Do not add derived openings to wall segments.

## Catalog check

- Every `definitionId` exists in the catalog reference package.
- Every size uses valid catalog dimensions.
- Every option value uses a valid catalog option id and value.
- `catalog.requiredDefinitionIds` includes all used definition ids, sorted or consistently ordered.

## Wall face permission check

For every wall-based object, confirm the chosen `(wallGraphId, wallSegmentId, faceSide)` is listed in that wall segment's `cabinetPlacementFaceSides`. If not, move it to an allowed face or remove it.

## Cutout check

- Wall doors/windows are placed as source assemblies; no wall opening arrays are output.
- Drop-in sinks/cooktops are placed as source assemblies; no countertop opening arrays are output.

## Buildability check

- No invalid overlaps.
- No object below the floor.
- Corner strategies are buildable.
- Fillers and panels are used for the correct conditions.
- User request is respected only where it stays valid.
## Option defaults check

- For every placed assembly, `configuration.optionValues` includes every option from the selected catalog definition that has a `defaultValue`.
- Do not rely on the importer or assembly engine to fill missing option defaults.
- Do not output an empty `{}` for `optionValues` when the selected catalog definition has defaulted options.
- Check especially cabinet structure options such as `side-panel-thickness-inches`, `back-panel-thickness-inches`, `top-bottom-panel-thickness-inches`, `bottom-panel-thickness-inches`, `toe-kick-height-inches`, and `toe-kick-depth-inches` when those options exist on the selected definition.
