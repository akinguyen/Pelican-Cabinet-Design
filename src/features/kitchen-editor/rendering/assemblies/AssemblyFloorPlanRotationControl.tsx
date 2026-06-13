"use client";

import { Html, Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { AssemblyPlacementFootprint } from "@/engine/assemblies/placement/assemblyPlacementTypes";
import { ASSEMBLY_ROTATION_SNAP_STEP_DEGREES } from "@/engine/assemblies/placement/assemblyRotationSnapping";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";

const ROTATION_CONTROL_Z_INCHES = 9;
const ROTATION_RING_EXTRA_RADIUS_INCHES = 10;
const ROTATION_RING_THICKNESS_INCHES = 5;
const ROTATION_TICK_LENGTH_INCHES = 3.5;
const ROTATION_DIRECTION_ARROW_GAP_INCHES = 4;
const ROTATION_DIRECTION_ARROW_LENGTH_INCHES = 7;

export function AssemblyFloorPlanRotationControl({
  placedAssembly,
  footprint,
}: Readonly<{
  placedAssembly: PlacedAssembly;
  footprint: AssemblyPlacementFootprint;
}>) {
  const activeDrag = useDesignSceneStore((state) => state.activeDrag);
  const startAssemblyRotationDrag = useDesignSceneStore((state) => state.startAssemblyRotationDrag);
  const activeRotationDrag = activeDrag?.kind === "assembly-rotation" && activeDrag.assemblyId === placedAssembly.id
    ? activeDrag
    : null;
  const isRotating = activeRotationDrag !== null;
  const ringRadiusInches = Math.max(
    placedAssembly.configuration.sizeInches.widthInches,
    placedAssembly.configuration.sizeInches.depthInches,
  ) / 2 + ROTATION_RING_EXTRA_RADIUS_INCHES;

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    startAssemblyRotationDrag({
      assemblyId: placedAssembly.id,
      centerPointInches: footprint.centerPointInches,
      pointerWorldInches: {
        xInches: event.point.x,
        yInches: event.point.y,
        zInches: 0,
      },
    });
  }

  return (
    <group position={[footprint.centerPointInches.xInches, footprint.centerPointInches.yInches, ROTATION_CONTROL_Z_INCHES]}>
      <mesh onPointerDown={handlePointerDown} renderOrder={125}>
        <ringGeometry
          args={[
            ringRadiusInches - ROTATION_RING_THICKNESS_INCHES / 2,
            ringRadiusInches + ROTATION_RING_THICKNESS_INCHES / 2,
            96,
          ]}
        />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.35} depthTest={false} />
      </mesh>
      <RotationDirectionArrows ringRadiusInches={ringRadiusInches} />
      {isRotating ? <RotationSnapTicks ringRadiusInches={ringRadiusInches} /> : null}
      <RotationHandle
        ringRadiusInches={ringRadiusInches}
        handleCenterAngleDegrees={getRotationHandleCenterAngleDegrees(placedAssembly.rotationDegrees.zDegrees)}
      />
      {isRotating ? (
        <Html center position={[0, 0, 1]} style={{ pointerEvents: "none", zIndex: 60 }}>
          <div className="rounded-full bg-slate-700 px-3 py-1 text-sm font-bold leading-none text-white shadow">
            {Math.round(placedAssembly.rotationDegrees.zDegrees)}°
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
  return (
    <group renderOrder={126}>
      {[0, 90, 180, 270].map((angleDegrees) => (
        <Line
          key={`rotation-direction-arrow-${angleDegrees}`}
          points={createDirectionArrowPoints({ ringRadiusInches, angleDegrees })}
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

function RotationSnapTicks({ ringRadiusInches }: Readonly<{ ringRadiusInches: number }>) {
  return (
    <group renderOrder={127}>
      {Array.from({ length: 8 }, (_, tickIndex) => {
        const angleDegrees = tickIndex * ASSEMBLY_ROTATION_SNAP_STEP_DEGREES;
        const angleRadians = convertDegreesToRadians(angleDegrees);
        const innerRadiusInches = ringRadiusInches - ROTATION_TICK_LENGTH_INCHES / 2;
        const outerRadiusInches = ringRadiusInches + ROTATION_TICK_LENGTH_INCHES / 2;

        return (
          <Line
            key={`rotation-tick-${tickIndex}`}
            points={[
              [Math.cos(angleRadians) * innerRadiusInches, Math.sin(angleRadians) * innerRadiusInches, 0.2],
              [Math.cos(angleRadians) * outerRadiusInches, Math.sin(angleRadians) * outerRadiusInches, 0.2],
            ]}
            color="#0f172a"
            lineWidth={2.5}
            depthTest={false}
            renderOrder={127}
          />
        );
      })}
    </group>
  );
}

function RotationHandle({
  ringRadiusInches,
  handleCenterAngleDegrees,
}: Readonly<{
  ringRadiusInches: number;
  handleCenterAngleDegrees: number;
}>) {
  const handlePoints = createRotationHandlePoints({
    radiusInches: ringRadiusInches,
    handleCenterAngleDegrees,
  });
  const arrowHeadPoints = createRotationHandleArrowHeadPoints({
    radiusInches: ringRadiusInches,
    handleCenterAngleDegrees,
  });

  return (
    <group renderOrder={128}>
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
