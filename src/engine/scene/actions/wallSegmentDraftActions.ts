import type { Point3DInches } from "@/core/geometry/pointTypes";
import { createId } from "@/core/ids/createId";
import type { PlacedWallGraph } from "@/engine/walls/placedWallGraphTypes";
import { DEFAULT_WALL_SEGMENT_PREFERRED_VIEW_FACE_SIDE, type WallFaceSide } from "@/engine/walls/placedWallSegmentTypes";
import {
  createGuidedWallSegmentDrawAnchor,
  createWallSegmentDrawAnchor,
  getWallSegmentAnchorPoint,
} from "@/engine/walls/segment-draft/wallSegmentDraftAnchors";
import { buildWallSegmentDraftGraph } from "@/engine/walls/segment-draft/wallSegmentDraftPreview";
import type { WallSegmentDrawAnchor } from "@/engine/walls/segment-draft/wallSegmentDraftTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { canManuallyEditScene } from "../kitchenWorkspaceModePermissions";

const MIN_WALL_SEGMENT_LENGTH_INCHES = 3;

export function createWallSegmentDraftActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  "updateWallSegmentDraftHover" | "clickWallSegmentDraftPoint" | "exitWallSegmentDraftTool"
> {
  return {
    updateWallSegmentDraftHover(pointInches) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const activeSceneOperation = get().designScene.activeSceneOperation;

      if (activeSceneOperation?.kind !== "wall-segment-draft") {
        return;
      }

      const draft = activeSceneOperation.wallSegmentDraft;
      const anchorWithGuide = draft.activeStartAnchor === null
        ? {
          anchor: createWallSegmentDrawAnchor({
            pointInches,
            placedWallGraphs: get().designScene.placedWallGraphs,
          }),
          guide: null,
        }
        : createGuidedWallSegmentDrawAnchor({
          pointInches,
          startPointInches: getWallSegmentAnchorPoint(draft.activeStartAnchor),
          placedWallGraphs: get().designScene.placedWallGraphs,
        });

      set((state) => ({
        designScene: {
          ...state.designScene,
          activeSceneOperation: {
            kind: "wall-segment-draft",
            wallSegmentDraft: {
              ...draft,
              hoverAnchor: anchorWithGuide.anchor,
              activeGuide: anchorWithGuide.guide,
            },
          },
        },
      }));
    },

    clickWallSegmentDraftPoint(pointInches) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const state = get();
      const activeSceneOperation = state.designScene.activeSceneOperation;

      if (activeSceneOperation?.kind !== "wall-segment-draft") {
        return;
      }

      const draft = activeSceneOperation.wallSegmentDraft;
      const clickedAnchor = draft.activeStartAnchor === null
        ? createWallSegmentDrawAnchor({
          pointInches,
          placedWallGraphs: state.designScene.placedWallGraphs,
        })
        : createGuidedWallSegmentDrawAnchor({
          pointInches,
          startPointInches: getWallSegmentAnchorPoint(draft.activeStartAnchor),
          placedWallGraphs: state.designScene.placedWallGraphs,
        }).anchor;

      if (draft.activeStartAnchor === null) {
        set((currentState) => ({
          designScene: {
            ...currentState.designScene,
            activeSceneOperation: {
              kind: "wall-segment-draft",
              wallSegmentDraft: {
                ...draft,
                activeStartAnchor: clickedAnchor,
                hoverAnchor: clickedAnchor,
                activeGuide: null,
              },
            },
            activeSelection: null,
          },
        }));
        return;
      }

      if (getPlanDistanceInches(getWallSegmentAnchorPoint(draft.activeStartAnchor), getWallSegmentAnchorPoint(clickedAnchor)) < MIN_WALL_SEGMENT_LENGTH_INCHES) {
        return;
      }

      set((currentState) => {
        const commitResult = commitWallSegmentDraft({
          placedWallGraphs: currentState.designScene.placedWallGraphs,
          startAnchor: draft.activeStartAnchor as WallSegmentDrawAnchor,
          endAnchor: clickedAnchor,
          heightInches: draft.heightInches,
          thicknessInches: draft.thicknessInches,
          wallGraphName: `Wall Graph ${currentState.designScene.placedWallGraphs.length + 1}`,
          wallSegmentName: `Wall Segment ${countWallSegments(currentState.designScene.placedWallGraphs) + 1}`,
          createId,
        });
        const nextStartAnchor: WallSegmentDrawAnchor = {
          kind: "existing-node",
          wallGraphId: commitResult.wallGraphId,
          wallNodeId: commitResult.endNodeId,
          pointInches: getWallSegmentAnchorPoint(clickedAnchor),
        };

        return {
          activeWallElevationTarget: {
            wallGraphId: commitResult.wallGraphId,
            wallSegmentId: commitResult.wallSegmentId,
            faceSide: commitResult.preferredViewFaceSide,
          },
          designScene: {
            ...currentState.designScene,
            placedWallGraphs: commitResult.placedWallGraphs,
            activeSceneOperation: {
              kind: "wall-segment-draft",
              wallSegmentDraft: {
                ...draft,
                activeStartAnchor: nextStartAnchor,
                hoverAnchor: nextStartAnchor,
                activeGuide: null,
              },
            },
            activeSelection: {
              kind: "placed-wall-segment",
              wallGraphId: commitResult.wallGraphId,
              wallSegmentId: commitResult.wallSegmentId,
            },
          },
        };
      });
    },

    exitWallSegmentDraftTool() {
      set((state) => ({
        activeToolbarTool: null,
        designScene: {
          ...state.designScene,
          activeSceneOperation: state.designScene.activeSceneOperation?.kind === "wall-segment-draft"
            ? null
            : state.designScene.activeSceneOperation,
          activeSelection: null,
        },
      }));
    },
  };
}

