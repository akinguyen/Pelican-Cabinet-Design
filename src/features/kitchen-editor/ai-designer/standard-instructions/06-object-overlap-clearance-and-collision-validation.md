# 06 - Object Overlap, Clearance, and Collision Validation

A candidate layout is not valid until it passes solid collision, functional access, wall penetration, blocker, and corner-assembly validation.

Passing simple box collision is not enough.

## Collision validation categories

Validate three separate collision states:

1. Solid footprint collision.
   No cabinet, appliance, filler, panel, or countertop body may overlap another body unless the overlap is an intentional subcomponent inside one catalog assembly.

2. Functional access collision.
   Doors, drawers, blind cabinet fronts, appliance fronts, handles, and required access faces must remain visible and usable. A layout can fail functional access even when solid boxes do not overlap.

3. Corner assembly collision.
   For each blind corner, validate the combined footprint and access clearance of the host blind cabinet, turning blind filler, turning-wall run-end cabinet, adjacent same-wall cabinets, panels, and countertop above.

## Collision state

Reject a candidate if any generated or fixed object:

- overlaps another object invalidly
- extends into or through a wall
- crosses to the wrong wall side
- extends outside its usable wall span
- overlaps a blocked door/window/opening zone
- violates appliance/catalog clearance
- collides at a connected corner
- places a wall cabinet in a tall-object blocked zone
- blocks a required door, drawer, blind-front, appliance-front, or handle access zone

## Same-wall interval collision

For objects on the same run:

```txt
objectA.intervalEnd <= objectB.intervalStart
```

For normal tight run coverage:

```txt
objectA.intervalEnd == objectB.intervalStart
```

unless a valid filler or clearance occupies the gap.

## Footprint collision

For connected corners and objects on different walls, use world footprint polygons plus vertical intervals. Do not rely only on along-wall intervals.

Reject if footprints overlap and vertical intervals overlap, except for intentional internal subcomponents inside one catalog assembly.

## Functional access validation

Build an access zone for every object face that must remain usable:

- blind cabinet door/front access zone
- normal cabinet door access zone
- drawer access zone
- appliance front access zone
- refrigerator front access zone
- dishwasher/range/oven front access zone
- handles that should remain visible and reachable

Reject if another object, filler, panel, countertop, or perpendicular cabinet crosses, covers, or visually blocks that access zone.

For blind cabinets specifically:

```txt
the turning-wall run-end cabinet may interact only with the hidden blind-side zone;
it must not cover the blind door/front or handle side.
```

## Wall penetration

For every wall-based object:

- back edge must align with chosen wall face
- depth extends outward along `designSideNormal`
- no part of object footprint may cross behind the wall face or into the wall solid

## Opening blocker validation

Doors normally block base, wall, tall, appliance, panel, filler, and countertop placement.

Windows block wall/tall placement through the window zone. Base cabinets may go below a window only if the sill/counter height condition allows it.

Wall openings block all objects that overlap their blocker interval and vertical range.

## Final hard rejection

Do not output a layout if any collision, functional access blockage, blocker overlap, wall penetration, invalid overlap, invalid blind-corner assembly, or unexplained span gap remains.
