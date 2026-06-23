import type { SceneEntityPlanFootprint } from "@/engine/scene-entities/sceneEntityPlanGeometryTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import type { SceneEntityMeasurementPolicy, SceneEntityWallMeasurementGuide } from "../spatialGuideTypes";
import type { SpatialSceneSnapshot } from "../spatialSceneSnapshot";
import { createPlanWallMeasurementEdges } from "../spatialSceneSnapshot";
import { createElevationWallFaceMeasurementGuides } from "./spatialElevationMeasurementSolver";
import { createFloorMeasurementGuide } from "./spatialFloorMeasurementSolver";
import { createPlanFootprintWallMeasurementGuides, createPlanWallFaceCenterMeasurementGuides } from "./spatialPlanMeasurementSolver";
import { isNonNullable } from "./spatialMeasurementGeometry";

export function buildSceneEntitySpatialMeasurementGuides(args: {
  bounds: SceneEntityBounds;
  snapshot: SpatialSceneSnapshot;
  measurementPolicy: SceneEntityMeasurementPolicy;
}): readonly SceneEntityWallMeasurementGuide[] {
  const sourceId = `${args.bounds.entityKind}:${args.bounds.entityId}`;

  if (args.measurementPolicy === "elevation-wall-face") {
    return args.snapshot.elevationWallFace === null
      ? []
      : createElevationWallFaceMeasurementGuides({
        bounds: args.bounds,
        frame: args.snapshot.frame,
        wallFaceBounds: args.snapshot.elevationWallFace.bounds,
        sourceId,
      });
  }

  return [
    ...createPlanWallFaceCenterMeasurementGuides({
      bounds: args.bounds,
      wallEdges: args.snapshot.planWallMeasurementEdges,
      sourceId,
    }),
    ...(args.measurementPolicy === "perspective-xy-plus-floor"
      ? [createFloorMeasurementGuide({ bounds: args.bounds, sourceId })].filter(isNonNullable)
      : []),
  ];
}

export function buildSceneEntitySpatialMeasurementGuidesFromFootprint(args: {
  footprint: SceneEntityPlanFootprint;
  placedWallGraphs: readonly PlacedWallGraph[];
  sourceId: string;
}): readonly SceneEntityWallMeasurementGuide[] {
  return createPlanFootprintWallMeasurementGuides({
    footprint: args.footprint,
    wallEdges: createPlanWallMeasurementEdges(args.placedWallGraphs),
    sourceId: args.sourceId,
  });
}
