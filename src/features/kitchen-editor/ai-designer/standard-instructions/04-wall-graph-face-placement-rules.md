# 04 - Wall Graph Face Placement Rules

Wall face placement is governed by `cabinetPlacementFacePolicies` and the derived placement helpers.

Face policy values:

- `required`: the AI should design on this face unless physically impossible or explicitly relaxed by the user.
- `optional`: the AI may design on this face if useful.
- `none`: the AI must not place kitchen objects on this face.

## Derived helpers

Use `wallFacePlacementGuides` for valid optional/required faces. A face without a guide is not a valid cabinet placement face.

Use `cabinetCornerPlacementGuides` only when the helper reports a supported cabinet corner. Do not invent corner guides.

## Required faces

A required face should have valid kitchen design coverage unless:

- it is blocked by input doors/windows/openings or fixed objects
- the user explicitly requests not to use it
- catalog constraints make it impossible, in which case report the conflict

## Optional faces

Optional faces can be used for better storage, symmetry, requested appliances, or to complete a connected corner. Optional faces do not have to be filled if the design is already valid and the user did not request them.

## None faces

Never place cabinets, appliances, panels, fillers, countertops, doors, windows, or any generated kitchen object on a `none` face.

## Corner classification

For each connected wall pair:

- If a valid cabinet corner guide exists and angle is 90 degrees, it can use blind-corner logic.
- If faces are collinear, merge or treat as a continuous straight run when policies allow.
- If angle is unsupported, do not force a blind corner. Treat as termination or report the limitation if required coverage is impossible.
