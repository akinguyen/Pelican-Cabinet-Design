"use client";

import { Billboard, Line, Text } from "@react-three/drei";

const AXIS_LENGTH_INCHES = 84;
const AXIS_LABEL_OFFSET_INCHES = 8;
const AXIS_LABEL_FONT_SIZE_INCHES = 5;

export function SceneAxisGizmo() {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.4, 16, 16]} />
        <meshBasicMaterial color="#111827" />
      </mesh>
      <Line points={[[0, 0, 0], [AXIS_LENGTH_INCHES, 0, 0]]} color="#22c55e" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, AXIS_LENGTH_INCHES, 0]]} color="#3b82f6" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, 0, AXIS_LENGTH_INCHES]]} color="#ef4444" lineWidth={2} />
      <AxisLabel position={[AXIS_LENGTH_INCHES + AXIS_LABEL_OFFSET_INCHES, 0, 0]} label="X" />
      <AxisLabel position={[0, AXIS_LENGTH_INCHES + AXIS_LABEL_OFFSET_INCHES, 0]} label="Y" />
      <AxisLabel position={[0, 0, AXIS_LENGTH_INCHES + AXIS_LABEL_OFFSET_INCHES]} label="Z" />
    </group>
  );
}

type AxisLabelProps = Readonly<{
  position: [number, number, number];
  label: string;
}>;

function AxisLabel({ position, label }: AxisLabelProps) {
  return (
    <Billboard position={position} follow>
      <Text
        anchorX="center"
        anchorY="middle"
        color="#111827"
        fontSize={AXIS_LABEL_FONT_SIZE_INCHES}
        outlineColor="#ffffff"
        outlineWidth={0.35}
      >
        {label}
      </Text>
    </Billboard>
  );
}
