# 09 - Derived Cutout Source Placement Rules

The AI places source assemblies. The engine derives cutouts from those sources.

## Wall openings

Doors, windows, and wall openings are not invented by the AI.

If they exist in input, preserve them as fixed input assemblies and convert them into blockers for design reasoning.

Do not output separate wall opening arrays unless the schema explicitly requires them.

## Countertop cutout sources

Only placed sink/cooktop-style assemblies with catalog `cutoutBehavior.countertop` can create countertop cutouts.

Do not invent countertop cutouts if no source object is placed.

For drop-in sinks/cooktops, the cutout should follow the catalog cutout body rectangle or full body outer rectangle specified by the catalog behavior.

## Countertop opening validation

Countertop cutout source must:

- be placed on or through a valid countertop span
- fit within the countertop footprint
- not overlap another cutout invalidly
- not require countertop through a tall object, door, wall opening, or unexplained gap


## Countertop inside-corner rule

Do not generate overlapping rectangular countertop slabs at inside corners.

Countertops must be generated from validated base runs and must be one of:

- clipped
- mitered
- shortened
- unioned into a non-overlapping shape

Reject any countertop layout where two countertop slabs overlap at a corner.

At blind corners, countertop validation must use the final validated blind-corner candidate. If the blind cabinet, turning filler, or turning-wall cabinet changes, regenerate or revalidate the countertop corner.
