import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { WallSegmentDraft } from "@/engine/walls/segment-draft/wallSegmentDraftTypes";

export type SceneOperation =
  | Readonly<{
      kind: "assembly-placement";
      placedAssembly: PlacedAssembly;
      placementState: "waiting-for-pointer" | "positioned";
    }>
  | Readonly<{
      kind: "wall-segment-draft";
      wallSegmentDraft: WallSegmentDraft;
    }>;
