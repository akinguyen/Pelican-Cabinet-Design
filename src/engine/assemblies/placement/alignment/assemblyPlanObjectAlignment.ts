import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { DerivedCountertopOpening } from "@/engine/countertops/countertopOpeningTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import { createDesignReservationZoneSceneEntityBounds } from "@/engine/scene-entities/designReservationZoneSceneEntityBounds";
import { createAssemblyPlacementFootprint, translateAssemblyPlacement } from "../assemblyPlacementGeometry";
import { getPlanVectorLength } from "../assemblyPlacementPlanGeometry";
import {
  OBJECT_ALIGNMENT_REMAINING_DISTANCE_TOLERANCE_INCHES,
  OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES,
} from "./assemblyObjectAlignmentConstants";
import { createObjectAlignmentFootprint } from "./assemblyObjectAlignmentFootprints";
import type {
  AssemblyObjectAlignmentConstraint,
  AssemblyObjectAlignmentResult,
} from "./assemblyObjectAlignmentTypes";
import {
  combineAlignmentCandidateDeltas,
  createAlignmentSnapTarget,
  findObjectAlignmentCandidates,
  selectCompatibleAlignmentCandidates,
} from "./assemblyPlanAlignmentCandidates";
import { buildAlignmentGuides } from "./assemblyPlanAlignmentGuides";
import {
  createCountertopOpeningAlignmentFootprints,
  createWallCenterlinePlanAlignmentFootprints,
  createWallFacePlanAlignmentFootprints,
  createDerivedWallOpeningPlanAlignmentFootprints,
} from "./assemblyPlanAlignmentTargets";

export function alignAssemblyPlacementWithPlanObjects(args: {
  placedAssembly: PlacedAssembly;
  targetAssemblies: readonly PlacedAssembly[];
  targetDesignReservationZones: readonly DesignReservationZone[];
  allPlacedAssemblies: readonly PlacedAssembly[];
  placedWallGraphs: readonly PlacedWallGraph[];
  countertopOpenings: readonly DerivedCountertopOpening[];
  constraint?: AssemblyObjectAlignmentConstraint;
}): AssemblyObjectAlignmentResult {
  const movingAlignmentFootprint = createObjectAlignmentFootprint({
    assemblyId: args.placedAssembly.id,
    targetKind: "assembly",
    targetPriority: 0,
    snapDistanceInches: OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES,
    footprint: createAssemblyPlacementFootprint(args.placedAssembly),
  });
  const targetAlignmentFootprints = [
    ...createWallFacePlanAlignmentFootprints({
      placedWallGraphs: args.placedWallGraphs,
      movingAlignmentFootprint,
    }),
    ...createWallCenterlinePlanAlignmentFootprints({
      placedWallGraphs: args.placedWallGraphs,
      movingAlignmentFootprint,
    }),
    ...args.targetAssemblies.map((targetAssembly) => createObjectAlignmentFootprint({
      assemblyId: targetAssembly.id,
      targetKind: "assembly",
      targetPriority: 0,
      snapDistanceInches: OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES,
      footprint: createAssemblyPlacementFootprint(targetAssembly),
    })),
    ...args.targetDesignReservationZones.map((targetZone) => createObjectAlignmentFootprint({
      assemblyId: targetZone.id,
      targetKind: "design-reservation-zone",
      targetPriority: 0,
      snapDistanceInches: OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES,
      footprint: createDesignReservationZoneSceneEntityBounds(targetZone).footprint,
    })),
    ...createCountertopOpeningAlignmentFootprints({
      placedAssemblies: args.allPlacedAssemblies,
      countertopOpenings: args.countertopOpenings,
    }),
    ...createDerivedWallOpeningPlanAlignmentFootprints({
      placedWallGraphs: args.placedWallGraphs,
    }),
  ];
  const candidates = findObjectAlignmentCandidates({
    movingAlignmentFootprint,
    targetAlignmentFootprints,
    constraint: args.constraint,
  });

  if (candidates.length === 0) {
    return createEmptyObjectAlignmentResult(args.placedAssembly);
  }

  const selectedCandidates = selectCompatibleAlignmentCandidates(candidates);
  const alignmentDeltaInches = combineAlignmentCandidateDeltas(selectedCandidates);

  if (getPlanVectorLength(alignmentDeltaInches) <= OBJECT_ALIGNMENT_REMAINING_DISTANCE_TOLERANCE_INCHES) {
    return {
      placedAssembly: args.placedAssembly,
      objectAlignmentGuides: buildAlignmentGuides({
        movingAlignmentFootprint,
        targetAlignmentFootprints,
        selectedCandidates,
        finalDeltaInches: alignmentDeltaInches,
      }),
      snapTarget: createAlignmentSnapTarget(selectedCandidates),
    };
  }

  const alignedPlacedAssembly = translateAssemblyPlacement(args.placedAssembly, alignmentDeltaInches);
  const translatedMovingAlignmentFootprint = createObjectAlignmentFootprint({
    assemblyId: alignedPlacedAssembly.id,
    targetKind: "assembly",
    targetPriority: 0,
    snapDistanceInches: OBJECT_ALIGNMENT_SNAP_DISTANCE_INCHES,
    footprint: createAssemblyPlacementFootprint(alignedPlacedAssembly),
  });

  return {
    placedAssembly: alignedPlacedAssembly,
    objectAlignmentGuides: buildAlignmentGuides({
      movingAlignmentFootprint: translatedMovingAlignmentFootprint,
      targetAlignmentFootprints,
      selectedCandidates,
      finalDeltaInches: { xInches: 0, yInches: 0 },
    }),
    snapTarget: createAlignmentSnapTarget(selectedCandidates),
  };
}

function createEmptyObjectAlignmentResult(placedAssembly: PlacedAssembly): AssemblyObjectAlignmentResult {
  return {
    placedAssembly,
    objectAlignmentGuides: [],
    snapTarget: null,
  };
}
