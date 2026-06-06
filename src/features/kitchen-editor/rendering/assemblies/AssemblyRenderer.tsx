"use client";

import { collectBuiltPrimitiveGeometries } from "@/engine/assemblies/assemblyBounds";
import type { BuiltAssemblyTree } from "@/engine/assemblies/assemblyTreeBuilder";
import { AssemblyFrontOutlineLines } from "./AssemblyFrontOutlineLines";
import { AssemblyPrimitiveMesh } from "./AssemblyPrimitiveMesh";

type AssemblyRendererProps = Readonly<{
  builtAssemblyTree: BuiltAssemblyTree;
  renderState: "default" | "candidate";
  showFrontOutlineLines: boolean;
}>;

export function AssemblyRenderer({ builtAssemblyTree, renderState, showFrontOutlineLines }: AssemblyRendererProps) {
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
      {showFrontOutlineLines ? <AssemblyFrontOutlineLines builtAssemblyTree={builtAssemblyTree} /> : null}
    </group>
  );
}