function commitWallSegmentDraft(args: {
  placedWallGraphs: readonly PlacedWallGraph[];
  startAnchor: WallSegmentDrawAnchor;
  endAnchor: WallSegmentDrawAnchor;
  heightInches: number;
  thicknessInches: number;
  wallGraphName: string;
  wallSegmentName: string;
  createId: () => string;
}): Readonly<{
  placedWallGraphs: readonly PlacedWallGraph[];
  wallGraphId: string;
  wallSegmentId: string;
  endNodeId: string;
  preferredViewFaceSide: WallFaceSide;
}> {
  const draftWallSegmentId = args.createId();
  const previewGraph = buildWallSegmentDraftGraph({
    placedWallGraphs: args.placedWallGraphs,
    startAnchor: args.startAnchor,
    endAnchor: args.endAnchor,
    heightInches: args.heightInches,
    thicknessInches: args.thicknessInches,
    createDraftGraphId: args.createId,
    createStartNodeId: args.createId,
    createEndNodeId: args.createId,
    createSplitNodeId: () => args.createId(),
    createSplitWallSegmentId: () => args.createId(),
    createDraftWallSegmentId: () => draftWallSegmentId,
  });
  const draftGraph = previewGraph.placedWallGraphs.find((wallGraph) => (
    wallGraph.segments.some((wallSegment) => wallSegment.id === draftWallSegmentId)
  ));

  if (draftGraph === undefined) {
    return {
      placedWallGraphs: args.placedWallGraphs,
      wallGraphId: "",
      wallSegmentId: draftWallSegmentId,
      endNodeId: "",
      preferredViewFaceSide: DEFAULT_WALL_SEGMENT_PREFERRED_VIEW_FACE_SIDE,
    };
  }

  const committedGraph = {
    ...draftGraph,
    name: draftGraph.segments.length === 1 ? args.wallGraphName : draftGraph.name,
    segments: draftGraph.segments.map((wallSegment) => (
      wallSegment.id === draftWallSegmentId
        ? { ...wallSegment, name: args.wallSegmentName }
        : wallSegment
    )),
  };
  const draftSegment = committedGraph.segments.find((wallSegment) => wallSegment.id === draftWallSegmentId);

  return {
    placedWallGraphs: [
      ...previewGraph.placedWallGraphs.filter((wallGraph) => wallGraph.id !== committedGraph.id),
      committedGraph,
    ],
    wallGraphId: committedGraph.id,
    wallSegmentId: draftWallSegmentId,
    endNodeId: draftSegment?.endNodeId ?? "",
    preferredViewFaceSide: draftSegment?.preferredViewFaceSide ?? DEFAULT_WALL_SEGMENT_PREFERRED_VIEW_FACE_SIDE,
  };
}

function countWallSegments(wallGraphs: readonly PlacedWallGraph[]): number {
  return wallGraphs.reduce((total, wallGraph) => total + wallGraph.segments.length, 0);
}

function getPlanDistanceInches(firstPointInches: Point3DInches, secondPointInches: Point3DInches): number {
  return Math.hypot(
    secondPointInches.xInches - firstPointInches.xInches,
    secondPointInches.yInches - firstPointInches.yInches,
  );
}
