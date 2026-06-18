"use client";

import { memo, useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { collectBuiltPrimitiveGeometries } from "@/engine/assemblies/assemblyBounds";
import type { SceneViewMode } from "@/engine/scene/sceneViewModeTypes";
import type { BuiltAssemblyTree } from "@/engine/assemblies/assemblyTreeBuilder";
import { AssemblyFrontOutlineLines } from "./AssemblyFrontOutlineLines";
import { AssemblyPrimitiveMesh } from "./AssemblyPrimitiveMesh";

type AssemblyRendererProps = Readonly<{
  builtAssemblyTree: BuiltAssemblyTree;
  renderState: "default" | "candidate";
  showFrontOutlineLines: boolean;
  sceneViewMode: SceneViewMode;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
}>;

export const AssemblyRenderer = memo(function AssemblyRenderer({
  builtAssemblyTree,
  renderState,
  showFrontOutlineLines,
  sceneViewMode,
  onPointerDown,
}: AssemblyRendererProps) {
  const primitiveGeometries = useMemo(
    () => collectBuiltPrimitiveGeometries(builtAssemblyTree),
    [builtAssemblyTree],
  );

  return (
    <group onPointerDown={onPointerDown}>
      {primitiveGeometries.map((primitiveGeometry) => (
        <AssemblyPrimitiveMesh
          key={primitiveGeometry.componentPath.join("/")}
          primitiveGeometry={primitiveGeometry}
          renderState={renderState}
          sceneViewMode={sceneViewMode}
        />
      ))}
      {showFrontOutlineLines ? <AssemblyFrontOutlineLines builtAssemblyTree={builtAssemblyTree} /> : null}
    </group>
  );
});
