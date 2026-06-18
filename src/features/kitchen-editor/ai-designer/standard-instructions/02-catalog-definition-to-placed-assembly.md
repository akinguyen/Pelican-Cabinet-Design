# 02 - Catalog Definition to Placed Assembly Rules

The catalog reference package is the only source for:

- allowed `definitionId` values
- dimensions and allowed options
- default dimensions
- min/max/step/custom permission
- option groups, option ids, choices, and default values
- cutout behavior

Never invent a definition id, size option, option id, or option value.

## Dimension selection

When choosing a size:

1. Prefer standard listed width/depth/height options.
2. Use common sizes before unusual sizes.
3. Use custom values only if `allowCustomValue` is true and no standard combination solves the span.
4. Obey min, max, and step values.

## Cabinet depth convention

For cabinet definitions, `depthInches` is box depth unless a definition explicitly says otherwise.

For physical coverage that needs the front/door face, use:

```txt
objectTotalDepth = boxDepth + doorOrFrontDepth
```

The door/front depth usually comes from the door, drawer, or front component thickness when known. If the catalog exposes a front/door depth option, use it. If not exposed but the cabinet construction option indicates panel thickness, use the relevant default thickness as the best available front thickness.

This total-depth convention is required for blind-corner hidden-area coverage.

## Category ownership

Classify objects by role before placement:

- base cabinets: base run layer
- blind base cabinets: base run corner solver
- wall cabinets: wall run layer
- blind wall cabinets: wall run corner solver
- tall/pantry/oven/fridge objects: tall layer and full-height blocking
- range/dishwasher/sink/cooktop: base/tall layer or countertop-related anchors
- microwave/range hood: wall layer anchor, usually tied to range/cooktop below
- filler: valid filler role only
- panel: exposed-side finish only
- countertop: generated after base run is valid

## Object compatibility

Base runs can contain:

- base cabinets
- blind base cabinets
- sink base cabinets
- dishwasher, range, requested base appliances
- refrigerator/tall object at valid tall position
- base fillers with valid role
- base panels after run solve

Wall runs can contain:

- wall cabinets
- blind wall cabinets
- range hood or microwave if fixed/requested
- wall fillers with valid role
- wall panels after run solve

Blind turning run-end coverage should normally use a cabinet of the same layer:

- base cabinet for blind base corner
- wall cabinet for blind wall corner

Do not use dishwasher, refrigerator, range, sink, cooktop, hood, microwave, faucet, panel, countertop, or filler as the blind-corner run-end coverage object unless the user explicitly requests it and all hard checks pass.
