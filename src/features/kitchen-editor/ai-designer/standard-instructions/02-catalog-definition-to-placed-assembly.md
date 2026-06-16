# 02 — Catalog Definition to Placed Assembly

The catalog reference package is the only source of allowed placeable object definitions. Do not invent `definitionId` values.

## Selecting a definition

For each object you need, choose a definition from the catalog package using:

- `definitionId`
- `name`
- `catalogId` and `categoryId` when present
- `dimensions`
- `optionGroups`
- `cutoutBehavior`
- `defaultDistanceFromFloorInches`

Visible catalog entries may be user-selectable. Internal-only entries may appear in the catalog package for completeness, but do not place internal-only definitions as standalone user-facing objects unless the standard instructions or user request clearly requires that exact internal component.

## Dimensions

Use the catalog dimension controls:

- For `select` dimensions, prefer one of the listed `optionsInches`.
- Use custom values only when `allowCustomValue` is true and the value stays within min/max limits.
- Keep inches as numbers.

## Option values

For every placed assembly, build `configuration.optionValues` from the selected catalog definition's `optionGroups`.

Required rule:

- Include every catalog option that has a `defaultValue`.
- Use the catalog option id as the JSON key.
- Use the catalog `defaultValue` when the user did not request a different valid value.
- For select options, the value must be one of the listed `choices[].value`.
- For boolean options, use true or false.
- For number options, stay within min/max/step guidance when present.
- Do not output `{}` for `optionValues` unless the selected catalog definition has no options with `defaultValue`.
- Do not rely on the importer or raw assembly engine to fill missing defaults.

Example:

```json
"optionValues": {
  "cabinet-panel-color": "#fdf6c4",
  "door-color": "#fff9d6",
  "handle-color": "#111827",
  "show-doors": true,
  "side-panel-thickness-inches": 0.75,
  "back-panel-thickness-inches": 0.75,
  "top-bottom-panel-thickness-inches": 0.75,
  "toe-kick-height-inches": 4.5,
  "show-handles": true,
  "door-handle-type": "bar",
  "door-handle-position": "right-center"
}
```

## Placed assembly center height

`worldPositionInches.zInches` is the center height. If a definition has `defaultDistanceFromFloorInches`, the default center height is:

```txt
defaultDistanceFromFloorInches + heightInches / 2
```

For floor-standing objects, the center height is usually:

```txt
heightInches / 2
```

Do not place objects below the floor.
