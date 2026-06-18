import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { AssemblyElevationMoveFrame } from "@/engine/scene/sceneDragTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";

export type DesignReservationZonePurpose = "island" | "peninsula" | "tall-pantry";

export type DesignReservationZone = Readonly<{
  id: string;
  reservedFor: DesignReservationZonePurpose;
  baseCenterPointInches: Point3DInches;
  rotationDegrees: Readonly<{
    zDegrees: number;
  }>;
  sizeInches: Size3DInches;
}>;

export type DesignReservationZonePlacementCandidate = Readonly<{
  zone: DesignReservationZone;
  placementState: "waiting-for-pointer" | "positioned";
  sceneViewMode: SceneViewMode;
  elevationMoveFrame?: AssemblyElevationMoveFrame;
}>;
