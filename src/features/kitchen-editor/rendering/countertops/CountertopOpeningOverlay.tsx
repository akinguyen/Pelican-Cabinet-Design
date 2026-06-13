"use client";

import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import { Shape } from "three";
import { degreesToUserFacingZRadians } from "@/core/geometry/rotationTypes";
import type { Point2DInches } from "@/core/geometry/pointTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { createCountertopOpeningRequestedPolygon } from "@/engine/countertops/countertopOpeningGeometry";
import type { CountertopOpening } from "@/engine/countertops/countertopOpeningTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";
import { createCountertopLocalPointFromRay, createCountertopWorldPointFromLocal } from "../../interaction/countertops/countertopPointerProjection";

const COUNTERTOP_OPENING_OVERLAY_Z_OFFSET_INCHES = 0.05;

export function CountertopOpeningOverlay() {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const activeSelection = useDesignSceneStore((state) => state.designScene.activeSelection);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const countertopOpenings = useDesignSceneStore((state) => state.designScene.countertopOpenings);
  const selectCountertopOpening = useDesignSceneStore((state) => state.selectCountertopOpening);
  const startCountertopOpeningDrag = useDesignSceneStore((state) => state.startCountertopOpeningDrag);
  const updateCountertopOpeningDrag = useDesignSceneStore((state) => state.updateCountertopOpeningDrag);
  const finishCountertopOpeningDrag = useDesignSceneStore((state) => state.finishCountertopOpeningDrag);

  if (activeSceneViewMode === "elevation") {
    return null;
  }

  const canDragOpenings = canManuallyEditScene(workspaceMode) && activeToolbarTool === null;
  const activeOpeningDrag = activeSceneOperation?.kind === "countertop-opening-drag"
    ? activeSceneOperation.countertopOpeningDrag
    : null;

  return (
    <group>
      {countertopOpenings.map((opening) => {
        const hostCountertop = placedAssemblies.find(
          (assembly) => assembly.id === opening.hostCountertopId,
        );

        if (hostCountertop === undefined) {
          return null;
        }

        const isSelected =
          activeSelection?.kind === "countertop-opening" &&
          activeSelection.countertopOpeningId === opening.id;

        function handlePointerDown(event: ThreeEvent<PointerEvent>) {
          event.stopPropagation();
          selectCountertopOpening(opening.id);

          if (!canDragOpenings || hostCountertop === undefined || event.button !== 0) {
            return;
          }

          const localPointInches = createCountertopLocalPointFromRay(hostCountertop, event.ray);

          if (localPointInches === null) {
            return;
          }

          event.target.setPointerCapture(event.pointerId);
          startCountertopOpeningDrag({
            countertopOpeningId: opening.id,
            grabLocalInches: localPointInches,
          });
        }

        function handlePointerMove(event: ThreeEvent<PointerEvent>) {
          if (
            activeOpeningDrag?.countertopOpeningId !== opening.id ||
            !canDragOpenings ||
            hostCountertop === undefined
          ) {
            return;
          }

          const localPointInches = createCountertopLocalPointFromRay(hostCountertop, event.ray);

          if (localPointInches === null) {
            return;
          }

          event.stopPropagation();
          updateCountertopOpeningDrag(localPointInches);
        }

        function handlePointerUp(event: ThreeEvent<PointerEvent>) {
          if (activeOpeningDrag?.countertopOpeningId !== opening.id) {
            return;
          }

          event.stopPropagation();
          event.target.releasePointerCapture(event.pointerId);
          finishCountertopOpeningDrag();
        }

        return (
          <CountertopOpeningOverlayItem
            key={opening.id}
            opening={opening}
            hostCountertop={hostCountertop}
            isSelected={isSelected}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        );
      })}
    </group>
  );
}

type CountertopOpeningOverlayItemProps = Readonly<{
  opening: CountertopOpening;
  hostCountertop: PlacedAssembly;
  isSelected: boolean;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
  onPointerMove: (event: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (event: ThreeEvent<PointerEvent>) => void;
}>;

function CountertopOpeningOverlayItem({
  opening,
  hostCountertop,
  isSelected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: CountertopOpeningOverlayItemProps) {
  const requestedPolygonInches = useMemo(
    () => createCountertopOpeningRequestedPolygon(opening),
    [opening],
  );
  const linePoints = useMemo(
    () =>
      requestedPolygonInches
        .map((pointInches) =>
          createCountertopWorldPointFromLocal(
            hostCountertop,
            pointInches,
            COUNTERTOP_OPENING_OVERLAY_Z_OFFSET_INCHES,
          ),
        )
        .map((pointInches) => [
          pointInches.xInches,
          pointInches.yInches,
          pointInches.zInches,
        ] as [number, number, number]),
    [hostCountertop, requestedPolygonInches],
  );
  const selectionShape = useMemo(
    () => createOpeningSelectionShape(requestedPolygonInches),
    [requestedPolygonInches],
  );
  const topZInches =
    hostCountertop.worldPositionInches.zInches +
    hostCountertop.configuration.sizeInches.heightInches / 2 +
    COUNTERTOP_OPENING_OVERLAY_Z_OFFSET_INCHES;

  if (requestedPolygonInches.length < 3) {
    return null;
  }

  return (
    <group>
      {isSelected ? (
        <Line
          points={[...linePoints, linePoints[0]]}
          color="#2563eb"
          lineWidth={2}
        />
      ) : null}
      <mesh
        position={[
          hostCountertop.worldPositionInches.xInches,
          hostCountertop.worldPositionInches.yInches,
          topZInches,
        ]}
        rotation={[0, 0, degreesToUserFacingZRadians(hostCountertop.rotationDegrees.zDegrees ?? 0)]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <shapeGeometry args={[selectionShape]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function createOpeningSelectionShape(polygonInches: readonly Point2DInches[]): Shape {
  const shape = new Shape();
  const firstPointInches = polygonInches[0];

  shape.moveTo(firstPointInches.xInches, firstPointInches.yInches);
  polygonInches.slice(1).forEach((pointInches) => {
    shape.lineTo(pointInches.xInches, pointInches.yInches);
  });
  shape.lineTo(firstPointInches.xInches, firstPointInches.yInches);

  return shape;
}
