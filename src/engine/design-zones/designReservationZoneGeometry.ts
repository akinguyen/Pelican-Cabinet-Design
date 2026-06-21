import { rotatePointAroundZInches, type Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneEntityPlanFootprintEdge, SceneEntityPlanFootprint } from "@/engine/scene-entities/sceneEntityPlanGeometryTypes";
import type { SceneEntityElevationFrame } from "@/engine/scene/sceneDragTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { getDefaultDesignReservationZoneDimensions } from "./designReservationZoneDefaults";
import type { DesignReservationZone, DesignReservationZonePurpose } from "./designReservationZoneTypes";

export type DesignReservationZoneVolumeGeometry = Readonly<{
  footprint: SceneEntityPlanFootprint;
  baseCornerPointsInches: readonly Point3DInches[];
  topCornerPointsInches: readonly Point3DInches[];
  edgeSegments: readonly Readonly<{
    id: string;
    startPointInches: Point3DInches;
    endPointInches: Point3DInches;
  }>[];
}>;

export function createDesignReservationZoneFootprint(
  zone: DesignReservationZone,
): SceneEntityPlanFootprint {
  const halfWidthInches = zone.sizeInches.widthInches / 2;
  const halfDepthInches = zone.sizeInches.depthInches / 2;
  const localCorners: readonly Point3DInches[] = [
    { xInches: -halfWidthInches, yInches: -halfDepthInches, zInches: 0 },
    { xInches: halfWidthInches, yInches: -halfDepthInches, zInches: 0 },
    { xInches: halfWidthInches, yInches: halfDepthInches, zInches: 0 },
    { xInches: -halfWidthInches, yInches: halfDepthInches, zInches: 0 },
  ];
  const cornerPointsInches = localCorners.map((localCorner) => {
    const rotatedCorner = rotatePointAroundZInches(localCorner, zone.rotationDegrees.zDegrees);

    return {
      xInches: zone.worldPositionInches.xInches + rotatedCorner.xInches,
      yInches: zone.worldPositionInches.yInches + rotatedCorner.yInches,
      zInches: zone.worldPositionInches.zInches,
    };
  });

  return createFootprintFromCorners(zone.worldPositionInches, cornerPointsInches);
}

export function createDesignReservationZoneVolumeGeometry(
  zone: DesignReservationZone,
): DesignReservationZoneVolumeGeometry {
  const footprint = createDesignReservationZoneFootprint(zone);
  const halfHeightInches = zone.sizeInches.heightInches / 2;
  const minZInches = zone.worldPositionInches.zInches - halfHeightInches;
  const maxZInches = zone.worldPositionInches.zInches + halfHeightInches;
  const baseCornerPointsInches = footprint.cornerPointsInches.map((cornerPointInches) => ({
    ...cornerPointInches,
    zInches: minZInches,
  }));
  const topCornerPointsInches = footprint.cornerPointsInches.map((cornerPointInches) => ({
    ...cornerPointInches,
    zInches: maxZInches,
  }));
  const edgeSegments = [
    ...createClosedEdgeSegments("base", baseCornerPointsInches),
    ...createClosedEdgeSegments("top", topCornerPointsInches),
    ...baseCornerPointsInches.map((baseCornerPointInches, cornerIndex) => ({
      id: `vertical-${cornerIndex}`,
      startPointInches: baseCornerPointInches,
      endPointInches: topCornerPointsInches[cornerIndex],
    })),
  ];

  return {
    footprint,
    baseCornerPointsInches,
    topCornerPointsInches,
    edgeSegments,
  };
}

