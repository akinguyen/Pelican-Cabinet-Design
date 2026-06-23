import type { SceneEntityAlignmentGuide } from "@/engine/scene-entities/spatial-guides/spatialGuideTypes";
import type { SpatialAlignmentCandidate, SpatialGuideSubject } from "../spatialGuideTypes";
import type { SpatialGuideFrame } from "../spatialGuideFrame";
import { createSpatialGuideOverlayPoint } from "../spatialGuideOverlay";

export function createSpatialAlignmentGuides(args: {
  candidates: readonly (SpatialAlignmentCandidate | null)[];
  movingSubject: SpatialGuideSubject;
  frame: SpatialGuideFrame;
}): readonly SceneEntityAlignmentGuide[] {
  return args.candidates.flatMap((candidate) => candidate === null
    ? []
    : [createSpatialAlignmentGuide({ candidate, movingSubject: args.movingSubject, frame: args.frame })]);
}

function createSpatialAlignmentGuide(args: {
  candidate: SpatialAlignmentCandidate;
  movingSubject: SpatialGuideSubject;
  frame: SpatialGuideFrame;
}): SceneEntityAlignmentGuide {
  const targetBounds = args.candidate.targetSubject.guideBounds;
  const movingBounds = args.movingSubject.guideBounds;

  if (args.candidate.axis === "u") {
    const minVInches = Math.min(movingBounds.minVInches, targetBounds.minVInches);
    const maxVInches = Math.max(movingBounds.maxVInches, targetBounds.maxVInches);
    return {
      id: `scene-entity-spatial-alignment:u:${args.candidate.movingAnchor.id}:${args.candidate.targetAnchor.id}`,
      targetKind: args.candidate.targetSubject.targetKind,
      startPointInches: createSpatialGuideOverlayPoint({
        frame: args.frame,
        uInches: args.candidate.targetAnchor.valueInches,
        vInches: minVInches,
        movingBounds: movingBounds,
        targetBounds: targetBounds,
      }),
      endPointInches: createSpatialGuideOverlayPoint({
        frame: args.frame,
        uInches: args.candidate.targetAnchor.valueInches,
        vInches: maxVInches,
        movingBounds: movingBounds,
        targetBounds: targetBounds,
      }),
    };
  }

  const minUInches = Math.min(movingBounds.minUInches, targetBounds.minUInches);
  const maxUInches = Math.max(movingBounds.maxUInches, targetBounds.maxUInches);

  return {
    id: `scene-entity-spatial-alignment:v:${args.candidate.movingAnchor.id}:${args.candidate.targetAnchor.id}`,
    targetKind: args.candidate.targetSubject.targetKind,
    startPointInches: createSpatialGuideOverlayPoint({
      frame: args.frame,
      uInches: minUInches,
      vInches: args.candidate.targetAnchor.valueInches,
      movingBounds: movingBounds,
      targetBounds: targetBounds,
    }),
    endPointInches: createSpatialGuideOverlayPoint({
      frame: args.frame,
      uInches: maxUInches,
      vInches: args.candidate.targetAnchor.valueInches,
      movingBounds: movingBounds,
      targetBounds: targetBounds,
    }),
  };
}
