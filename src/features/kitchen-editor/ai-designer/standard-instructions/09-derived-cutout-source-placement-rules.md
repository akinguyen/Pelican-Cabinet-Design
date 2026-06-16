# 09 — Derived Cutout Source Placement Rules

The scene does not store wall openings or countertop openings as independent source-of-truth arrays. The engine derives cutouts from placed assemblies.

Current runtime concepts include:

- `DerivedWallOpening` for wall cutouts created by wall door/window style assemblies.
- `DerivedCountertopOpening` and `DerivedCountertopOpeningShape` for countertop cutouts created by drop-in sink/cooktop style assemblies.

Do not output derived openings as scene data.

## Wall openings

To create a door or window opening, place the correct catalog assembly on an allowed wall face. The wall segment face must be listed in `cabinetPlacementFaceSides`. Use the wall face placement guide for normal, rotation, and along-wall position. The engine derives the wall opening/cutout from the placed assembly.

## Countertop openings

To create a sink or cooktop cutout, place the countertop slab and the correct drop-in sink/cooktop assembly so the hosted object overlaps the intended countertop area. The engine derives the countertop cutout from the placed assemblies.

## Preservation

Import/export JSON should contain the source assemblies only, not derived cutout arrays.
