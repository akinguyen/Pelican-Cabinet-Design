import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";
import type { SpatialGuideFrame } from "./spatialGuideFrame";
import { projectPointToSpatialGuideFrame } from "./spatialGuideFrame";
import type { SpatialGuideAnchor, SpatialGuideBounds, SpatialGuideSubject } from "./spatialGuideTypes";
import type { SceneEntityAlignmentTargetKind } from "@/engine/scene-entities/alignment/sceneEntityAlignmentTypes";

export function createSpatialGuideSubjectFromBounds(args: {
  bounds: SceneEntityBounds;
  frame: SpatialGuideFrame;
}): SpatialGuideSubject {
  const uValues = args.bounds.footprintCornersInches.map((pointInches) => projectPointToSpatialGuideFrame({ pointInches, frame: args.frame }).uInches);
  const nValues = args.bounds.footprintCornersInches.map((pointInches) => projectPointToSpatialGuideFrame({ pointInches, frame: args.frame }).nInches);
  const vValues = args.frame.kind === "wall-face-plane"
    ? [args.bounds.heightRangeInches.minZInches, args.bounds.heightRangeInches.maxZInches]
    : args.bounds.footprintCornersInches.map((pointInches) => projectPointToSpatialGuideFrame({ pointInches, frame: args.frame }).vInches);

  return createSpatialGuideSubject({
    id: `${args.bounds.entityKind}:${args.bounds.entityId}`,
    targetKind: "scene-entity",
    bounds: createSpatialGuideBounds({
      minUInches: Math.min(...uValues),
      maxUInches: Math.max(...uValues),
      minVInches: Math.min(...vValues),
      maxVInches: Math.max(...vValues),
      minNInches: Math.min(...nValues),
      maxNInches: Math.max(...nValues),
    }),
  });
}

export function createSpatialGuideSubject(args: {
  id: string;
  targetKind: SceneEntityAlignmentTargetKind;
  bounds: SpatialGuideBounds;
  guideBounds?: SpatialGuideBounds;
}): SpatialGuideSubject {
  const guideBounds = args.guideBounds ?? args.bounds;

  return {
    id: args.id,
    targetKind: args.targetKind,
    bounds: args.bounds,
    guideBounds,
    uAnchors: createSpatialGuideAnchors({ id: args.id, axis: "u", minInches: args.bounds.minUInches, centerInches: args.bounds.centerUInches, maxInches: args.bounds.maxUInches }),
    vAnchors: createSpatialGuideAnchors({ id: args.id, axis: "v", minInches: args.bounds.minVInches, centerInches: args.bounds.centerVInches, maxInches: args.bounds.maxVInches }),
  };
}

export function createSpatialGuideBounds(args: {
  minUInches: number;
  maxUInches: number;
  minVInches: number;
  maxVInches: number;
  minNInches: number;
  maxNInches: number;
}): SpatialGuideBounds {
  return {
    minUInches: args.minUInches,
    centerUInches: (args.minUInches + args.maxUInches) / 2,
    maxUInches: args.maxUInches,
    minVInches: args.minVInches,
    centerVInches: (args.minVInches + args.maxVInches) / 2,
    maxVInches: args.maxVInches,
    minNInches: args.minNInches,
    maxNInches: args.maxNInches,
  };
}

export function createSpatialGuideBoundsFromSubjects(subjects: readonly SpatialGuideSubject[]): SpatialGuideBounds | null {
  if (subjects.length === 0) {
    return null;
  }

  return createSpatialGuideBounds({
    minUInches: Math.min(...subjects.map((subject) => subject.bounds.minUInches)),
    maxUInches: Math.max(...subjects.map((subject) => subject.bounds.maxUInches)),
    minVInches: Math.min(...subjects.map((subject) => subject.bounds.minVInches)),
    maxVInches: Math.max(...subjects.map((subject) => subject.bounds.maxVInches)),
    minNInches: Math.min(...subjects.map((subject) => subject.bounds.minNInches)),
    maxNInches: Math.max(...subjects.map((subject) => subject.bounds.maxNInches)),
  });
}

function createSpatialGuideAnchors(args: {
  id: string;
  axis: "u" | "v";
  minInches: number;
  centerInches: number;
  maxInches: number;
}): readonly SpatialGuideAnchor[] {
  return [
    { id: `${args.id}:${args.axis}:min`, axis: args.axis, role: "min", valueInches: args.minInches },
    { id: `${args.id}:${args.axis}:center`, axis: args.axis, role: "center", valueInches: args.centerInches },
    { id: `${args.id}:${args.axis}:max`, axis: args.axis, role: "max", valueInches: args.maxInches },
  ];
}
