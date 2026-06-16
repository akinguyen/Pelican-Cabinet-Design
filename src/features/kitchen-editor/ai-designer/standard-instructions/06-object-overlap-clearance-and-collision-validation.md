# 06 — Object Overlap, Clearance, and Collision Validation

The output must be buildable. Use the scene, catalog dimensions, wall face permissions, and helper geometry to avoid invalid placement.

## Basic validation

- Do not place two top-level objects so their bodies occupy the same space unless one is intentionally stacked or mounted on the other.
- Do not place objects on wall faces not listed in `cabinetPlacementFaceSides`.
- Do not place any object below the floor.
- Keep floor-standing objects at `z = height / 2` unless a different distance from floor is required.
- Wall-mounted objects must have a valid height and should align to the selected wall face.

## Clearances

- Leave reasonable appliance, door, drawer, and walking clearances.
- Avoid placing a tall pantry or appliance directly where it blocks a base cabinet drawer/door from opening.
- Avoid blocking wall windows/doors with cabinetry unless the design explicitly calls for surrounding trim/cabinets and remains valid.

## Stacked and hosted objects

Some objects are intended to be stacked or hosted, such as cooktops/sinks on countertops, faucets behind sinks, and wall hoods above cooking appliances. These relationships are allowed when the objects align correctly and the engine can derive the needed cutouts.
