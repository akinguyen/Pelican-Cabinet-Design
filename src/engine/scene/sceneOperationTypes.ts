import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import type { SceneEntityMovementFrame } from "@/engine/scene-entities/sceneEntityMovementFrame";
import type { WallSegmentDraft } from "@/engine/walls/segment-draft/wallSegmentDraftTypes";

export type SceneEntityPlacementCandidate = Readonly<{
  sceneEntity: SceneEntity;
  placementState: "waiting-for-pointer" | "positioned";
  movementFrame: SceneEntityMovementFrame | null;
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
