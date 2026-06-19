"use client";

import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import type { SceneSelection } from "@/engine/scene/sceneSelectionTypes";
import { isSceneEntitySelected } from "@/engine/scene/sceneSelectionTypes";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { DesignReservationZoneRenderer } from "./DesignReservationZoneRenderer";

export function DesignReservationZoneLayer({
  zones,
  activeSelection,
  sceneViewMode,
}: Readonly<{
  zones: readonly DesignReservationZone[];
  activeSelection: SceneSelection | null;
  sceneViewMode: SceneViewMode;
}>) {
  return (
    <group>
      {zones.map((zone) => (
        <DesignReservationZoneRenderer
          key={zone.id}
          zone={zone}
          sceneViewMode={sceneViewMode}
          isSelected={isSceneEntitySelected(activeSelection, { entityKind: "design-reservation-zone", entityId: zone.id })}
        />
      ))}
    </group>
  );
}
