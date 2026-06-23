"use client";

import { useCallback, useMemo } from "react";
import { Html, Line } from "@react-three/drei";
import { DoubleSide } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { SceneEntityBounds } from "@/engine/scene-entities/sceneEntityBoundsTypes";

const FALLBACK_FLOOR_PLAN_ROTATION_CONTROL_Z_INCHES = 144;
const ROTATION_RING_EXTRA_RADIUS_INCHES = 10;
const ROTATION_RING_THICKNESS_INCHES = 5;
const ROTATION_TICK_LENGTH_INCHES = 3.5;
const ROTATION_DIRECTION_ARROW_GAP_INCHES = 4;
const ROTATION_DIRECTION_ARROW_LENGTH_INCHES = 7;
const ROTATION_HANDLE_HIT_WIDTH_INCHES = 7;
const ROTATION_HANDLE_ARROW_TIP_HIT_RADIUS_INCHES = 4.5;

type SceneEntityRotationControlProps = Readonly<{
  bounds: SceneEntityBounds;
  isRotating: boolean;
  rotationDegrees: number;
  snapStepDegrees: number;
  onStartRotation: (pointerWorldInches: Point3DInches, handleCenterAngleDegrees: number) => void;
  handleCenterAngleDegrees?: number;
  isInteractionEnabled?: boolean;
  controlZInches?: number;
}>;

