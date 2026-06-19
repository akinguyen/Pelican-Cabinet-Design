import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { DerivedCountertopOpening } from "@/engine/countertops/countertopOpeningTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import { createDesignReservationZoneSceneEntityBounds } from "@/engine/scene-entities/designReservationZoneSceneEntityBounds";
import { translateAssemblyPlacement } from "../assemblyPlacementGeometry";
import { getPlanDotProduct, normalizePlanVector } from "../assemblyPlacementPlanGeometry";
import type { AssemblyPlacementElevationFrame } from "../assemblyPlacementTypes";
import {
  findElevationAlignmentCandidates,
  selectCompatibleElevationAlignmentCandidates,
} from "./assemblyElevationAlignmentCandidates";
import {
  createCountertopOpeningElevationAlignmentBoxes,
  createElevationAlignmentBox,
  createFloorElevationAlignmentBox,
  createWallFaceElevationAlignmentBoxes,
  createDerivedWallOpeningElevationAlignmentBoxes,
  isElevationAlignmentBox,
  isElevationAlignmentTargetRelevant,
} from "./assemblyElevationAlignmentBoxes";
import { buildElevationAlignmentGuides } from "./assemblyElevationAlignmentGuides";
import { OBJECT_ELEVATION_ALIGNMENT_SNAP_DISTANCE_INCHES } from "./assemblyObjectAlignmentConstants";
import { combineObjectAlignmentCandidateDeltas, createEmptyObjectAlignmentResult, type AssemblyObjectAlignmentResult, type ElevationAlignmentBox } from "./assemblyObjectAlignmentTypes";

export function alignAssemblyPlacementWithElevationObjects(args: {
  placedAssembly: PlacedAssembly;
  targetAssemblies: readonly PlacedAssembly[];
  targetDesignReservationZones: readonly DesignReservationZone[];
  placedWallGraphs: readonly PlacedWallGraph[];
  countertopOpenings: readonly DerivedCountertopOpening[];
  allPlacedAssemblies: readonly PlacedAssembly[];
  elevationFrame: AssemblyPlacementElevationFrame;
}): AssemblyObjectAlignmentResult {
  const movingBox = createElevationAlignmentBox({
    placedAssembly: args.placedAssembly,
    elevationFrame: args.elevationFrame,
  });

  if (movingBox === null) {
    return createEmptyObjectAlignmentResult(args.placedAssembly);
  }

  const targetBoxes = [
    createFloorElevationAlignmentBox({
      movingBox,
      elevationFrame: args.elevationFrame,
    }),
    ...createWallFaceElevationAlignmentBoxes({
      placedWallGraphs: args.placedWallGraphs,
      elevationFrame: args.elevationFrame,
      movingDepthInches: movingBox.depthInches,
    }),
    ...args.targetAssemblies
      .map((targetAssembly) => createElevationAlignmentBox({
        placedAssembly: targetAssembly,
        elevationFrame: args.elevationFrame,
      }))
      .filter(isElevationAlignmentBox)
      .filter((targetBox) => isElevationAlignmentTargetRelevant({
        movingBox,
        targetBox,
        elevationFrame: args.elevationFrame,
      })),
    ...args.targetDesignReservationZones
      .map((targetZone) => createElevationAlignmentBoxFromDesignReservationZone({
        targetZone,
        elevationFrame: args.elevationFrame,
      }))
      .filter(isElevationAlignmentBox)
      .filter((targetBox) => isElevationAlignmentTargetRelevant({
        movingBox,
        targetBox,
        elevationFrame: args.elevationFrame,
      })),
    ...createDerivedWallOpeningElevationAlignmentBoxes({
      placedWallGraphs: args.placedWallGraphs,
      elevationFrame: args.elevationFrame,
    }),
    ...createCountertopOpeningElevationAlignmentBoxes({
      placedAssemblies: args.allPlacedAssemblies,
      countertopOpenings: args.countertopOpenings,
      elevationFrame: args.elevationFrame,
      movingDepthInches: movingBox.depthInches,
    }),
  ].filter(isElevationAlignmentBox);

  if (targetBoxes.length === 0) {
    return createEmptyObjectAlignmentResult(args.placedAssembly);
  }

  const candidates = findElevationAlignmentCandidates({
    movingBox,
    targetBoxes,
    elevationFrame: args.elevationFrame,
  });

  if (candidates.length === 0) {
    return createEmptyObjectAlignmentResult(args.placedAssembly);
  }

  const selectedCandidates = selectCompatibleElevationAlignmentCandidates(candidates);
  const alignmentDeltaInches = combineObjectAlignmentCandidateDeltas(selectedCandidates);
  const alignedPlacedAssembly = translateAssemblyPlacement(args.placedAssembly, alignmentDeltaInches);
  const alignedMovingBox = createElevationAlignmentBox({
    placedAssembly: alignedPlacedAssembly,
    elevationFrame: args.elevationFrame,
  }) ?? movingBox;

  return {
    placedAssembly: alignedPlacedAssembly,
    objectAlignmentGuides: buildElevationAlignmentGuides({
      movingBox: alignedMovingBox,
      targetBoxes,
      selectedCandidates,
      elevationFrame: args.elevationFrame,
    }),
  };
}

