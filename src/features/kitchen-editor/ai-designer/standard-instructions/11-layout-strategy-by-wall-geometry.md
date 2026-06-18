# 11 - Layout Strategy by Wall Geometry

This file owns the full constrained run-solver strategy.

## Build the graph

From wall-face guides and corner guides, create:

- base/tall runs
- wall runs
- usable spans
- blocked spans
- required faces
- optional faces
- supported 90 degree corners
- unsupported corners
- terminations

## Design base/tall first

The base/tall layer controls floor footprint, appliances, base blind corners, and countertops.

Base/tall solver:

1. Reserve fixed input objects and blockers.
2. Reserve fixed input appliances.
3. Generate requested appliance scenarios only if user requested appliances not already fixed.
4. Generate complete atomic blind base corner candidates.
5. Reserve only blind base candidates that include host blind cabinet, visible turning filler, turning-wall run-end cabinet, door/front access validation, and footprint validation.
6. Fill all remaining usable base/tall spans.
7. Validate span coverage, collisions, wall penetration, and corner geometry.

## Design wall layer second

Wall layer follows the base/tall layout.

Wall solver:

1. Reserve windows, doors, wall openings, tall zones, hood/microwave zones, and fixed wall-layer objects.
2. Generate complete atomic blind wall corner candidates if wall cabinets are needed and supported.
3. Fill all usable wall spans.
4. Align wall cabinets to base rhythm where practical.
5. Validate wall span coverage and collisions.

## Cross-layer relationships

Tall objects block both base and wall layers.

Range/cooktop may require hood/microwave space above if that appliance is fixed or requested.

Wall cabinets cannot overlap windows, wall openings, tall objects, range hoods, microwaves, or other wall-layer objects.

Alignment is polish, not a hard reason to break base/tall validity.

## Backtracking order

If layout fails, try:

1. different standard cabinet width combination
2. different run-end cabinet width
3. different turning blind filler width
4. different blind cabinet size
5. different front stile width if catalog allows
6. opposite host/turning wall assignment
7. different requested-appliance scenario
8. report conflict if no valid candidate exists

Never move fixed input doors, windows, openings, appliances, or fixed objects during backtracking.


## Atomic blind-corner solving inside the run solver

Do not fill a run first and patch the corner later.

A blind corner must be solved as a complete candidate before the remaining run spans are filled. The accepted candidate reserves:

- host-wall blind cabinet interval
- turning-wall visible filler interval
- turning-wall run-end cabinet interval
- blind door/front access zone
- corner countertop trimming/clipping zone

If the candidate fails box collision, functional access, missing-filler, or countertop overlap validation, reject it before filling the rest of the run.

## Validation invalidation during backtracking

When backtracking changes a corner, filler, cabinet width, handedness, or countertop, previous validation is no longer valid. Rerun all affected checks before scoring or outputting JSON.


## Design reservation zones

When `designReservationZoneGuides` are present, treat them as intentional user guidance. Island zones should receive island/base/countertop layouts inside the volume. Peninsula zones should receive peninsula layouts that fit inside the volume and connect logically to nearby runs when possible. Tall-pantry zones should receive tall storage layouts inside the volume. If a zone cannot be used, explain why instead of ignoring it silently.
