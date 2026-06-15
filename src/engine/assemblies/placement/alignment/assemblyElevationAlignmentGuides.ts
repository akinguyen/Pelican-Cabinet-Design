import type { Point3DInches } from "@/core/geometry/pointTypes";
import type {
  AssemblyObjectAlignmentGuide,
  AssemblyPlacementElevationFrame,
} from "../assemblyPlacementTypes";
import { OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES } from "./assemblyObjectAlignmentConstants";
import type {
  ElevationAlignmentBox,
  ElevationAlignmentCandidate,
} from "./assemblyObjectAlignmentTypes";
import { getElevationGuideKind } from "./assemblyElevationAlignmentCandidates";

export function buildElevationAlignmentGuides(args: {
  movingBox: ElevationAlignmentBox;
  targetBoxes: readonly ElevationAlignmentBox[];
  selectedCandidates: readonly ElevationAlignmentCandidate[];
  elevationFrame: AssemblyPlacementElevationFrame;
}): readonly AssemblyObjectAlignmentGuide[] {
  return args.selectedCandidates.map((candidate) => {
    const targetBox = args.targetBoxes.find((box) => box.assemblyId === candidate.targetAssemblyId) ?? args.movingBox;

    return candidate.axis === "u"
      ? createElevationVerticalGuide({
          movingBox: args.movingBox,
          targetBox,
          candidate,
          elevationFrame: args.elevationFrame,
        })
      : createElevationHorizontalGuide({
          movingBox: args.movingBox,
          targetBox,
          candidate,
          elevationFrame: args.elevationFrame,
        });
  });
}

function createElevationVerticalGuide(args: {
  movingBox: ElevationAlignmentBox;
  targetBox: ElevationAlignmentBox;
  candidate: ElevationAlignmentCandidate;
  elevationFrame: AssemblyPlacementElevationFrame;
}): AssemblyObjectAlignmentGuide {
  const minZInches = Math.min(args.movingBox.bottomInches, args.targetBox.bottomInches) - OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES;
  const maxZInches = Math.max(args.movingBox.topInches, args.targetBox.topInches) + OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES;

  return {
    id: `object-elevation-alignment-${args.candidate.targetAssemblyId}-${args.candidate.axis}-${args.candidate.targetAnchor.valueInches}`,
    guideKind: getElevationGuideKind(args.candidate),
    guidePlane: "elevation",
    startPointInches: createElevationGuidePoint({
      elevationFrame: args.elevationFrame,
      uInches: args.candidate.targetAnchor.valueInches,
      zInches: minZInches,
      depthInches: args.movingBox.depthInches,
    }),
    endPointInches: createElevationGuidePoint({
      elevationFrame: args.elevationFrame,
      uInches: args.candidate.targetAnchor.valueInches,
      zInches: maxZInches,
      depthInches: args.movingBox.depthInches,
    }),
  };
}

function createElevationHorizontalGuide(args: {
  movingBox: ElevationAlignmentBox;
  targetBox: ElevationAlignmentBox;
  candidate: ElevationAlignmentCandidate;
  elevationFrame: AssemblyPlacementElevationFrame;
}): AssemblyObjectAlignmentGuide {
  const minUInches = Math.min(args.movingBox.leftInches, args.targetBox.leftInches) - OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES;
  const maxUInches = Math.max(args.movingBox.rightInches, args.targetBox.rightInches) + OBJECT_ALIGNMENT_GUIDE_PADDING_INCHES;

  return {
    id: `object-elevation-alignment-${args.candidate.targetAssemblyId}-${args.candidate.axis}-${args.candidate.targetAnchor.valueInches}`,
    guideKind: getElevationGuideKind(args.candidate),
    guidePlane: "elevation",
    startPointInches: createElevationGuidePoint({
      elevationFrame: args.elevationFrame,
      uInches: minUInches,
      zInches: args.candidate.targetAnchor.valueInches,
      depthInches: args.movingBox.depthInches,
    }),
    endPointInches: createElevationGuidePoint({
      elevationFrame: args.elevationFrame,
      uInches: maxUInches,
      zInches: args.candidate.targetAnchor.valueInches,
      depthInches: args.movingBox.depthInches,
    }),
  };
}

function createElevationGuidePoint(args: {
  elevationFrame: AssemblyPlacementElevationFrame;
  uInches: number;
  zInches: number;
  depthInches: number;
}): Point3DInches {
  return {
    xInches:
      args.elevationFrame.planeOriginInches.xInches +
      args.elevationFrame.faceDirectionInches.xInches * args.uInches +
      args.elevationFrame.outwardDirectionInches.xInches * args.depthInches,
    yInches:
      args.elevationFrame.planeOriginInches.yInches +
      args.elevationFrame.faceDirectionInches.yInches * args.uInches +
      args.elevationFrame.outwardDirectionInches.yInches * args.depthInches,
    zInches: args.zInches,
  };
}
