import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { AssemblyObjectAlignmentGuide, AssemblyPlacementElevationFrame, AssemblyPlacementFootprint } from "@/engine/assemblies/placement/assemblyPlacementTypes";
import { createAssemblyPlacementFootprint } from "@/engine/assemblies/placement/assemblyPlacementGeometry";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { createDesignReservationZoneSceneEntityBounds } from "@/engine/scene-entities/designReservationZoneSceneEntityBounds";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import { buildConnectedWallGeometry } from "@/engine/walls/buildConnectedWallGeometry";
import {
  combineElevationAlignmentCandidateDeltas,
  findElevationAlignmentCandidates,
  selectCompatibleElevationAlignmentCandidates,
} from "@/engine/assemblies/placement/alignment/assemblyElevationAlignmentCandidates";
import {
  createElevationAlignmentBox,
  createFloorElevationAlignmentBox,
  createWallFaceElevationAlignmentBoxes,
  isElevationAlignmentBox,
  isElevationAlignmentTargetRelevant,
} from "@/engine/assemblies/placement/alignment/assemblyElevationAlignmentBoxes";
import { buildElevationAlignmentGuides } from "@/engine/assemblies/placement/alignment/assemblyElevationAlignmentGuides";
import type { ElevationAlignmentBox } from "@/engine/assemblies/placement/alignment/assemblyObjectAlignmentTypes";
import {
  OBJECT_ELEVATION_ALIGNMENT_SNAP_DISTANCE_INCHES,
} from "@/engine/assemblies/placement/alignment/assemblyObjectAlignmentConstants";
import { getPlanDotProduct, normalizePlanVector } from "@/engine/assemblies/placement/assemblyPlacementPlanGeometry";
import type { DesignReservationZone } from "./designReservationZoneTypes";
import {
  getDesignReservationZoneFootprintBounds,
} from "./designReservationZoneGeometry";

const DESIGN_RESERVATION_ZONE_ALIGNMENT_SNAP_DISTANCE_INCHES = 4;
const DESIGN_RESERVATION_ZONE_ALIGNMENT_GUIDE_PADDING_INCHES = 16;

type Axis = "x" | "y";
type AnchorRole = "min" | "center" | "max";

type AlignmentAnchor = Readonly<{
  id: string;
  axis: Axis;
  role: AnchorRole;
  valueInches: number;
}>;

type AlignmentFootprint = Readonly<{
  id: string;
  footprint: AssemblyPlacementFootprint;
  xAnchors: readonly AlignmentAnchor[];
  yAnchors: readonly AlignmentAnchor[];
}>;

type SelectedAlignmentCandidate = Readonly<{
  axis: Axis;
  movingAnchor: AlignmentAnchor;
  targetAnchor: AlignmentAnchor;
  targetFootprint: AssemblyPlacementFootprint;
  deltaInches: number;
  distanceInches: number;
}>;

export type DesignReservationZoneAlignmentResult = Readonly<{
  zone: DesignReservationZone;
  alignmentGuides: readonly AssemblyObjectAlignmentGuide[];
}>;

export function alignDesignReservationZone(args: {
  movingZone: DesignReservationZone;
  placedAssemblies: readonly PlacedAssembly[];
  placedWallGraphs: readonly PlacedWallGraph[];
  designReservationZones: readonly DesignReservationZone[];
  movementSource?: "perspective" | "floor-plan" | "elevation";
  elevationMoveFrame?: AssemblyPlacementElevationFrame;
}): DesignReservationZoneAlignmentResult {
  if (args.movementSource === "elevation" && args.elevationMoveFrame !== undefined) {
    return alignDesignReservationZoneInElevation(args as {
      movingZone: DesignReservationZone;
      placedAssemblies: readonly PlacedAssembly[];
      placedWallGraphs: readonly PlacedWallGraph[];
      designReservationZones: readonly DesignReservationZone[];
      movementSource: "elevation";
      elevationMoveFrame: AssemblyPlacementElevationFrame;
    });
  }

  return alignDesignReservationZoneInPlan(args);
}

