# 08 - Corner Cabinet and Corner Clearance Rules

This file owns supported 90 degree blind-corner strategy.

## Core blind-corner rule

Do not treat blind corner placement as a transformed local L assembly.

A blind corner is solved as two normal wall runs connected by one atomic corner candidate:

```txt
host-wall blind cabinet
+ visible turning blind filler
+ turning-wall run-end cabinet
+ blind door/front access clearance
+ footprint collision validation
+ countertop corner validation
```

A blind corner is not valid if the AI only places a blind cabinet and a perpendicular cabinet. A blind corner is also not valid if it passes box collision but blocks the blind cabinet door/front.

## Atomic candidate generation

For each supported 90 degree cabinet corner:

1. Try face A as host wall and face B as turning wall.
2. Try face B as host wall and face A as turning wall.
3. Choose a blind cabinet definition matching the layer: base blind for base layer, wall blind for wall layer.
4. Choose left/right handedness so the hidden blind side points toward the turning wall.
5. Identify the blind cabinet door/front access side.
6. Choose blind cabinet width from catalog, preferring standard values.
7. Choose front stile width, usually 3 inches, allowed 3 to 6 inches when catalog supports it.
8. Choose a turning-wall run-end cabinet of the same layer.
9. Compute blind offset from turning wall.
10. Compute the visible gap between the blind cabinet body and the turning-wall run-end cabinet.
11. Place a visible turning blind filler if the gap is a valid filler width.
12. Build real world footprints and access zones for the blind cabinet, filler, and run-end cabinet.
13. Reject the candidate if solid footprints collide.
14. Reject the candidate if the blind door/front access zone is blocked.
15. Reject the candidate if the turning filler is missing, invalid, or hidden at the wrong plane.
16. Reject the candidate if the countertop above would overlap at the corner.

Only after all checks pass may the solver fill the rest of the host and turning runs.

## Rebuild after any parameter change

After any blind-corner parameter changes, rebuild the full candidate. Do not reuse old validation.

Changing any of these invalidates previous validation:

- host wall
- turning wall
- blind cabinet handedness
- blind cabinet width
- front stile width
- turning-wall run-end cabinet width
- turning-wall run-end cabinet position
- turning filler width
- turning filler position
- countertop corner length or clipping

After any change, recompute:

- blind hidden zone
- blind door/front access zone
- gap between blind box and turning-wall run-end cabinet
- visible filler position
- footprint collision
- functional access clearance
- countertop corner overlap

## Blind handedness local X anatomy

Use local X as cabinet width direction.

Right blind:

```txt
blind side = local +X
door side = local -X
hidden-area start S = -W/2 + doorW + frontStileW
hidden interval = [S, W/2]
```

Left blind:

```txt
blind side = local -X
door side = local +X
hidden-area start S = W/2 - doorW - frontStileW
hidden interval = [-W/2, S]
```

Remaining hidden blind area:

```txt
remainingHiddenBlindArea = blindCabinetWidth - blindDoorWidth - frontStileWidth
```

## Run-end total depth rule

The turning-wall run-end cabinet must cover the remaining hidden blind area using total physical depth:

```txt
runEndTotalDepth = runEndCabinetBoxDepth + runEndDoorOrFrontDepth
```

Target condition:

```txt
distance from hidden-area start line to turning wall face = runEndTotalDepth
```

Equivalent offset:

```txt
blindOffsetFromTurningWall = max(0, runEndTotalDepth - remainingHiddenBlindArea)
```

Meaning:

```txt
distance from blind cabinet blind-side outside box edge to turning wall face = blindOffsetFromTurningWall
```

Do not use box depth alone for this coverage check.

## Blind door/front access rule

The blind cabinet door/front must remain visible and usable.

The turning-wall run-end cabinet may interact only with the blind cabinet hidden-side zone. It must not cross into, cover, or block the blind cabinet door/front access zone.

Reject the blind-corner candidate if:

- the turning-wall cabinet intersects the blind door/front access zone
- the turning-wall cabinet visually blocks the blind door/front
- the blind door handle is behind, inside, or too close to the perpendicular cabinet footprint
- the door-side interval is treated as hidden blind space
- the filler covers the door/front instead of the hidden-side connection gap

## Required turning blind filler rule

For every blind corner, measure the gap between:

- the blind cabinet body/front-side edge that faces the turning connection
- the turning-wall run-end cabinet side/front edge

If this gap is 3, 4, 5, or 6 inches, place a filler with that exact width. Prefer 3 or 4 inches when multiple candidates are valid.

If the gap is outside the valid filler range, backtrack. Do not leave the gap empty.

The filler must be placed at the visible front connection plane where it closes the gap between the blind cabinet and the turning-wall cabinet. It must not be hidden at the wall/back plane.

Missing turning filler is a hard failure.

## Host wall rules

The host-wall run treats the blind cabinet as a normal same-wall object.

Allowed:

```txt
blind cabinet -> same-wall cabinet
blind cabinet -> same-wall appliance, only if appliance intent and clearance are valid
```

Not allowed:

```txt
blind cabinet -> filler -> same-wall host-run cabinet
```

## Turning wall rules

The turning wall uses:

```txt
visible turning filler + turning-wall run-end cabinet + rest of turning-wall run
```

The run-end cabinet is placed normally on the turning wall using its wall-face guide. It is not a child of a special L assembly.

## Complete blind-corner acceptance test

A blind-corner candidate is valid only if all checks pass together:

- supported 90 degree cabinet corner
- correct host wall and turning wall
- hidden blind side points toward turning wall
- blind door/front is on the open accessible side
- run-end cabinet is a normal same-layer cabinet on the turning wall
- visible turning filler exists if there is a gap
- filler width is valid, preferably 3 or 4 inches, allowed 3 to 6 inches
- filler sits visibly between blind cabinet and turning-wall run-end cabinet
- turning-wall cabinet avoids the blind door/front access zone
- solid footprints do not collide
- countertop above does not overlap at the corner

If any answer is no, reject the entire corner candidate.

## Appliance at blind endpoint

The turning blind run-end coverage object should normally be a cabinet. Do not use appliances, fixtures, panels, fillers, countertops, hoods, microwaves, refrigerators, ranges, cooktops, sinks, dishwashers, or ovens as the run-end coverage object unless explicitly requested and all collision, access, and coverage checks pass.

## Lazy Susan

Use lazy susan corner cabinets only when requested or when the catalog/design mode explicitly allows them. Do not substitute a lazy susan for the default blind-corner strategy without reason.
