"use client";

import { Edges } from "@react-three/drei";
import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { degreesToRadians, degreesToUserFacingZRadians } from "@/core/geometry/rotationTypes";
import type { BuiltPrimitiveGeometry } from "@/engine/assemblies/assemblyTreeBuilder";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import { createCustomMeshGeometry } from "@/engine/primitive-geometry/custom-meshes/createCustomMeshGeometry";
import type { PrimitiveCustomMeshGeometry } from "@/engine/primitive-geometry/primitiveGeometryTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { canManuallyEditScene } from "@/engine/scene/kitchenWorkspaceModePermissions";
import { createAssemblyDragPointerWorldPoint } from "../../interaction/assemblies/assemblyDragPointer";

type AssemblyPrimitiveMeshProps = Readonly<{
  primitiveGeometry: BuiltPrimitiveGeometry;
  renderState: "default" | "candidate";
}>;

export function AssemblyPrimitiveMesh({ primitiveGeometry, renderState }: AssemblyPrimitiveMeshProps) {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const activeSceneViewMode = useDesignSceneStore((state) => state.activeSceneViewMode);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const selectPlacedAssembly = useDesignSceneStore((state) => state.selectPlacedAssembly);
  const startAssemblyDrag = useDesignSceneStore((state) => state.startAssemblyDrag);

  const opacity = renderState === "candidate" ? 0.55 : primitiveGeometry.material.opacity ?? 1;
  const usesEvenColorMaterial = shouldUseEvenColorMaterial(primitiveGeometry);

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    if (
      renderState !== "default" ||
      activeSceneOperation !== null ||
      activeToolbarTool === "draw-wall-footprint" ||
      event.button !== 0 ||
      event.ctrlKey
    ) {
      return;
    }

    const placedAssembly = placedAssemblies.find(
      (assembly) => assembly.id === primitiveGeometry.rootAssemblyId,
    );

    if (placedAssembly === undefined) {
      return;
    }

    event.stopPropagation();
    selectPlacedAssembly(primitiveGeometry.rootAssemblyId);

    if (!canManuallyEditScene(workspaceMode)) {
      return;
    }

    const pointerWorldInches = createAssemblyDragPointerWorldPoint(
      activeSceneViewMode,
      event.ray,
      placedAssembly.worldPositionInches.yInches,
    );

    if (pointerWorldInches === null) {
      return;
    }

    startAssemblyDrag({
      assemblyId: primitiveGeometry.rootAssemblyId,
      pointerWorldInches,
      sceneViewMode: activeSceneViewMode,
    });
  }

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
      onPointerDown={handlePointerDown}
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
      <Edges color="#111827" threshold={15} lineWidth={2} />
    </mesh>
  );
}


function shouldUseEvenColorMaterial(primitiveGeometry: BuiltPrimitiveGeometry): boolean {
  if (primitiveGeometry.geometry.kind === "custom-mesh") {
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

type CustomMeshGeometryProps = Readonly<{
  geometry: PrimitiveCustomMeshGeometry;
  sizeInches: Size3DInches;
}>;

function CustomMeshGeometry({ geometry: customMeshGeometry, sizeInches }: CustomMeshGeometryProps) {
  const threeGeometry = useMemo(
    () => createCustomMeshGeometry(customMeshGeometry, sizeInches),
    [
      customMeshGeometry.meshId,
      customMeshGeometry.topWidthRatio,
      customMeshGeometry.topDepthRatio,
      sizeInches.widthInches,
      sizeInches.depthInches,
      sizeInches.heightInches,
    ],
  );

  return <primitive attach="geometry" object={threeGeometry} />;
}
