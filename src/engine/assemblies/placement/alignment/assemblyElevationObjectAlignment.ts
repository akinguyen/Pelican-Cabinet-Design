import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { DerivedCountertopOpening } from "@/engine/countertops/countertopOpeningTypes";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import { translateAssemblyPlacement } from "../assemblyPlacementGeometry";
import type { AssemblyPlacementElevationFrame } from "../assemblyPlacementTypes";
import {
  combineElevationAlignmentCandidateDeltas,
  createElevationAlignmentSnapTarget,
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
import type { AssemblyObjectAlignmentResult } from "./assemblyObjectAlignmentTypes";

export function alignAssemblyPlacementWithElevationObjects(args: {
  placedAssembly: PlacedAssembly;
  targetAssemblies: readonly PlacedAssembly[];
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
  const alignmentDeltaInches = combineElevationAlignmentCandidateDeltas(selectedCandidates);
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
    snapTarget: createElevationAlignmentSnapTarget(selectedCandidates),
  };
}

function createEmptyObjectAlignmentResult(placedAssembly: PlacedAssembly): AssemblyObjectAlignmentResult {
  return {
    placedAssembly,
    objectAlignmentGuides: [],
    snapTarget: null,
  };
}
