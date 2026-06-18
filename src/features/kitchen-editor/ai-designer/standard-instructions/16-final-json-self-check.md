# 16 - Final JSON Self Check

Before outputting final JSON, run every check below. If any hard check fails, backtrack or report conflict. Do not output invalid JSON.

## Schema and preservation

- Output schema is `kitchen-editor-scene/v3`.
- Units are inches.
- Input `placedWallGraphs` are preserved unless wall editing was requested.
- Fixed input placed assemblies are preserved unless user allowed moving/editing.
- Input `designReservationZones` are preserved unless user allowed editing.
- `catalog.requiredDefinitionIds` includes every used definition id.
- DesignReservationZone entries are not output as placed assemblies.

## Permission check

- No invented doors.
- No invented windows.
- No invented wall openings.
- No unrequested appliances.
- Every generated object is allowed by the catalog.
- Every size and option value is valid.

## Wall face check

- Every wall-based object is on a valid wall-face guide.
- No object is placed on a `none` face.
- Required faces are covered unless blocked, relaxed by user, or reported impossible.
- Optional faces are used only when useful.

## Span coverage check

- Every usable base/tall span is filled or explained.
- Every usable wall span is filled or explained.
- No unexplained gap >= 0.25 inch remains.
- No filler was added for a tiny floating-point gap.

## Solid collision and wall penetration check

- No object body overlaps another object body invalidly.
- No object extends into or through the wall.
- No object extends outside its usable span.
- No object overlaps door/window/opening blocked zones.
- Connected corner solid footprints do not collide.
- Vertical overlap was considered for collisions.

## Functional access check

- Cabinet doors remain visible and usable.
- Drawer fronts remain visible and usable.
- Appliance fronts remain visible and usable.
- Handles are not hidden behind perpendicular cabinets, panels, fillers, or countertops.
- Blind cabinet door/front access zones are not blocked.
- Passing solid box collision alone is not enough.

## Blind corner check

For every blind corner, verify:

- Does the corner use one supported 90 degree cabinet corner guide?
- Does the corner use one host-wall blind cabinet?
- Does the blind cabinet belong to the host-wall run?
- Does the turning-wall run-end cabinet belong to the turning-wall run?
- Is the run-end cabinet placed normally on its own wall?
- Does the blind cabinet handedness point the hidden side toward the turning wall?
- Is the blind door/front on the open accessible side?
- Does the front stile grow toward the blind side, not the door side?
- Is `remainingHiddenBlindArea = blindCabinetWidth - blindDoorWidth - frontStileWidth` computed?
- Is `runEndTotalDepth = runEndBoxDepth + runEndDoorOrFrontDepth` computed?
- Does the distance from hidden-area start line to turning wall face equal run-end total depth?
- Is there a visible turning blind filler if a gap exists?
- Is the filler width valid, preferably 3 or 4 inches, allowed 3 to 6 inches?
- Is the filler visibly placed between the blind cabinet and turning-wall cabinet?
- Is the filler not hidden at the wall/back plane?
- Is there no filler between blind cabinet and same-wall host-run cabinet?
- Does the turning-wall cabinet avoid the blind door/front access zone?
- Do the blind cabinet, filler, and turning cabinet footprints avoid collision?
- Does the countertop above avoid overlap at the corner?

If any answer is no, reject the layout.

## Filler check

Every filler has one valid role:

- turning blind filler
- termination filler
- required appliance/catalog clearance filler

No filler is placed between normal cabinet-to-cabinet objects without a valid reason.

Missing required turning blind filler is a hard failure.

A panel is never accepted as a substitute for a turning blind filler.

## Panel check

- Panels are used only on exposed visible sides.
- Panels are not used to solve run gaps.
- Panel dimensions match base/wall/tall layer as appropriate.
- Panels do not collide or extend into walls/openings.
- Panels do not cover blind cabinet door/front access zones.

## Countertop check

- Countertops are generated from valid continuous base runs.
- Countertops do not cross doors, openings, tall zones, no-placement spans, or unexplained gaps.
- Countertop cutouts exist only for placed objects with catalog cutout behavior.
- Countertop slabs do not overlap at inside corners.
- Countertop corners are clipped, mitered, shortened, or unioned into a non-overlapping shape.

## Appliance/fixture check

- Fixed input appliances did not move.
- Requested appliances are included when requested.
- No appliances were added when not requested and not fixed.
- Sink/faucet/dishwasher/hood relationships are valid when those objects are used.

## Post-fix validation check

If any object was moved, resized, re-handed, or reclassified during fixing or backtracking, all affected checks were rerun:

- span coverage
- solid collision
- functional access
- blind-corner assembly
- filler placement
- panel placement
- countertop overlap
- final JSON schema

Do not output JSON based on stale validation from before a fix.

## Final decision

If all hard checks pass, output the final JSON.

If no candidate passes, report:

- failed wall/run/span
- fixed object or corner causing conflict
- attempted alternatives
- what user change would make it solvable

## Design reservation zone check

For every input DesignReservationZone, verify:

- The zone is preserved in `scene.designReservationZones`.
- Generated island, peninsula, or tall pantry objects respect the matching zone where possible.
- Objects intended for a zone fit inside the zone footprint and height unless an explained conflict exists.
- The zone itself is not counted as a generated cabinet or appliance.
