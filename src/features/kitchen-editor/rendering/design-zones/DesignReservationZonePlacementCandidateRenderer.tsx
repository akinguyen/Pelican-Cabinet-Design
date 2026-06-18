"use client";

import type { DesignReservationZonePlacementCandidate } from "@/engine/design-zones/designReservationZoneTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { DesignReservationZoneRenderer } from "./DesignReservationZoneRenderer";

export function DesignReservationZonePlacementCandidateRenderer({
  candidate,
  sceneViewMode,
}: Readonly<{
  candidate: DesignReservationZonePlacementCandidate | null;
  sceneViewMode: SceneViewMode;
}>) {
  if (candidate === null || candidate.placementState !== "positioned") {
    return null;
  }

  return (
    <DesignReservationZoneRenderer
      zone={candidate.zone}
      sceneViewMode={sceneViewMode}
      isSelected={true}
      renderState="candidate"
      isInteractive={false}
    />
  );
}