export function snapDesignReservationZoneByFootprint(args: {
  movingZone: DesignReservationZone;
  placedAssemblies: readonly PlacedAssembly[];
  placedWallGraphs: readonly PlacedWallGraph[];
  designReservationZones: readonly DesignReservationZone[];
}): Readonly<{ baseCenterPointInches: Point3DInches; alignmentGuides: readonly AssemblyObjectAlignmentGuide[] }> {
  const result = alignDesignReservationZoneInPlan(args);

  return {
    baseCenterPointInches: result.zone.baseCenterPointInches,
    alignmentGuides: result.alignmentGuides,
  };
}

function alignDesignReservationZoneInPlan(args: {
  movingZone: DesignReservationZone;
  placedAssemblies: readonly PlacedAssembly[];
  placedWallGraphs: readonly PlacedWallGraph[];
  designReservationZones: readonly DesignReservationZone[];
}): DesignReservationZoneAlignmentResult {
  const movingFootprint = createAlignmentFootprint({
    id: args.movingZone.id,
    footprint: createDesignReservationZoneSceneEntityBounds(args.movingZone).footprint,
  });
  const targetFootprints = [
    ...args.placedAssemblies.map((placedAssembly) => createAlignmentFootprint({
      id: placedAssembly.id,
      footprint: createAssemblyPlacementFootprint(placedAssembly),
    })),
    ...args.designReservationZones
      .filter((zone) => zone.id !== args.movingZone.id)
      .map((zone) => createAlignmentFootprint({
        id: zone.id,
        footprint: createDesignReservationZoneSceneEntityBounds(zone).footprint,
      })),
    ...createWallAlignmentFootprints(args.placedWallGraphs),
  ];
  const xCandidate = selectAlignmentCandidate({
    axis: "x",
    movingAnchors: movingFootprint.xAnchors,
    targetFootprints,
  });
  const yCandidate = selectAlignmentCandidate({
    axis: "y",
    movingAnchors: movingFootprint.yAnchors,
    targetFootprints,
  });
  const deltaXInches = xCandidate?.deltaInches ?? 0;
  const deltaYInches = yCandidate?.deltaInches ?? 0;
  const baseCenterPointInches = {
    xInches: args.movingZone.baseCenterPointInches.xInches + deltaXInches,
    yInches: args.movingZone.baseCenterPointInches.yInches + deltaYInches,
    zInches: args.movingZone.baseCenterPointInches.zInches,
  };
  const zone = {
    ...args.movingZone,
    baseCenterPointInches,
  };
  const snappedMovingFootprint = createDesignReservationZoneSceneEntityBounds(zone).footprint;

  return {
    zone,
    alignmentGuides: [xCandidate, yCandidate].flatMap((candidate) => (
      candidate === null ? [] : [createAlignmentGuide({
        candidate,
        movingFootprint: snappedMovingFootprint,
      })]
    )),
  };
}

