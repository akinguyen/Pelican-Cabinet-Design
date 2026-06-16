# 03 — World Coordinate and Object Orientation

The Kitchen Editor scene uses inches for all domain geometry.

## Axes

- `xInches` is horizontal left/right.
- `yInches` is horizontal front/back.
- `zInches` is vertical height.
- The floor plane is `zInches = 0`.
- `worldPositionInches` is the center of the placed assembly.

## Object front direction

At `rotationDegrees.zDegrees = 0`, the object front faces `+Y` and width runs along the X axis.

The app uses user-facing top-view rotation where positive rotation turns the front direction from `+Y` toward `+X`.

Common rotations:

- `0` means front faces `+Y`.
- `90` means front faces `+X`.
- `180` means front faces `-Y`.
- `-90` or `270` means front faces `-X`.

When using a wall face placement guide, use the guide's `objectRotationDegrees.zDegrees` unless the user explicitly asks for a different orientation and the placement remains valid.

## Wall-based object depth

For an object placed on a wall face, the object's front should face the wall face normal. The object center usually sits along the face plus the normal scaled by half the object's depth, unless a catalog object or placement helper says otherwise.
