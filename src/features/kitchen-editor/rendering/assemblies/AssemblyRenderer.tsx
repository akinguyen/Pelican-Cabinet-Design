"use client";

import { collectBuiltPrimitiveGeometries } from "@/engine/assemblies/assemblyBounds";
import type { BuiltAssemblyTree } from "@/engine/assemblies/assemblyTreeBuilder";
import { AssemblyPrimitiveMesh } from "./AssemblyPrimitiveMesh";

type AssemblyRendererProps = Readonly<{
  builtAssemblyTree: BuiltAssemblyTree;
  renderState: "default" | "candidate";
}>;

export function AssemblyRenderer({ builtAssemblyTree, renderState }: AssemblyRendererProps) {
  const primitiveGeometries = collectBuiltPrimitiveGeometries(builtAssemblyTree);

  return (
    <group>
      {primitiveGeometries.map((primitiveGeometry) => (
        <AssemblyPrimitiveMesh
          key={primitiveGeometry.componentPath.join("/")}
          primitiveGeometry={primitiveGeometry}
          renderState={renderState}
        />
      ))}
    </group>
  );
}