function alignDesignReservationZoneInElevation(args: {
  movingZone: DesignReservationZone;
  placedAssemblies: readonly PlacedAssembly[];
  placedWallGraphs: readonly PlacedWallGraph[];
  designReservationZones: readonly DesignReservationZone[];
  elevationMoveFrame: AssemblyPlacementElevationFrame;
}): DesignReservationZoneAlignmentResult {
  const movingBox = createSceneEntityElevationAlignmentBox({
    bounds: createDesignReservationZoneSceneEntityBounds(args.movingZone),
    elevationFrame: args.elevationMoveFrame,
  });

  if (movingBox === null) {
    return { zone: args.movingZone, alignmentGuides: [] };
  }

  const targetBoxes = [
    createFloorElevationAlignmentBox({ movingBox, elevationFrame: args.elevationMoveFrame }),
    ...createWallFaceElevationAlignmentBoxes({
      placedWallGraphs: args.placedWallGraphs,
      elevationFrame: args.elevationMoveFrame,
      movingDepthInches: movingBox.depthInches,
    }),
    ...args.placedAssemblies
      .map((placedAssembly) => createElevationAlignmentBox({
        placedAssembly,
        elevationFrame: args.elevationMoveFrame,
      }))
      .filter(isElevationAlignmentBox)
      .filter((targetBox) => isElevationAlignmentTargetRelevant({
        movingBox,
        targetBox,
        elevationFrame: args.elevationMoveFrame,
      })),
    ...args.designReservationZones
      .filter((zone) => zone.id !== args.movingZone.id)
      .map((zone) => createSceneEntityElevationAlignmentBox({
        bounds: createDesignReservationZoneSceneEntityBounds(zone),
        elevationFrame: args.elevationMoveFrame,
      }))
      .filter(isElevationAlignmentBox)
      .filter((targetBox) => isElevationAlignmentTargetRelevant({
        movingBox,
        targetBox,
        elevationFrame: args.elevationMoveFrame,
      })),
  ].filter(isElevationAlignmentBox);

  const candidates = findElevationAlignmentCandidates({
    movingBox,
    targetBoxes,
    elevationFrame: args.elevationMoveFrame,
  });

  if (candidates.length === 0) {
    return { zone: args.movingZone, alignmentGuides: [] };
  }

  const selectedCandidates = selectCompatibleElevationAlignmentCandidates(candidates);
  const alignmentDeltaInches = combineElevationAlignmentCandidateDeltas(selectedCandidates);
  const zone = {
    ...args.movingZone,
    baseCenterPointInches: {
      xInches: args.movingZone.baseCenterPointInches.xInches + alignmentDeltaInches.xInches,
      yInches: args.movingZone.baseCenterPointInches.yInches + alignmentDeltaInches.yInches,
      zInches: Math.max(0, args.movingZone.baseCenterPointInches.zInches + (alignmentDeltaInches.zInches ?? 0)),
    },
  };
  const alignedBox = createSceneEntityElevationAlignmentBox({
    bounds: createDesignReservationZoneSceneEntityBounds(zone),
    elevationFrame: args.elevationMoveFrame,
  }) ?? movingBox;

  return {
    zone,
    alignmentGuides: buildElevationAlignmentGuides({
      movingBox: alignedBox,
      targetBoxes,
      selectedCandidates,
      elevationFrame: args.elevationMoveFrame,
    }),
  };
}

function createSceneEntityElevationAlignmentBox(args: {
  bounds: SceneEntityBounds;
  elevationFrame: AssemblyPlacementElevationFrame;
}): ElevationAlignmentBox | null {
  const faceDirectionInches = normalizePlanVector({
    xInches: args.elevationFrame.faceDirectionInches.xInches,
    yInches: args.elevationFrame.faceDirectionInches.yInches,
  });
  const outwardDirectionInches = normalizePlanVector({
    xInches: args.elevationFrame.outwardDirectionInches.xInches,
    yInches: args.elevationFrame.outwardDirectionInches.yInches,
  });

  if (faceDirectionInches === null || outwardDirectionInches === null) {
    return null;
  }

  const projectedUValuesInches = args.bounds.footprint.cornerPointsInches.map((cornerPointInches) => getPlanDotProduct({
    xInches: cornerPointInches.xInches - args.elevationFrame.planeOriginInches.xInches,
    yInches: cornerPointInches.yInches - args.elevationFrame.planeOriginInches.yInches,
  }, faceDirectionInches));
  const projectedDepthValuesInches = args.bounds.footprint.cornerPointsInches.map((cornerPointInches) => getPlanDotProduct({
    xInches: cornerPointInches.xInches - args.elevationFrame.planeOriginInches.xInches,
    yInches: cornerPointInches.yInches - args.elevationFrame.planeOriginInches.yInches,
  }, outwardDirectionInches));
  const leftInches = Math.min(...projectedUValuesInches);
  const rightInches = Math.max(...projectedUValuesInches);
  const depthInches = getPlanDotProduct({
    xInches: args.bounds.centerPointInches.xInches - args.elevationFrame.planeOriginInches.xInches,
    yInches: args.bounds.centerPointInches.yInches - args.elevationFrame.planeOriginInches.yInches,
  }, outwardDirectionInches);

  return {
    assemblyId: args.bounds.entityId,
    targetPriority: 0,
    snapDistanceInches: OBJECT_ELEVATION_ALIGNMENT_SNAP_DISTANCE_INCHES,
    leftInches,
    centerInches: (leftInches + rightInches) / 2,
    rightInches,
    bottomInches: args.bounds.heightRangeInches.minZInches,
    middleInches: (args.bounds.heightRangeInches.minZInches + args.bounds.heightRangeInches.maxZInches) / 2,
    topInches: args.bounds.heightRangeInches.maxZInches,
    depthInches,
    viewZoneBoundsInches: args.elevationFrame.viewZoneInches === undefined
      ? undefined
      : {
          leftInches: Math.min(...projectedUValuesInches),
          rightInches: Math.max(...projectedUValuesInches),
          bottomInches: args.bounds.heightRangeInches.minZInches,
          topInches: args.bounds.heightRangeInches.maxZInches,
          nearDepthInches: Math.min(...projectedDepthValuesInches),
          farDepthInches: Math.max(...projectedDepthValuesInches),
        },
  };
}

