import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getPoint3DDistanceInches } from "@/core/geometry/pointTypes";
import type { PlacedWall } from "../wallTypes";
import type {
  WallFootprintDraft,
  WallFootprintDraftPoint,
  WallFootprintSnapTarget,
} from "./wallFootprintDraftTypes";
import { createWallFootprint } from "../footprint/wallFootprintFactory";
import { getAllWallFootprintEdgeIndices } from "../footprint/wallFootprintGeometry";
import { createEmptyWallFootprintDraft } from "./wallFootprintDraftFactory";
import {
  getActiveWallFootprintDraftPoint,
  getWallFootprintSnapTargetPoint,
} from "./wallFootprintDraftSelectors";
import { snapWallFootprintDraftPoint } from "./wallFootprintDraftSnapping";

const MIN_WALL_FOOTPRINT_DRAFT_EDGE_LENGTH_INCHES = 0.5;

export type WallFootprintDraftClickResult =
  | Readonly<{
      kind: "updated-draft";
      draft: WallFootprintDraft;
    }>
  | Readonly<{
      kind: "created-placed-wall";
      placedWall: PlacedWall;
      draft: WallFootprintDraft;
    }>;

export function updateWallFootprintDraftHover(args: {
  draft: WallFootprintDraft;
  pointInches: Point3DInches;
  placedWalls: readonly PlacedWall[];
}): WallFootprintDraft {
  const snapResult = snapWallFootprintDraftPoint({
    pointInches: args.pointInches,
    draft: args.draft,
    placedWalls: args.placedWalls,
  });

  return {
    ...args.draft,
    hoverPointInches: snapResult.pointInches,
    snapTarget: snapResult.snapTarget,
    referenceGuides: snapResult.referenceGuides,
    angleGuide: snapResult.angleGuide,
    parallelGuide: snapResult.parallelGuide,
  };
}

export function clickWallFootprintDraftPoint(args: {
  draft: WallFootprintDraft;
  pointInches: Point3DInches;
  placedWalls: readonly PlacedWall[];
  createId: () => string;
}): WallFootprintDraftClickResult {
  const draft = updateWallFootprintDraftHover({
    draft: args.draft,
    pointInches: args.pointInches,
    placedWalls: args.placedWalls,
  });
  const snapTarget = draft.snapTarget ?? {
    kind: "free-point" as const,
    pointInches: draft.hoverPointInches ?? args.pointInches,
  };
  const targetPointInches = getWallFootprintSnapTargetPoint(snapTarget);
  const activePoint = getActiveWallFootprintDraftPoint(draft);

  if (activePoint === null) {
    return {
      kind: "updated-draft",
      draft: addFirstDraftPoint({
        draft,
        pointInches: targetPointInches,
        snapTarget,
        createId: args.createId,
      }),
    };
  }

  if (
    getPoint3DDistanceInches(activePoint.pointInches, targetPointInches) <
    MIN_WALL_FOOTPRINT_DRAFT_EDGE_LENGTH_INCHES
  ) {
    return {
      kind: "updated-draft",
      draft,
    };
  }

  if (snapTarget.kind === "draft-point" && snapTarget.canCloseLoop) {
    const loopPointsInches = getClosedDraftLoopPoints({
      draft,
      closingPointId: snapTarget.pointId,
    });
    const footprint = createWallFootprint(loopPointsInches);

    if (footprint === null) {
      return {
        kind: "updated-draft",
        draft,
      };
    }

    return {
      kind: "created-placed-wall",
      placedWall: {
        id: args.createId(),
        footprint,
        heightInches: draft.heightInches,
        viewableEdgeIndices: getAllWallFootprintEdgeIndices(footprint),
      },
      draft: createEmptyWallFootprintDraft(draft.heightInches),
    };
  }

  return {
    kind: "updated-draft",
    draft: addDraftPointAndEdge({
      draft,
      pointInches: targetPointInches,
      snapTarget,
      createId: args.createId,
    }),
  };
}

function addFirstDraftPoint(args: {
  draft: WallFootprintDraft;
  pointInches: Point3DInches;
  snapTarget: WallFootprintSnapTarget;
  createId: () => string;
}): WallFootprintDraft {
  const pointId = args.createId();
  const point: WallFootprintDraftPoint = {
    id: pointId,
    pointInches: args.pointInches,
    source: getDraftPointSource(args.snapTarget),
  };

  return {
    ...args.draft,
    points: [point],
    edges: [],
    activePointId: pointId,
    hoverPointInches: args.pointInches,
    snapTarget: args.snapTarget,
  };
}

function addDraftPointAndEdge(args: {
  draft: WallFootprintDraft;
  pointInches: Point3DInches;
  snapTarget: WallFootprintSnapTarget;
  createId: () => string;
}): WallFootprintDraft {
  const activePoint = getActiveWallFootprintDraftPoint(args.draft);

  if (activePoint === null) {
    return args.draft;
  }

  const pointId = args.createId();
  const point: WallFootprintDraftPoint = {
    id: pointId,
    pointInches: args.pointInches,
    source: getDraftPointSource(args.snapTarget),
  };

  return {
    ...args.draft,
    points: [...args.draft.points, point],
    edges: [
      ...args.draft.edges,
      {
        id: args.createId(),
        startPointId: activePoint.id,
        endPointId: pointId,
      },
    ],
    activePointId: pointId,
    hoverPointInches: args.pointInches,
    snapTarget: args.snapTarget,
  };
}

function getDraftPointSource(
  snapTarget: WallFootprintSnapTarget,
): WallFootprintDraftPoint["source"] {
  if (snapTarget.kind === "placed-wall-edge" || snapTarget.kind === "placed-wall-point") {
    return snapTarget;
  }

  return {
    kind: "free-point",
  };
}

function getClosedDraftLoopPoints(args: {
  draft: WallFootprintDraft;
  closingPointId: string;
}): readonly Point3DInches[] {
  const closingPointIndex = args.draft.points.findIndex(
    (point) => point.id === args.closingPointId,
  );

  if (closingPointIndex < 0) {
    return [];
  }

  return args.draft.points.slice(closingPointIndex).map((point) => point.pointInches);
}