function createElevationAlignmentBoxFromDesignReservationZone(args: {
  targetZone: DesignReservationZone;
  elevationFrame: AssemblyPlacementElevationFrame;
}): ElevationAlignmentBox | null {
  const bounds = createDesignReservationZoneSceneEntityBounds(args.targetZone);
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

  const projectedUValuesInches = bounds.footprint.cornerPointsInches.map((cornerPointInches) => getPlanDotProduct({
    xInches: cornerPointInches.xInches - args.elevationFrame.planeOriginInches.xInches,
    yInches: cornerPointInches.yInches - args.elevationFrame.planeOriginInches.yInches,
  }, faceDirectionInches));
  const projectedDepthValuesInches = bounds.footprint.cornerPointsInches.map((cornerPointInches) => getPlanDotProduct({
    xInches: cornerPointInches.xInches - args.elevationFrame.planeOriginInches.xInches,
    yInches: cornerPointInches.yInches - args.elevationFrame.planeOriginInches.yInches,
  }, outwardDirectionInches));
  const leftInches = Math.min(...projectedUValuesInches);
  const rightInches = Math.max(...projectedUValuesInches);
  const depthInches = getPlanDotProduct({
    xInches: bounds.centerPointInches.xInches - args.elevationFrame.planeOriginInches.xInches,
    yInches: bounds.centerPointInches.yInches - args.elevationFrame.planeOriginInches.yInches,
  }, outwardDirectionInches);

  return {
    assemblyId: bounds.entityId,
    targetPriority: 0,
    snapDistanceInches: OBJECT_ELEVATION_ALIGNMENT_SNAP_DISTANCE_INCHES,
    leftInches,
    centerInches: (leftInches + rightInches) / 2,
    rightInches,
    bottomInches: bounds.heightRangeInches.minZInches,
    middleInches: (bounds.heightRangeInches.minZInches + bounds.heightRangeInches.maxZInches) / 2,
    topInches: bounds.heightRangeInches.maxZInches,
    depthInches,
    viewZoneBoundsInches: args.elevationFrame.viewZoneInches === undefined
      ? undefined
      : {
          leftInches: Math.min(...projectedUValuesInches),
          rightInches: Math.max(...projectedUValuesInches),
          bottomInches: bounds.heightRangeInches.minZInches,
          topInches: bounds.heightRangeInches.maxZInches,
          nearDepthInches: Math.min(...projectedDepthValuesInches),
          farDepthInches: Math.max(...projectedDepthValuesInches),
        },
  };
}