function createAlignmentFootprint(args: {
  id: string;
  footprint: AssemblyPlacementFootprint;
}): AlignmentFootprint {
  const bounds = getDesignReservationZoneFootprintBounds(args.footprint);
  const centerXInches = (bounds.minXInches + bounds.maxXInches) / 2;
  const centerYInches = (bounds.minYInches + bounds.maxYInches) / 2;

  return {
    id: args.id,
    footprint: args.footprint,
    xAnchors: [
      { id: `${args.id}-min-x`, axis: "x", role: "min", valueInches: bounds.minXInches },
      { id: `${args.id}-center-x`, axis: "x", role: "center", valueInches: centerXInches },
      { id: `${args.id}-max-x`, axis: "x", role: "max", valueInches: bounds.maxXInches },
    ],
    yAnchors: [
      { id: `${args.id}-min-y`, axis: "y", role: "min", valueInches: bounds.minYInches },
      { id: `${args.id}-center-y`, axis: "y", role: "center", valueInches: centerYInches },
      { id: `${args.id}-max-y`, axis: "y", role: "max", valueInches: bounds.maxYInches },
    ],
  };
}

function createWallAlignmentFootprints(
  placedWallGraphs: readonly PlacedWallGraph[],
): readonly AlignmentFootprint[] {
  return placedWallGraphs.flatMap((wallGraph) => {
    const faceFootprints = buildConnectedWallGeometry(wallGraph).faces.map((face) => createLineFootprint({
      id: `${wallGraph.id}-${face.wallSegmentId}-${face.side}-face`,
      startPointInches: face.startPointInches,
      endPointInches: face.endPointInches,
    }));
    const segmentFootprints = wallGraph.segments.flatMap((segment) => {
      const startNode = wallGraph.nodes.find((node) => node.id === segment.startNodeId);
      const endNode = wallGraph.nodes.find((node) => node.id === segment.endNodeId);

      if (startNode === undefined || endNode === undefined) {
        return [];
      }

      return [createLineFootprint({
        id: `${wallGraph.id}-${segment.id}-centerline`,
        startPointInches: startNode.positionInches,
        endPointInches: endNode.positionInches,
      })];
    });

    return [...faceFootprints, ...segmentFootprints];
  });
}

