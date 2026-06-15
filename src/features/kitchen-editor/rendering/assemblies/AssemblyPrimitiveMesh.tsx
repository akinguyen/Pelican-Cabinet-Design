"use client";

import { memo, useMemo } from "react";
import { degreesToRadians, degreesToUserFacingZRadians } from "@/core/geometry/rotationTypes";
import type { BuiltPrimitiveGeometry } from "@/engine/assemblies/assemblyTreeBuilder";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import { createCustomMeshGeometry } from "@/engine/primitive-geometry/custom-meshes/createCustomMeshGeometry";
import { createLShapedPrismGeometry } from "@/engine/primitive-geometry/l-shaped-prism/createLShapedPrismGeometry";
import type {
  PrimitiveCustomMeshGeometry,
  PrimitiveLShapedPrismGeometry,
  PrimitiveRectangularFrustumGeometry,
} from "@/engine/primitive-geometry/primitiveGeometryTypes";
import { createRectangularFrustumGeometry } from "@/engine/primitive-geometry/rectangular-frustum/createRectangularFrustumGeometry";
import { useDisposableGeometry } from "../shared/useDisposableGeometry";
import { AssemblyPrimitiveEdgeSegments } from "./AssemblyPrimitiveEdgeSegments";

type AssemblyPrimitiveMeshProps = Readonly<{
  primitiveGeometry: BuiltPrimitiveGeometry;
  renderState: "default" | "candidate";
}>;

export const AssemblyPrimitiveMesh = memo(function AssemblyPrimitiveMesh({ primitiveGeometry, renderState }: AssemblyPrimitiveMeshProps) {
  const opacity = renderState === "candidate" ? 0.55 : primitiveGeometry.material.opacity ?? 1;
  const usesEvenColorMaterial = shouldUseEvenColorMaterial(primitiveGeometry);

  return (
    <mesh
      position={[
        primitiveGeometry.worldPositionInches.xInches,
        primitiveGeometry.worldPositionInches.yInches,
        primitiveGeometry.worldPositionInches.zInches,
      ]}
      rotation={[
        degreesToRadians(primitiveGeometry.worldRotationDegrees.xDegrees),
        degreesToRadians(primitiveGeometry.worldRotationDegrees.yDegrees),
        degreesToUserFacingZRadians(primitiveGeometry.worldRotationDegrees.zDegrees),
      ]}
    >
      <PrimitiveGeometry primitiveGeometry={primitiveGeometry} />
      {usesEvenColorMaterial ? (
        <meshBasicMaterial
          color={primitiveGeometry.material.colorHex}
          transparent={opacity < 1}
          opacity={opacity}
        />
      ) : (
        <meshStandardMaterial
          color={primitiveGeometry.material.colorHex}
          transparent={opacity < 1}
          opacity={opacity}
        />
      )}
      <AssemblyPrimitiveEdgeSegments primitiveGeometry={primitiveGeometry} />
    </mesh>
  );
});

function shouldUseEvenColorMaterial(primitiveGeometry: BuiltPrimitiveGeometry): boolean {
  if (
    primitiveGeometry.geometry.kind === "rectangular-frustum" ||
    primitiveGeometry.geometry.kind === "l-shaped-prism"
  ) {
    return true;
  }

  return isDarkDisplayColor(primitiveGeometry.material.colorHex);
}

function isDarkDisplayColor(colorHex: string): boolean {
  const normalizedColorHex = colorHex.trim().toLowerCase();

  return (
    normalizedColorHex === "#000000" ||
    normalizedColorHex === "#05070b" ||
    normalizedColorHex === "#111827" ||
    normalizedColorHex === "#1f2937"
  );
}

type PrimitiveGeometryProps = Readonly<{
  primitiveGeometry: BuiltPrimitiveGeometry;
}>;

function PrimitiveGeometry({ primitiveGeometry }: PrimitiveGeometryProps) {
  if (primitiveGeometry.geometry.kind === "custom-mesh") {
    return (
      <CustomMeshGeometry
        geometry={primitiveGeometry.geometry}
        sizeInches={primitiveGeometry.sizeInches}
      />
    );
  }

  if (primitiveGeometry.geometry.kind === "rectangular-frustum") {
    return (
      <RectangularFrustumGeometry
        geometry={primitiveGeometry.geometry}
        sizeInches={primitiveGeometry.sizeInches}
      />
    );
  }

  if (primitiveGeometry.geometry.kind === "l-shaped-prism") {
    return (
      <LShapedPrismGeometry
        geometry={primitiveGeometry.geometry}
        sizeInches={primitiveGeometry.sizeInches}
      />
    );
  }

  if (primitiveGeometry.geometry.kind === "cylinder") {
    return (
      <cylinderGeometry
        args={[
          primitiveGeometry.sizeInches.widthInches / 2,
          primitiveGeometry.sizeInches.widthInches / 2,
          primitiveGeometry.sizeInches.depthInches,
          32,
        ]}
      />
    );
  }

  return (
    <boxGeometry
      args={[
        primitiveGeometry.sizeInches.widthInches,
        primitiveGeometry.sizeInches.depthInches,
        primitiveGeometry.sizeInches.heightInches,
      ]}
    />
  );
}


type RectangularFrustumGeometryProps = Readonly<{
  geometry: PrimitiveRectangularFrustumGeometry;
  sizeInches: Size3DInches;
}>;

function RectangularFrustumGeometry({ geometry, sizeInches }: RectangularFrustumGeometryProps) {
  const threeGeometry = useMemo(
    () => createRectangularFrustumGeometry(geometry, sizeInches),
    [geometry, sizeInches.widthInches, sizeInches.depthInches, sizeInches.heightInches],
  );

  useDisposableGeometry(threeGeometry);

  return <primitive attach="geometry" object={threeGeometry} />;
}

type LShapedPrismGeometryProps = Readonly<{
  geometry: PrimitiveLShapedPrismGeometry;
  sizeInches: Size3DInches;
}>;

function LShapedPrismGeometry({ geometry, sizeInches }: LShapedPrismGeometryProps) {
  const threeGeometry = useMemo(
    () => createLShapedPrismGeometry(geometry, sizeInches),
    [geometry, sizeInches.widthInches, sizeInches.depthInches, sizeInches.heightInches],
  );

  useDisposableGeometry(threeGeometry);

  return <primitive attach="geometry" object={threeGeometry} />;
}

type CustomMeshGeometryProps = Readonly<{
  geometry: PrimitiveCustomMeshGeometry;
  sizeInches: Size3DInches;
}>;

function CustomMeshGeometry({ geometry: customMeshGeometry, sizeInches }: CustomMeshGeometryProps) {
  const threeGeometry = useMemo(
    () => createCustomMeshGeometry(customMeshGeometry, sizeInches),
    [customMeshGeometry, sizeInches.widthInches, sizeInches.depthInches, sizeInches.heightInches],
  );

  useDisposableGeometry(threeGeometry);

  return <primitive attach="geometry" object={threeGeometry} />;
}
