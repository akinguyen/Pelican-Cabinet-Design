import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedWall } from "../wallTypes";
import { getSplitWallViewableEdgeIndices } from "../elevation/wallDefaultViewableEdges";
import { findWallSplitAnchor } from "./wallSplitDraftAnchors";
import { createWallSplitDraftForTarget } from "./wallSplitDraftFactory";
import { splitWallFootprintByStraightCut } from "./wallSplitDraftGeometry";
import type { WallSplitDraft } from "./wallSplitDraftTypes";

export type WallSplitDraftClickResult =
  | Readonly<{
      kind: "updated-draft";
      draft: WallSplitDraft;
    }>
  | Readonly<{
      kind: "split-placed-wall";
      removedPlacedWallId: string;
      createdPlacedWalls: readonly [PlacedWall, PlacedWall];
      draft: WallSplitDraft;
      selectedPlacedWallId: string;
    }>;

export function updateWallSplitDraftHover(args: {
  draft: WallSplitDraft;
  pointInches: Point3DInches;
  placedWalls: readonly PlacedWall[];
}): WallSplitDraft {
  const draft = args.draft;

  if (draft.phase === "waiting-for-target-wall") {
    return draft;
  }

  const targetWall = args.placedWalls.find(
    (placedWall) => placedWall.id === draft.targetPlacedWallId,
  );

  if (targetWall === undefined) {
    return {
      phase: "waiting-for-target-wall",
    };
  }

  const hoverAnchor = findWallSplitAnchor({
    pointInches: args.pointInches,
    placedWall: targetWall,
  });

  if (draft.phase === "choosing-start") {
    return {
      ...draft,
      hoverAnchor,
    };
  }

  return {
    ...draft,
    hoverAnchor,
  };
}

export function clickWallSplitDraftPoint(args: {
  draft: WallSplitDraft;
  pointInches: Point3DInches;
  placedWalls: readonly PlacedWall[];
  createId: () => string;
}): WallSplitDraftClickResult {
  const draft = updateWallSplitDraftHover({
    draft: args.draft,
    pointInches: args.pointInches,
    placedWalls: args.placedWalls,
  });

  if (draft.phase === "waiting-for-target-wall") {
    return {
      kind: "updated-draft",
      draft,
    };
  }

  if (draft.phase === "choosing-start") {
    if (draft.hoverAnchor === null) {
      return {
        kind: "updated-draft",
        draft,
      };
    }

    return {
      kind: "updated-draft",
      draft: {
        phase: "choosing-end",
        targetPlacedWallId: draft.targetPlacedWallId,
        startAnchor: draft.hoverAnchor,
        hoverAnchor: null,
      },
    };
  }

  if (draft.hoverAnchor === null) {
    return {
      kind: "updated-draft",
      draft,
    };
  }

  const targetWall = args.placedWalls.find(
    (placedWall) => placedWall.id === draft.targetPlacedWallId,
  );

  if (targetWall === undefined) {
    return {
      kind: "updated-draft",
      draft: {
        phase: "waiting-for-target-wall",
      },
    };
  }

  const splitFootprints = splitWallFootprintByStraightCut({
    placedWall: targetWall,
    startAnchor: draft.startAnchor,
    endAnchor: draft.hoverAnchor,
  });

  if (splitFootprints === null) {
    return {
      kind: "updated-draft",
      draft,
    };
  }

  const [firstFootprint, secondFootprint] = splitFootprints;
  const firstPlacedWallId = args.createId();

  return {
    kind: "split-placed-wall",
    removedPlacedWallId: targetWall.id,
    createdPlacedWalls: [
      {
        id: firstPlacedWallId,
        footprint: firstFootprint,
        heightInches: targetWall.heightInches,
        viewableEdgeIndices: getSplitWallViewableEdgeIndices({
          sourceFootprint: targetWall.footprint,
          splitFootprint: firstFootprint,
        }),
      },
      {
        id: args.createId(),
        footprint: secondFootprint,
        heightInches: targetWall.heightInches,
        viewableEdgeIndices: getSplitWallViewableEdgeIndices({
          sourceFootprint: targetWall.footprint,
          splitFootprint: secondFootprint,
        }),
      },
    ],
    draft: createWallSplitDraftForTarget(firstPlacedWallId),
    selectedPlacedWallId: firstPlacedWallId,
  };
}
