import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWall } from "../wallTypes";
import type { WallAngleGuide, WallReferenceGuides } from "../draft-guides/wallDraftGuideTypes";
import { createEmptyWallReferenceGuides, createWallAngleGuide } from "../draft-guides/wallDraftGuides";
import type { WallFootprintDraft, WallFootprintSnapTarget } from "./wallFootprintDraftTypes";
import { getActiveWallFootprintDraftPoint } from "./wallFootprintDraftSelectors";
import {
  findDraftPointSnapTarget,
  findPlacedWallEdgeSnapTarget,
  findPlacedWallPointSnapTarget,
} from "./wallFootprintDraftSnapTargets";
import {
  getWallFootprintDraftReferenceDirectionDegrees,
  getWallFootprintDraftReferenceSnapPoints,
  snapToAngleGuide,
  snapToHorizontalVerticalGuides,
} from "./wallFootprintDraftGuideSnapping";

export function snapWallFootprintDraftPoint(args: {
  pointInches: Point3DInches;
  draft: WallFootprintDraft;
  placedWalls: readonly PlacedWall[];
}): Readonly<{
  pointInches: Point3DInches;
  snapTarget: WallFootprintSnapTarget;
  referenceGuides: WallReferenceGuides;
  angleGuide: WallAngleGuide | null;
}> {
  const activePointInches = getActiveWallFootprintDraftPoint(args.draft)?.pointInches ?? null;
  const referenceDirectionDegrees = getWallFootprintDraftReferenceDirectionDegrees(args.draft);
  const draftPointTarget = findDraftPointSnapTarget(args);

  if (draftPointTarget !== null) {
    return createSnapResult({
      pointInches: draftPointTarget.pointInches,
      snapTarget: draftPointTarget,
      activePointInches,
      referenceDirectionDegrees,
    });
  }

  const placedWallPointTarget = findPlacedWallPointSnapTarget(args);

  if (placedWallPointTarget !== null) {
    return createSnapResult({
      pointInches: placedWallPointTarget.pointInches,
      snapTarget: placedWallPointTarget,
      activePointInches,
      referenceDirectionDegrees,
    });
  }

  const placedWallEdgeTarget = findPlacedWallEdgeSnapTarget(args);

  if (placedWallEdgeTarget !== null) {
    return createSnapResult({
      pointInches: placedWallEdgeTarget.pointInches,
      snapTarget: placedWallEdgeTarget,
      activePointInches,
      referenceDirectionDegrees,
    });
  }

  if (activePointInches === null) {
    return createFreePointSnapResult(args.pointInches);
  }

  const referenceSnap = snapToHorizontalVerticalGuides({
    pointInches: args.pointInches,
    activePointInches,
    snapPointsInches: getWallFootprintDraftReferenceSnapPoints(args),
  });

  if (referenceSnap !== null) {
    return {
      pointInches: referenceSnap.pointInches,
      snapTarget: {
        kind: "free-point",
        pointInches: referenceSnap.pointInches,
      },
      referenceGuides: referenceSnap.referenceGuides,
      angleGuide: createWallAngleGuide({
        activePointInches,
        pointInches: referenceSnap.pointInches,
        referenceDirectionDegrees,
      }),
    };
  }

  const angleSnap = snapToAngleGuide({
    pointInches: args.pointInches,
    activePointInches,
    referenceDirectionDegrees,
  });

  if (angleSnap !== null) {
    return {
      pointInches: angleSnap.pointInches,
      snapTarget: {
        kind: "free-point",
        pointInches: angleSnap.pointInches,
      },
      referenceGuides: createEmptyWallReferenceGuides(),
      angleGuide: angleSnap.angleGuide,
    };
  }

  return {
    pointInches: args.pointInches,
    snapTarget: {
      kind: "free-point",
      pointInches: args.pointInches,
    },
    referenceGuides: createEmptyWallReferenceGuides(),
    angleGuide: createWallAngleGuide({
      activePointInches,
      pointInches: args.pointInches,
      referenceDirectionDegrees,
    }),
  };
}

function createSnapResult(args: {
  pointInches: Point3DInches;
  snapTarget: WallFootprintSnapTarget;
  activePointInches: Point3DInches | null;
  referenceDirectionDegrees: number;
}): Readonly<{
  pointInches: Point3DInches;
  snapTarget: WallFootprintSnapTarget;
  referenceGuides: WallReferenceGuides;
  angleGuide: WallAngleGuide | null;
}> {
  return {
    pointInches: args.pointInches,
    snapTarget: args.snapTarget,
    referenceGuides: createEmptyWallReferenceGuides(),
    angleGuide: args.activePointInches === null
      ? null
      : createWallAngleGuide({
          activePointInches: args.activePointInches,
          pointInches: args.pointInches,
          referenceDirectionDegrees: args.referenceDirectionDegrees,
        }),
  };
}

function createFreePointSnapResult(pointInches: Point3DInches): Readonly<{
  pointInches: Point3DInches;
  snapTarget: WallFootprintSnapTarget;
  referenceGuides: WallReferenceGuides;
  angleGuide: WallAngleGuide | null;
}> {
  return {
    pointInches,
    snapTarget: {
      kind: "free-point",
      pointInches,
    },
    referenceGuides: createEmptyWallReferenceGuides(),
    angleGuide: null,
  };
}
