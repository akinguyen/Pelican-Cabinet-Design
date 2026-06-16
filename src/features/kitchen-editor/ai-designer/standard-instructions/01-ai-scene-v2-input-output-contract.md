# 01 — Scene V2 Input / Output Contract

The only supported scene document schema is:

```json
{
  "schemaVersion": "kitchen-editor-scene/v2",
  "units": "inches",
  "coordinateSystem": {
    "origin": "floor-plane",
    "xAxis": "horizontal-left-right",
    "yAxis": "horizontal-front-back",
    "zAxis": "vertical-height",
    "rotationUnit": "degrees",
    "objectFrontAtZeroRotation": "+Y"
  },
  "catalog": {
    "mode": "reference",
    "requiredDefinitionIds": []
  },
  "scene": {
    "placedAssemblies": [],
    "placedWallGraphs": []
  }
}
```

## `scene.placedAssemblies[]`

Each placed assembly must use this shape:

```json
{
  "id": "assembly-001",
  "definitionId": "catalog-definition-id",
  "configuration": {
    "sizeInches": {
      "widthInches": 36,
      "depthInches": 24,
      "heightInches": 34.5
    },
    "optionValues": {
      "example-option-id": "example-default-value"
    },
    "componentOverrides": []
  },
  "worldPositionInches": {
    "xInches": 0,
    "yInches": 0,
    "zInches": 17.25
  },
  "rotationDegrees": {
    "zDegrees": 0
  }
}
```

Rules:

- `id` must be unique.
- `definitionId` must exist in the catalog reference package.
- `configuration.sizeInches` must use valid catalog dimensions.
- `configuration.optionValues` must use valid catalog option ids and values.
- `configuration.optionValues` must include every option from the selected catalog definition that has a `defaultValue`, even when using the default.
- Do not leave `optionValues` empty for definitions that have catalog `optionGroups` with default values.
- If the user does not request a custom option value, copy the catalog option's `defaultValue`.
- Include `configuration.componentOverrides`, usually as an empty array.
- `worldPositionInches` is the object center in the 3D scene.
- `rotationDegrees.zDegrees` is the user-facing top-view rotation.

## `scene.placedWallGraphs[]`

Wall graphs are source-of-truth room data. Preserve them from input to output unless the user explicitly asks to edit walls.

Each wall segment must include:

```json
{
  "id": "wall-segment-001",
  "name": "Wall Segment 1",
  "startNodeId": "wall-node-001",
  "endNodeId": "wall-node-002",
  "thicknessInches": 12,
  "heightInches": 96,
  "preferredViewFaceSide": "side-b",
  "cabinetPlacementFaceSides": ["side-b"]
}
```

Rules:

- `preferredViewFaceSide` must be `side-a` or `side-b`.
- `preferredViewFaceSide` is only the saved/default elevation viewing side.
- `cabinetPlacementFaceSides` must be `[]`, `["side-a"]`, `["side-b"]`, or `["side-a", "side-b"]`.
- `cabinetPlacementFaceSides` is the source of truth for kitchen object placement permission.
- Preserve `preferredViewFaceSide` and `cabinetPlacementFaceSides` in output.
- Do not output wall openings or countertop openings as scene data. The engine derives cutouts from placed assemblies.

## Public scene fields

Only output the current scene fields shown above. Do not invent additional public scene arrays or legacy wall/cutout fields.
