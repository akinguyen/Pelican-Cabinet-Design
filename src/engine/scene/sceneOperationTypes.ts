import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import type { SceneEntityElevationFrame } from "@/engine/scene-entities/sceneEntityPlanGeometryTypes";
import type { SceneViewMode } from "./sceneViewModeTypes";
import type { WallSegmentDraft } from "@/engine/walls/segment-draft/wallSegmentDraftTypes";

export type SceneEntityPlacementCandidate = Readonly<{
  sceneEntity: SceneEntity;
  placementState: "waiting-for-pointer" | "positioned";
  sceneViewMode: SceneViewMode;
  elevationMoveFrame?: SceneEntityElevationFrame;
}>;

export type SceneOperation =
  | Readonly<{
      kind: "scene-entity-placement";
      candidate: SceneEntityPlacementCandidate;
    }>
  | Readonly<{
      kind: "wall-segment-draft";
      wallSegmentDraft: WallSegmentDraft;
    }>;
