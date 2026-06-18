# 07 - Panels, Fillers, and Finished Ends

Panels and fillers are different tools.

```txt
Filler solves a dimensional gap.
Panel finishes or protects an exposed side.
```

Do not use a panel as a filler. Do not use a filler as a panel.

## Valid filler roles

A filler is allowed only for:

1. Turning blind filler between blind cabinet body and turning-wall run-end cabinet.
2. Termination filler at a run end against a wall, obstruction, or unavoidable leftover.
3. Required appliance/catalog clearance filler.

Do not use filler between normal same-wall cabinet-to-cabinet objects.

Do not use filler between a blind cabinet and the next same-wall host-run cabinet.

Use standard cabinet widths before adding filler. Prefer 3 or 4 inch fillers. Use 5 or 6 inches only when needed for a valid fit. Larger fillers are a warning sign and should be avoided unless explicitly justified.



## Turning blind filler rule

For every blind corner, measure the visible connection gap between:

- the blind cabinet body/front-side edge that faces the turning connection
- the turning-wall run-end cabinet side/front edge

If this gap is 3, 4, 5, or 6 inches, place a turning blind filler with that exact width.

If the gap is outside the valid filler range, do not leave it open. Backtrack by trying a different run-end cabinet width, turning filler width, blind width, handedness, or host/turning assignment.

Missing turning blind filler is a hard failure.

The turning blind filler must be visibly placed at the front connection plane where it closes the gap between the blind cabinet and the turning-wall cabinet. Do not hide the filler at the wall/back plane. Do not place it as a detached patch. Do not use a panel in place of this filler.

A valid blind-corner connection is:

```txt
host wall: blind cabinet -> same-wall cabinet
turning wall: visible turning filler -> turning-wall run-end cabinet -> rest of run
```

Invalid blind-corner connections:

```txt
blind cabinet -> empty gap -> perpendicular cabinet
blind cabinet -> panel -> perpendicular cabinet
blind cabinet -> filler -> same-wall host-run cabinet
filler hidden behind the cabinet at the wall plane
```

## Panel placement timing

Add panels only after base/tall and wall runs are valid and span coverage has passed.

Panel process:

1. Inspect final run ends and appliance/tall object sides.
2. Detect exposed visible sides.
3. Add panels only where an exposed side needs finish/protection.
4. Match panel size to the object/layer.
5. Do not use the panel to solve run-length gaps.
6. Re-run collision validation after panel placement.

## Exposed side detection

A side is not exposed if it touches:

- another cabinet in the same run
- an appliance in the same run
- a valid filler
- a wall/corner boundary
- a tall enclosure or panel already covering that side

A side is exposed if it is visible and not covered by another run object.

## Panel sizing

Base exposed side:

- use panel height matching base cabinet height
- use panel depth matching base cabinet depth
- use panel thickness from catalog, usually 0.75 inch

Wall cabinet exposed side:

- use panel height matching wall cabinet height
- use panel depth matching wall cabinet depth
- bottom aligns with wall cabinet distance from floor

Refrigerator/tall exposed side:

- use tall panel height matching refrigerator, pantry, or adjacent tall cabinet height
- use depth matching the tall object or intended enclosure depth

## Panel placement

Place the panel flush against the exposed side edge of the object, with the same wall-face orientation and depth direction. Its thin dimension is the panel thickness. It must not overlap another run object or extend into the wall.

## Examples

- Cabinet at open run end: panel may be added to exposed side.
- Refrigerator exposed side: tall panel may be added.
- Tall pantry exposed side: tall panel may be added.
- Wall cabinet open end: wall panel may be added.
- Blind turning connection: use filler, not panel.
- Normal cabinet-to-cabinet connection: no panel and no filler between them.