export function SceneEntityRotationControl({
  bounds,
  isRotating,
  rotationDegrees,
  snapStepDegrees,
  onStartRotation,
  handleCenterAngleDegrees,
  isInteractionEnabled = true,
  controlZInches = FALLBACK_FLOOR_PLAN_ROTATION_CONTROL_Z_INCHES,
}: SceneEntityRotationControlProps) {
  const ringRadiusInches = Math.max(
    bounds.sizeInches.widthInches,
    bounds.sizeInches.depthInches,
  ) / 2 + ROTATION_RING_EXTRA_RADIUS_INCHES;
  const currentHandleCenterAngleDegrees = handleCenterAngleDegrees ?? getRotationHandleCenterAngleDegrees(rotationDegrees);

  const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0) {
      return;
    }

    if (!isInteractionEnabled) {
      return;
    }

    event.stopPropagation();
    const pointerCaptureTarget = event.target as EventTarget & {
      setPointerCapture?: (pointerId: number) => void;
    };
    pointerCaptureTarget.setPointerCapture?.(event.pointerId);
    onStartRotation({
      xInches: event.point.x,
      yInches: event.point.y,
      zInches: 0,
    }, currentHandleCenterAngleDegrees);
  }, [currentHandleCenterAngleDegrees, isInteractionEnabled, onStartRotation]);

  return (
    <group position={[bounds.footprint.centerPointInches.xInches, bounds.footprint.centerPointInches.yInches, controlZInches]}>
      <mesh renderOrder={125}>
        <ringGeometry
          args={[
            ringRadiusInches - ROTATION_RING_THICKNESS_INCHES / 2,
            ringRadiusInches + ROTATION_RING_THICKNESS_INCHES / 2,
            96,
          ]}
        />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.35} depthTest={false} depthWrite={false} side={DoubleSide} />
      </mesh>
      <RotationDirectionArrows ringRadiusInches={ringRadiusInches} />
      {isRotating ? <RotationSnapTicks ringRadiusInches={ringRadiusInches} snapStepDegrees={snapStepDegrees} /> : null}
      <RotationHandle
        ringRadiusInches={ringRadiusInches}
        handleCenterAngleDegrees={currentHandleCenterAngleDegrees}
        onPointerDown={handlePointerDown}
      />
      {isRotating ? (
        <Html center position={[0, 0, 1]} style={{ pointerEvents: "none", zIndex: 60 }}>
          <div className="rounded-full bg-slate-700 px-3 py-1 text-sm font-bold leading-none text-white shadow">
            {Math.round(rotationDegrees)}°
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function getRotationHandleCenterAngleDegrees(rotationDegrees: number): number {
  return -rotationDegrees - 90;
}

function RotationDirectionArrows({ ringRadiusInches }: Readonly<{ ringRadiusInches: number }>) {
  const directionArrowItems = useMemo(() => [0, 90, 180, 270].map((angleDegrees) => ({
    angleDegrees,
    points: createDirectionArrowPoints({ ringRadiusInches, angleDegrees }),
  })), [ringRadiusInches]);

  return (
    <group renderOrder={126}>
      {directionArrowItems.map((arrowItem) => (
        <Line
          key={`rotation-direction-arrow-${arrowItem.angleDegrees}`}
          points={arrowItem.points}
          color="#94a3b8"
          lineWidth={3}
          transparent
          opacity={0.65}
          depthTest={false}
          renderOrder={126}
        />
      ))}
    </group>
  );
}

function RotationSnapTicks({
  ringRadiusInches,
  snapStepDegrees,
}: Readonly<{
  ringRadiusInches: number;
  snapStepDegrees: number;
}>) {
  const tickItems = useMemo(() => {
    const tickCount = Math.max(1, Math.round(360 / snapStepDegrees));

    return Array.from({ length: tickCount }, (_, tickIndex) => {
      const angleDegrees = tickIndex * snapStepDegrees;
      const angleRadians = convertDegreesToRadians(angleDegrees);
      const innerRadiusInches = ringRadiusInches - ROTATION_TICK_LENGTH_INCHES / 2;
      const outerRadiusInches = ringRadiusInches + ROTATION_TICK_LENGTH_INCHES / 2;

      return {
        tickIndex,
        points: [
          [Math.cos(angleRadians) * innerRadiusInches, Math.sin(angleRadians) * innerRadiusInches, 0.2],
          [Math.cos(angleRadians) * outerRadiusInches, Math.sin(angleRadians) * outerRadiusInches, 0.2],
        ] as [number, number, number][],
      };
    });
  }, [ringRadiusInches, snapStepDegrees]);

  return (
    <group renderOrder={127}>
      {tickItems.map((tickItem) => (
        <Line
          key={`rotation-tick-${tickItem.tickIndex}`}
          points={tickItem.points}
          color="#0f172a"
          lineWidth={2.5}
          depthTest={false}
          renderOrder={127}
        />
      ))}
    </group>
  );
}

function RotationHandle({
  ringRadiusInches,
  handleCenterAngleDegrees,
  onPointerDown,
}: Readonly<{
  ringRadiusInches: number;
  handleCenterAngleDegrees: number;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
}>) {
  const handlePoints = useMemo(() => createRotationHandlePoints({
    radiusInches: ringRadiusInches,
    handleCenterAngleDegrees,
  }), [handleCenterAngleDegrees, ringRadiusInches]);
  const arrowHeadPoints = useMemo(() => createRotationHandleArrowHeadPoints({
    radiusInches: ringRadiusInches,
    handleCenterAngleDegrees,
  }), [handleCenterAngleDegrees, ringRadiusInches]);

  return (
    <group renderOrder={128}>
      <RotationPolylineHitTargets
        hitTargetId="rotation-handle-arc"
        polylines={[handlePoints, ...arrowHeadPoints]}
        onPointerDown={onPointerDown}
      />
      {arrowHeadPoints.map((points, arrowHeadIndex) => (
        <mesh
          key={`rotation-arrow-tip-hit-target-${arrowHeadIndex}`}
          position={[points[1][0], points[1][1], 0.8]}
          onPointerDown={onPointerDown}
          renderOrder={160}
        >
          <circleGeometry args={[ROTATION_HANDLE_ARROW_TIP_HIT_RADIUS_INCHES, 24]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0}
            depthTest={false}
            depthWrite={false}
            colorWrite={false}
            side={DoubleSide}
          />
        </mesh>
      ))}
      <Line
        points={handlePoints}
        color="#0f172a"
        lineWidth={3}
        depthTest={false}
        renderOrder={128}
      />
      {arrowHeadPoints.map((points, arrowHeadIndex) => (
        <Line
          key={`rotation-arrow-head-${arrowHeadIndex}`}
          points={points}
          color="#0f172a"
          lineWidth={3}
          depthTest={false}
          renderOrder={129}
        />
      ))}
    </group>
  );
}

function RotationPolylineHitTargets({
  hitTargetId,
  polylines,
  onPointerDown,
}: Readonly<{
  hitTargetId: string;
  polylines: readonly (readonly [number, number, number][])[];
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
}>) {
  return (
    <group renderOrder={160}>
      {polylines.flatMap((points, polylineIndex) => points.slice(0, -1).map((startPoint, segmentIndex) => {
        const endPoint = points[segmentIndex + 1];
        const deltaXInches = endPoint[0] - startPoint[0];
        const deltaYInches = endPoint[1] - startPoint[1];
        const lengthInches = Math.hypot(deltaXInches, deltaYInches);

        if (lengthInches <= 0.001) {
          return null;
        }

        return (
          <mesh
            key={`${hitTargetId}-${polylineIndex}-${segmentIndex}`}
            position={[
              (startPoint[0] + endPoint[0]) / 2,
              (startPoint[1] + endPoint[1]) / 2,
              0.75,
            ]}
            rotation={[0, 0, Math.atan2(deltaYInches, deltaXInches)]}
            onPointerDown={onPointerDown}
            renderOrder={160}
          >
            <boxGeometry args={[lengthInches + ROTATION_HANDLE_HIT_WIDTH_INCHES, ROTATION_HANDLE_HIT_WIDTH_INCHES, 0.2]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0}
              depthTest={false}
              depthWrite={false}
              colorWrite={false}
            />
          </mesh>
        );
      }))}
    </group>
  );
}

function createDirectionArrowPoints(args: {
  ringRadiusInches: number;
  angleDegrees: number;
}): [number, number, number][] {
  const angleRadians = convertDegreesToRadians(args.angleDegrees);
  const direction = {
    x: Math.cos(angleRadians),
    y: Math.sin(angleRadians),
  };
  const normal = {
    x: -direction.y,
    y: direction.x,
  };
  const startRadiusInches = args.ringRadiusInches + ROTATION_DIRECTION_ARROW_GAP_INCHES;
  const endRadiusInches = startRadiusInches + ROTATION_DIRECTION_ARROW_LENGTH_INCHES;
  const headLengthInches = 2.5;
  const headWidthInches = 2;
  const startPoint: [number, number, number] = [
    direction.x * startRadiusInches,
    direction.y * startRadiusInches,
    0.35,
  ];
  const endPoint: [number, number, number] = [
    direction.x * endRadiusInches,
    direction.y * endRadiusInches,
    0.35,
  ];
  const firstHeadPoint: [number, number, number] = [
    direction.x * (endRadiusInches - headLengthInches) + normal.x * headWidthInches,
    direction.y * (endRadiusInches - headLengthInches) + normal.y * headWidthInches,
    0.35,
  ];
  const secondHeadPoint: [number, number, number] = [
    direction.x * (endRadiusInches - headLengthInches) - normal.x * headWidthInches,
    direction.y * (endRadiusInches - headLengthInches) - normal.y * headWidthInches,
    0.35,
  ];

  return [startPoint, endPoint, firstHeadPoint, endPoint, secondHeadPoint];
}

function createRotationHandlePoints(args: {
  radiusInches: number;
  handleCenterAngleDegrees: number;
}): [number, number, number][] {
  const points: [number, number, number][] = [];
  const startAngleRadians = convertDegreesToRadians(args.handleCenterAngleDegrees - 45);
  const endAngleRadians = convertDegreesToRadians(args.handleCenterAngleDegrees + 45);
  const segmentCount = 20;

  for (let segmentIndex = 0; segmentIndex <= segmentCount; segmentIndex += 1) {
    const t = segmentIndex / segmentCount;
    const angleRadians = startAngleRadians + (endAngleRadians - startAngleRadians) * t;
    points.push([Math.cos(angleRadians) * args.radiusInches, Math.sin(angleRadians) * args.radiusInches, 0.45]);
  }

  return points;
}

function createRotationHandleArrowHeadPoints(args: {
  radiusInches: number;
  handleCenterAngleDegrees: number;
}): readonly [number, number, number][][] {
  const startAngleDegrees = args.handleCenterAngleDegrees - 45;
  const endAngleDegrees = args.handleCenterAngleDegrees + 45;

  return [
    createCurvedArrowHeadPoints({
      radiusInches: args.radiusInches,
      angleDegrees: startAngleDegrees,
      pointsTowardIncreasingAngle: false,
    }),
    createCurvedArrowHeadPoints({
      radiusInches: args.radiusInches,
      angleDegrees: endAngleDegrees,
      pointsTowardIncreasingAngle: true,
    }),
  ];
}

function createCurvedArrowHeadPoints(args: {
  radiusInches: number;
  angleDegrees: number;
  pointsTowardIncreasingAngle: boolean;
}): [number, number, number][] {
  const angleRadians = convertDegreesToRadians(args.angleDegrees);
  const radial = {
    x: Math.cos(angleRadians),
    y: Math.sin(angleRadians),
  };
  const tangent = args.pointsTowardIncreasingAngle
    ? { x: -radial.y, y: radial.x }
    : { x: radial.y, y: -radial.x };
  const tip: [number, number, number] = [
    radial.x * args.radiusInches,
    radial.y * args.radiusInches,
    0.5,
  ];
  const headLengthInches = 3;
  const headWidthInches = 2.5;
  const firstWing: [number, number, number] = [
    tip[0] - tangent.x * headLengthInches + radial.x * headWidthInches,
    tip[1] - tangent.y * headLengthInches + radial.y * headWidthInches,
    0.5,
  ];
  const secondWing: [number, number, number] = [
    tip[0] - tangent.x * headLengthInches - radial.x * headWidthInches,
    tip[1] - tangent.y * headLengthInches - radial.y * headWidthInches,
    0.5,
  ];

  return [firstWing, tip, secondWing];
}

function convertDegreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
