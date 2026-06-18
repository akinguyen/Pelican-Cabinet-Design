"use client";

import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { memo, useCallback, useMemo } from "react";
import { degreesToUserFacingZRadians } from "@/core/geometry/rotationTypes";
import {
  createDesignReservationZoneFootprint,
  createDesignReservationZoneVolumeGeometry,
} from "@/engine/design-zones/designReservationZoneGeometry";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import { createAssemblyDragPointerWorldPoint } from "../../interaction/assemblies/assemblyDragPointer";
import { createDesignReservationZoneElevationMoveFrame } from "../../interaction/design-zones/designReservationZoneElevationFrame";

const FLOOR_PLAN_ZONE_Z_INCHES = 0.45;
const ZONE_FILL_COLOR = "#22d3ee";
const ZONE_EDGE_COLOR = "#0891b2";
const SELECTED_ZONE_EDGE_COLOR = "#2563eb";

type DesignReservationZoneRenderState = "placed" | "candidate";

type DesignReservationZoneRendererProps = Readonly<{
  zone: DesignReservationZone;
  sceneViewMode: SceneViewMode;
  isSelected: boolean;
  renderState?: DesignReservationZoneRenderState;
  isInteractive?: boolean;
}>;

export const DesignReservationZoneRenderer = memo(function DesignReservationZoneRenderer({
  zone,
  sceneViewMode,
  isSelected,
  renderState = "placed",
  isInteractive = true,
}: DesignReservationZoneRendererProps) {
  const footprint = useMemo(() => createDesignReservationZoneFootprint(zone), [zone]);
  const volumeGeometry = useMemo(() => createDesignReservationZoneVolumeGeometry(zone), [zone]);
  const edgeColor = renderState === "candidate" ? SELECTED_ZONE_EDGE_COLOR : isSelected ? SELECTED_ZONE_EDGE_COLOR : ZONE_EDGE_COLOR;
  const lineWidth = renderState === "candidate" || isSelected ? 2.5 : 1.8;
  const fillOpacity = renderState === "candidate" ? 0.1 : isSelected ? 0.12 : 0.06;
  const floorPlanFillOpacity = renderState === "candidate" ? 0.12 : isSelected ? 0.14 : 0.08;

  const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    const designSceneStore = useDesignSceneStore.getState();

    if (
      !isInteractive ||
      designSceneStore.designScene.activeSceneOperation !== null ||
      designSceneStore.activeDrag !== null ||
      designSceneStore.activeToolbarTool !== null ||
      event.button !== 0 ||
      event.ctrlKey
    ) {
      return;
    }

    event.stopPropagation();
    designSceneStore.selectDesignReservationZone(zone.id);

    const elevationMoveFrame = designSceneStore.activeSceneViewMode === "elevation"
      ? createDesignReservationZoneElevationMoveFrame({
          planeOriginInches: zone.baseCenterPointInches,
          placedWallGraphs: designSceneStore.designScene.placedWallGraphs,
          activeWallElevationTarget: designSceneStore.activeWallElevationTarget,
        })
      : undefined;
    const pointerWorldInches = createAssemblyDragPointerWorldPoint(
      designSceneStore.activeSceneViewMode,
      event.ray,
      zone.baseCenterPointInches.yInches,
      elevationMoveFrame,
    );

    if (pointerWorldInches === null) {
      return;
    }

    designSceneStore.startDesignReservationZoneDrag({
      designReservationZoneId: zone.id,
      pointerWorldInches,
      sceneViewMode: designSceneStore.activeSceneViewMode,
      elevationMoveFrame,
    });
  }, [isInteractive, zone]);

  if (sceneViewMode === "floor-plan") {
    return (
      <group onPointerDown={handlePointerDown} renderOrder={60}>
        <mesh position={[zone.baseCenterPointInches.xInches, zone.baseCenterPointInches.yInches, FLOOR_PLAN_ZONE_Z_INCHES]} rotation={[0, 0, degreesToUserFacingZRadians(zone.rotationDegrees.zDegrees)]}>
          <planeGeometry args={[zone.sizeInches.widthInches, zone.sizeInches.depthInches]} />
          <meshBasicMaterial color={ZONE_FILL_COLOR} transparent opacity={floorPlanFillOpacity} depthWrite={false} depthTest={false} />
        </mesh>
        <Line
          points={[
            ...footprint.cornerPointsInches.map((pointInches) => [pointInches.xInches, pointInches.yInches, FLOOR_PLAN_ZONE_Z_INCHES + 0.05] as [number, number, number]),
            [footprint.cornerPointsInches[0].xInches, footprint.cornerPointsInches[0].yInches, FLOOR_PLAN_ZONE_Z_INCHES + 0.05] as [number, number, number],
          ]}
          color={edgeColor}
          lineWidth={lineWidth}
          dashed
          dashSize={4}
          gapSize={3}
          depthTest={false}
          renderOrder={70}
        />
      </group>
    );
  }

  return (
    <group onPointerDown={handlePointerDown}>
      <mesh
        position={[
          zone.baseCenterPointInches.xInches,
          zone.baseCenterPointInches.yInches,
          zone.baseCenterPointInches.zInches + zone.sizeInches.heightInches / 2,
        ]}
        rotation={[0, 0, degreesToUserFacingZRadians(zone.rotationDegrees.zDegrees)]}
      >
        <boxGeometry args={[zone.sizeInches.widthInches, zone.sizeInches.depthInches, zone.sizeInches.heightInches]} />
        <meshBasicMaterial color={ZONE_FILL_COLOR} transparent opacity={fillOpacity} depthWrite={false} depthTest={true} />
      </mesh>
      {volumeGeometry.edgeSegments.map((edgeSegment) => (
        <Line
          key={edgeSegment.id}
          points={[
            [edgeSegment.startPointInches.xInches, edgeSegment.startPointInches.yInches, edgeSegment.startPointInches.zInches],
            [edgeSegment.endPointInches.xInches, edgeSegment.endPointInches.yInches, edgeSegment.endPointInches.zInches],
          ]}
          color={edgeColor}
          lineWidth={lineWidth}
          dashed
          dashSize={4}
          gapSize={3}
          depthTest={true}
        />
      ))}
    </group>
  );
});