function createLineFootprint(args: {
  id: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
}): AlignmentFootprint {
  return createAlignmentFootprint({
    id: args.id,
    footprint: {
      centerPointInches: {
        xInches: (args.startPointInches.xInches + args.endPointInches.xInches) / 2,
        yInches: (args.startPointInches.yInches + args.endPointInches.yInches) / 2,
        zInches: 0,
      },
      cornerPointsInches: [
        { ...args.startPointInches, zInches: 0 },
        { ...args.endPointInches, zInches: 0 },
        { ...args.endPointInches, zInches: 0 },
        { ...args.startPointInches, zInches: 0 },
      ],
      edges: [],
    },
  });
}

function selectAlignmentCandidate(args: {
  axis: Axis;
  movingAnchors: readonly AlignmentAnchor[];
  targetFootprints: readonly AlignmentFootprint[];
}): SelectedAlignmentCandidate | null {
  let bestCandidate: SelectedAlignmentCandidate | null = null;

  args.movingAnchors.forEach((movingAnchor) => {
    args.targetFootprints.forEach((targetFootprint) => {
      const targetAnchors = args.axis === "x" ? targetFootprint.xAnchors : targetFootprint.yAnchors;

      targetAnchors.forEach((targetAnchor) => {
        const deltaInches = targetAnchor.valueInches - movingAnchor.valueInches;
        const distanceInches = Math.abs(deltaInches);

        if (distanceInches > DESIGN_RESERVATION_ZONE_ALIGNMENT_SNAP_DISTANCE_INCHES) {
          return;
        }

        if (bestCandidate === null || distanceInches < bestCandidate.distanceInches) {
          bestCandidate = {
            axis: args.axis,
            movingAnchor,
            targetAnchor,
            targetFootprint: targetFootprint.footprint,
            deltaInches,
            distanceInches,
          };
        }
      });
    });
  });

  return bestCandidate;
}

function createAlignmentGuide(args: {
  candidate: SelectedAlignmentCandidate;
  movingFootprint: AssemblyPlacementFootprint;
}): AssemblyObjectAlignmentGuide {
  const movingBounds = getDesignReservationZoneFootprintBounds(args.movingFootprint);
  const targetBounds = getDesignReservationZoneFootprintBounds(args.candidate.targetFootprint);

  if (args.candidate.axis === "x") {
    const xInches = args.candidate.targetAnchor.valueInches;
    const minYInches = Math.min(movingBounds.minYInches, targetBounds.minYInches) - DESIGN_RESERVATION_ZONE_ALIGNMENT_GUIDE_PADDING_INCHES;
    const maxYInches = Math.max(movingBounds.maxYInches, targetBounds.maxYInches) + DESIGN_RESERVATION_ZONE_ALIGNMENT_GUIDE_PADDING_INCHES;

    return {
      id: `design-zone-alignment-x-${args.candidate.targetAnchor.id}-${args.candidate.movingAnchor.id}`,
      guideKind: args.candidate.movingAnchor.role === "center" || args.candidate.targetAnchor.role === "center"
        ? "center-line"
        : "edge-line",
      guidePlane: "plan",
      startPointInches: { xInches, yInches: minYInches, zInches: 0 },
      endPointInches: { xInches, yInches: maxYInches, zInches: 0 },
    };
  }

  const yInches = args.candidate.targetAnchor.valueInches;
  const minXInches = Math.min(movingBounds.minXInches, targetBounds.minXInches) - DESIGN_RESERVATION_ZONE_ALIGNMENT_GUIDE_PADDING_INCHES;
  const maxXInches = Math.max(movingBounds.maxXInches, targetBounds.maxXInches) + DESIGN_RESERVATION_ZONE_ALIGNMENT_GUIDE_PADDING_INCHES;

  return {
    id: `design-zone-alignment-y-${args.candidate.targetAnchor.id}-${args.candidate.movingAnchor.id}`,
    guideKind: args.candidate.movingAnchor.role === "center" || args.candidate.targetAnchor.role === "center"
      ? "center-line"
      : "edge-line",
    guidePlane: "plan",
    startPointInches: { xInches: minXInches, yInches, zInches: 0 },
    endPointInches: { xInches: maxXInches, yInches, zInches: 0 },
  };
}
