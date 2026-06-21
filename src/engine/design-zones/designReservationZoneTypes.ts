import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { SceneEntityElevationFrame } from "@/engine/scene/sceneDragTypes";
import type { SceneEntityBase } from "@/engine/scene-entities/sceneEntityTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";

export type DesignReservationZonePurpose = "island" | "peninsula" | "tall-pantry";

export type DesignReservationZone = SceneEntityBase<"design-reservation-zone"> & Readonly<{
  reservedFor: DesignReservationZonePurpose;
  sizeInches: Size3DInches;
}>;

export type DesignReservationZonePlacementCandidate = Readonly<{
  zone: DesignReservationZone;
  placementState: "waiting-for-pointer" | "positioned";
  sceneViewMode: SceneViewMode;
  elevationMoveFrame?: SceneEntityElevationFrame;
}>;
