"use client";

import { Edges } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { degreesToRadians } from "@/core/geometry/rotationTypes";
import type { BuiltPrimitiveGeometry } from "@/engine/assemblies/assemblyTreeBuilder";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { createAssemblyDragPointerWorldPoint } from "../../interaction/assemblies/assemblyDragPointer";

type AssemblyPrimitiveMeshProps = Readonly<{
  primitiveGeometry: BuiltPrimitiveGeometry;
  renderState: "default" | "candidate";
}>;

export function AssemblyPrimitiveMesh({ primitiveGeometry, renderState }: AssemblyPrimitiveMeshProps) {
  const activeEditorView = useDesignSceneStore((state) => state.activeEditorView);
  const activeSceneOperation = useDesignSceneStore((state) => state.designScene.activeSceneOperation);
  const activeToolbarTool = useDesignSceneStore((state) => state.activeToolbarTool);
  const placedAssemblies = useDesignSceneStore((state) => state.designScene.placedAssemblies);
  const selectPlacedAssembly = useDesignSceneStore((state) => state.selectPlacedAssembly);
  const startAssemblyDrag = useDesignSceneStore((state) => state.startAssemblyDrag);

  if (primitiveGeometry.geometry.kind !== "box") {
    return null;
  }

  const opacity = renderState === "candidate" ? 0.55 : primitiveGeometry.material.opacity ?? 1;

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

    const pointerWorldInches = createAssemblyDragPointerWorldPoint(
      activeEditorView,
      event.ray,
      placedAssembly.worldPositionInches.yInches,
    );

    if (pointerWorldInches === null) {
      return;
    }

    event.stopPropagation();
    selectPlacedAssembly(primitiveGeometry.rootAssemblyId);
    startAssemblyDrag({
      assemblyId: primitiveGeometry.rootAssemblyId,
      pointerWorldInches,
      editorView: activeEditorView,
    });
  }

  return (
    <mesh
      position={[
        primitiveGeometry.worldPositionInches.xInches,
        primitiveGeometry.worldPositionInches.yInches,
        primitiveGeometry.worldPositionInches.zInches,
      ]}
      rotation={[0, 0, degreesToRadians(primitiveGeometry.worldRotationDegrees.zDegrees)]}
      onPointerDown={handlePointerDown}
    >
      <boxGeometry
        args={[
          primitiveGeometry.sizeInches.widthInches,
          primitiveGeometry.sizeInches.depthInches,
          primitiveGeometry.sizeInches.heightInches,
        ]}
      />
      <meshStandardMaterial
        color={primitiveGeometry.material.colorHex}
        transparent={opacity < 1}
        opacity={opacity}
      />
      <Edges color="#111827" threshold={15} lineWidth={2} />
    </mesh>
  );
}
