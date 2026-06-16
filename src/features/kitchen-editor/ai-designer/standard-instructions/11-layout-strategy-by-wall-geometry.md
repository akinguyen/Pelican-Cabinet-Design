# 11 — Layout Strategy by Wall Geometry

Use the wall graph and derived placement helpers to identify usable cabinet runs.

## Straight wall

Use the allowed wall face as a single run. Place anchors first, then fill with supporting cabinetry and countertop.

## L-shaped or connected walls

Treat each allowed wall face as a separate run that may meet at a corner. Use valid corner strategy rules. Do not place cabinets on disallowed faces just because they form a convenient L shape.

## Multi-wall rooms

Decide which allowed faces should host primary zones. Tall storage often works near run ends. Cooking and cleanup should have clear counter landing space.

## Walls without cabinet placement sides

If a wall segment has `cabinetPlacementFaceSides: []`, treat it as unavailable for kitchen object placement. You may still preserve the wall in output, but do not use it as a cabinet run.