export function createDesignReservationZoneAtPointer(args: {
  id: string;
  reservedFor: DesignReservationZonePurpose;
  pointInches: Point3DInches;
  sceneViewMode: SceneViewMode;
  elevationMoveFrame?: SceneEntityElevationFrame;
}): DesignReservationZone {
  const defaultDimensions = getDefaultDesignReservationZoneDimensions(args.reservedFor);

  if (args.sceneViewMode === "elevation" && args.elevationMoveFrame !== undefined) {
    const worldPositionInches = {
      xInches:
        args.pointInches.xInches +
        args.elevationMoveFrame.outwardDirectionInches.xInches * (defaultDimensions.depthInches / 2),
      yInches:
        args.pointInches.yInches +
        args.elevationMoveFrame.outwardDirectionInches.yInches * (defaultDimensions.depthInches / 2),
      zInches: Math.max(defaultDimensions.heightInches / 2, args.pointInches.zInches),
    };

    return {
      id: args.id,
      entityKind: "design-reservation-zone",
      reservedFor: args.reservedFor,
      worldPositionInches,
      rotationDegrees: {
        zDegrees: getZRotationDegreesForFaceDirection(args.elevationMoveFrame.faceDirectionInches),
      },
      sizeInches: defaultDimensions,
    };
  }

  return {
    id: args.id,
    entityKind: "design-reservation-zone",
    reservedFor: args.reservedFor,
    worldPositionInches: {
      xInches: args.pointInches.xInches,
      yInches: args.pointInches.yInches,
      zInches: defaultDimensions.heightInches / 2,
    },
    rotationDegrees: { zDegrees: 0 },
    sizeInches: defaultDimensions,
  };
}

export function getDesignReservationZoneFootprintBounds(
  footprint: SceneEntityPlanFootprint,
): Readonly<{ minXInches: number; maxXInches: number; minYInches: number; maxYInches: number }> {
  return footprint.cornerPointsInches.reduce((bounds, pointInches) => ({
    minXInches: Math.min(bounds.minXInches, pointInches.xInches),
    maxXInches: Math.max(bounds.maxXInches, pointInches.xInches),
    minYInches: Math.min(bounds.minYInches, pointInches.yInches),
    maxYInches: Math.max(bounds.maxYInches, pointInches.yInches),
  }), {
    minXInches: Number.POSITIVE_INFINITY,
    maxXInches: Number.NEGATIVE_INFINITY,
    minYInches: Number.POSITIVE_INFINITY,
    maxYInches: Number.NEGATIVE_INFINITY,
  });
}

export function getZRotationDegreesForFaceDirection(faceDirectionInches: Point3DInches): number {
  return -((Math.atan2(faceDirectionInches.yInches, faceDirectionInches.xInches) * 180) / Math.PI);
}

function createFootprintFromCorners(
  centerPointInches: Point3DInches,
  cornerPointsInches: readonly Point3DInches[],
): SceneEntityPlanFootprint {
  const edges: SceneEntityPlanFootprintEdge[] = cornerPointsInches.map((cornerPointInches, cornerIndex) => {
    const endPointInches = cornerPointsInches[(cornerIndex + 1) % cornerPointsInches.length];

    return {
      index: cornerIndex,
      startPointInches: cornerPointInches,
      endPointInches,
      midpointInches: {
        xInches: (cornerPointInches.xInches + endPointInches.xInches) / 2,
        yInches: (cornerPointInches.yInches + endPointInches.yInches) / 2,
        zInches: centerPointInches.zInches,
      },
      lengthInches: Math.hypot(
        endPointInches.xInches - cornerPointInches.xInches,
        endPointInches.yInches - cornerPointInches.yInches,
      ),
    };
  });

  return {
    centerPointInches,
    cornerPointsInches,
    edges,
  };
}

function createClosedEdgeSegments(
  prefix: string,
  pointsInches: readonly Point3DInches[],
): readonly Readonly<{ id: string; startPointInches: Point3DInches; endPointInches: Point3DInches }>[] {
  return pointsInches.map((pointInches, pointIndex) => ({
    id: `${prefix}-${pointIndex}`,
    startPointInches: pointInches,
    endPointInches: pointsInches[(pointIndex + 1) % pointsInches.length],
  }));
}
