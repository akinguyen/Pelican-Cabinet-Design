import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { SceneEntityBase } from "@/engine/scene-entities/sceneEntityTypes";
import type { SceneEntityMovementFrame } from "@/engine/scene-entities/sceneEntityMovementFrame";

export type DesignReservationZonePurpose = "island" | "peninsula" | "tall-pantry";

export type DesignReservationZone = SceneEntityBase<"design-reservation-zone"> & Readonly<{
  reservedFor: DesignReservationZonePurpose;
  sizeInches: Size3DInches;
}>;

export type DesignReservationZonePlacementCandidate = Readonly<{
  zone: DesignReservationZone;
  placementState: "waiting-for-pointer" | "positioned";
  movementFrame: SceneEntityMovementFrame | null;
}>;
