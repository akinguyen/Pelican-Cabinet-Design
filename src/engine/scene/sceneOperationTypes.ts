import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { CountertopCutoutDraft, CountertopOpeningDrag } from "@/engine/countertops/countertopOpeningTypes";
import type { WallSegmentDraft } from "@/engine/walls/segment-draft/wallSegmentDraftTypes";
import type { WallOpeningDraft } from "@/engine/walls/openings/wallOpeningDraftTypes";

export type SceneOperation =
  | Readonly<{
      kind: "assembly-placement";
      placedAssembly: PlacedAssembly;
      placementState: "waiting-for-pointer" | "positioned";
    }>
  | Readonly<{
      kind: "countertop-cutout-draft";
      countertopCutoutDraft: CountertopCutoutDraft;
    }>
  | Readonly<{
      kind: "countertop-opening-drag";
      countertopOpeningDrag: CountertopOpeningDrag;
    }>
  | Readonly<{
      kind: "wall-segment-draft";
      wallSegmentDraft: WallSegmentDraft;
    }>
  | Readonly<{
      kind: "wall-opening-draft";
      wallOpeningDraft: WallOpeningDraft;
    }>;
