# 05 — Run Interval Placement and Spacing

Build cabinet runs from valid wall segment faces. A valid wall segment face is one listed in that segment's `cabinetPlacementFaceSides`.

## Run identity

Treat each `(wallGraphId, wallSegmentId, faceSide)` as its own run surface. Do not merge `side-a` and `side-b` into one run. If a segment allows both sides, the two faces can support two independent runs.

## Along-wall placement

Use the wall face placement guide to understand the usable length, start/end points, face normal, and object rotation. Place objects using center points along the face. Convert along-face coordinates into `worldPositionInches` with the guide geometry.

## Filling a run

Prefer clean, buildable cabinet width combinations. Before leaving a small or awkward gap, try standard width alternatives, filler, panel, blind/corner options, or a different object arrangement.

Use fillers for intentional small gaps between cabinetry and walls/corners/appliances. Use finished panels for exposed cabinet sides facing open air. Do not use a filler and an end panel for the same exact condition.

## Spacing

Keep runs aligned by front face, top height, and module rhythm. Avoid tiny leftover gaps unless every reasonable standard buildable option fails.
