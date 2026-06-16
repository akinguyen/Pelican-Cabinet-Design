# 04 — Wall Graph Face Placement Rules

Every wall segment has two stable face identities:

- `side-a`
- `side-b`

The wall segment source-of-truth fields are:

```json
{
  "preferredViewFaceSide": "side-b",
  "cabinetPlacementFaceSides": ["side-b"]
}
```

## `preferredViewFaceSide`

This is the saved/default wall elevation viewing side. It helps the editor remember which side the user wants to view.

Do not use it as placement permission unless that side is also listed in `cabinetPlacementFaceSides`.

## `cabinetPlacementFaceSides`

This is the source of truth for placement permission.

- `[]`: do not place kitchen objects on this segment.
- `["side-a"]`: only side A is valid.
- `["side-b"]`: only side B is valid.
- `["side-a", "side-b"]`: both faces are valid, as separate runs.

Kitchen objects include cabinets, countertops, appliances, fixtures, panels, fillers, wall cabinets, hoods, shelves, doors/windows intended to create wall cutouts, and any wall-mounted object.

## Derived wall face placement guides

The derived placement helpers package may include `wallFacePlacementGuides`. These guides are math helpers only. They provide:

- `wallGraphId`
- `wallSegmentId`
- `faceSide`
- face start/end points
- `lengthInches`
- `designSideNormal`
- `objectRotationDegrees`

Only use a guide when its `faceSide` is listed in the matching wall segment's `cabinetPlacementFaceSides`. If a wall face has no allowed guide, do not place objects on that face.

## Output preservation

Copy `placedWallGraphs` exactly from input to output for normal kitchen design generation. Preserve node ids, segment ids, names, thickness, height, `preferredViewFaceSide`, and `cabinetPlacementFaceSides`.
