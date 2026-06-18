# 05 - Run Interval Placement, Span Coverage, and Spacing

The AI designs usable spans, not entire walls blindly.

## Layered runs

For every usable wall face, build separate run models:

- base/tall run
- wall cabinet run
- countertop run derived from final base run

The layers share wall geometry but have different blockers.

## Usable span segmentation

Split every run into:

- blocked spans
- fixed object spans
- clearance spans
- usable spans

Blockers include:

- doors
- windows and wall openings, depending on layer
- fixed appliances
- fixed user objects
- tall objects blocking upper layer
- no-placement faces
- required appliance or catalog clearances

## Span coverage rule

Every usable span must be intentionally filled.

A usable span is complete when:

```txt
spanLength = sum(objectWidths) + sum(validFillers) + sum(requiredClearances)
```

within tolerance.

Allowed empty space:

- door/window/opening blocker
- no-placement face
- fixed object clearance
- appliance clearance
- user-requested empty area
- impossible span reported as conflict

Not allowed:

- random gap between cabinets
- random gap between appliance and cabinet
- random gap between blind cabinet and same-wall host-run cabinet
- filler between normal cabinets without a valid role
- unfilled required usable span

## Same-wall continuity

Default same-wall gap is 0 inches.

Allowed continuity:

- cabinet -> cabinet
- cabinet -> appliance
- appliance -> cabinet
- blind cabinet -> same-wall cabinet
- wall cabinet -> wall cabinet

Use a nonzero gap only for valid appliance/catalog clearance, termination filler, or a turning blind filler.

## Tolerance

Use 0.01 inch tolerance for numeric equality. Treat gaps smaller than 0.01 inch as zero. Do not create a filler for a floating-point gap.

Any real unexplained gap greater than or equal to 0.25 inch inside a usable span must be solved or reported.
