# 03 - World Coordinates and Object Orientation

The coordinate system is inches:

- X/Y are horizontal floor-plane axes.
- Z is vertical height.
- Object front at zero rotation faces +Y.
- Rotation is degrees.

Use derived wall face placement guides when available. Do not place objects on raw wall centerlines when a valid face guide exists.

## Wall-face guide placement

Each guide provides:

- wall graph id
- wall segment id
- face side
- placement requirement
- start point
- end point
- length
- design-side normal
- object rotation degrees

For a normal wall-based object:

1. Choose a valid wall-face guide.
2. Choose an along-wall interval inside the guide length.
3. Compute the along-wall center point from guide start toward guide end.
4. Offset from the wall face by the object's depth/2 along `designSideNormal`.
5. Set Z center from `distanceFromFloor + height/2`.
6. Set rotation from `objectRotationDegrees` unless a catalog-specific orientation rule overrides it.

## Local run interval

For every object on a run, store an internal interval:

```txt
intervalStart = alongWallCenter - width/2
intervalEnd   = alongWallCenter + width/2
```

For same-wall run objects, validate intervals in run coordinates, not by raw X/Y comparisons.

## Depth direction

The object's back edge must align to the wall face. Its depth must extend outward along `designSideNormal`.

Reject the object if its footprint extends into the wall, crosses to the wrong face side, or penetrates a blocked zone.

## Vertical interval

Store vertical interval for collision validation:

```txt
zMin = distanceFromFloor
zMax = distanceFromFloor + height
```

Two objects only collide if their horizontal footprints overlap and their vertical intervals overlap.
