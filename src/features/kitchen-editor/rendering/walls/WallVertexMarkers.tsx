"use client";

import { Html } from "@react-three/drei";
import { Plus } from "lucide-react";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { WallFootprintSnapTarget } from "@/engine/walls/footprint-draft/wallFootprintDraftTypes";

const MARKER_Z_INCHES = 0.55;
const MARKER_RADIUS_INCHES = 1.25;
const MARKER_SEGMENTS = 24;
const PLUS_MARKER_Z_INCHES = 1.8;

type WallVertexMarkersProps = Readonly<{
  pointsInches: readonly Point3DInches[];
  hoverPointInches: Point3DInches | null;
  snapTarget: WallFootprintSnapTarget | null;
}>;

export function WallVertexMarkers({
  pointsInches,
  hoverPointInches,
  snapTarget,
}: WallVertexMarkersProps) {
  const shouldShowPlusMarker = snapTarget !== null && snapTarget.kind !== "free-point";

  return (
    <>
      {pointsInches.map((pointInches, pointIndex) => (
        <SolidBlueMarker key={`wall-footprint-boundary-point-${pointIndex}`} pointInches={pointInches} />
      ))}
      {hoverPointInches !== null ? (
        shouldShowPlusMarker ? (
          <PlusMarker pointInches={hoverPointInches} />
        ) : (
          <SolidBlueMarker pointInches={hoverPointInches} />
        )
      ) : null}
    </>
  );
}

function SolidBlueMarker({ pointInches }: Readonly<{ pointInches: Point3DInches }>) {
  return (
    <mesh position={[pointInches.xInches, pointInches.yInches, MARKER_Z_INCHES]}>
      <sphereGeometry args={[MARKER_RADIUS_INCHES, MARKER_SEGMENTS, MARKER_SEGMENTS]} />
      <meshBasicMaterial color="#0ea5e9" />
    </mesh>
  );
}

function PlusMarker({ pointInches }: Readonly<{ pointInches: Point3DInches }>) {
  return (
    <Html
      center
      position={[pointInches.xInches, pointInches.yInches, PLUS_MARKER_Z_INCHES]}
      style={{ pointerEvents: "none" }}
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-blue-700 bg-blue-500 shadow-md">
        <Plus className="h-4 w-4 text-white" strokeWidth={3} />
      </div>
    </Html>
  );
}
