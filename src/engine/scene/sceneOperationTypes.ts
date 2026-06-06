import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { WallFootprintDraft } from "@/engine/walls/footprint-draft/wallFootprintDraftTypes";
import type { WallSplitDraft } from "@/engine/walls/split-draft/wallSplitDraftTypes";

export type SceneOperation =
  | Readonly<{
      kind: "assembly-placement";
      placedAssembly: PlacedAssembly;
      placementState: "waiting-for-pointer" | "positioned";
    }>
  | Readonly<{
      kind: "wall-footprint-draft";
      wallFootprintDraft: WallFootprintDraft;
    }>
  | Readonly<{
      kind: "wall-split-draft";
      wallSplitDraft: WallSplitDraft;
    }>;
