"use client";

import { memo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { degreesToRadians, degreesToUserFacingZRadians } from "@/core/geometry/rotationTypes";
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
  return (
    <group onPointerDown={onPointerDown}>
      <BuiltAssemblyTreeGroup
        builtAssemblyTree={builtAssemblyTree}
        isRootAssembly
        renderState={renderState}
        sceneViewMode={sceneViewMode}
      />
      {showFrontOutlineLines ? <AssemblyFrontOutlineLines builtAssemblyTree={builtAssemblyTree} /> : null}
    </group>
  );
});

type BuiltAssemblyTreeGroupProps = Readonly<{
  builtAssemblyTree: BuiltAssemblyTree;
  isRootAssembly: boolean;
  renderState: "default" | "candidate";
  sceneViewMode: SceneViewMode;
}>;

function BuiltAssemblyTreeGroup({
  builtAssemblyTree,
  isRootAssembly,
  renderState,
  sceneViewMode,
}: BuiltAssemblyTreeGroupProps) {
  const positionInches = isRootAssembly
    ? builtAssemblyTree.worldPositionInches
    : builtAssemblyTree.localPositionInches;
  const rotationDegrees = isRootAssembly
    ? {
        xDegrees: 0,
        yDegrees: 0,
        zDegrees: builtAssemblyTree.rotationDegrees.zDegrees,
      }
    : builtAssemblyTree.localRotationDegrees;

  return (
    <group
      position={[
        positionInches.xInches,
        positionInches.yInches,
        positionInches.zInches,
      ]}
      rotation={[
        degreesToRadians(rotationDegrees.xDegrees),
        degreesToRadians(rotationDegrees.yDegrees),
        degreesToUserFacingZRadians(rotationDegrees.zDegrees),
      ]}
    >
      {builtAssemblyTree.primitiveGeometries.map((primitiveGeometry) => (
        <AssemblyPrimitiveMesh
          key={primitiveGeometry.componentPath.join("/")}
          primitiveGeometry={primitiveGeometry}
          renderState={renderState}
          sceneViewMode={sceneViewMode}
        />
      ))}
      {builtAssemblyTree.childAssemblies.map((childAssembly) => (
        <BuiltAssemblyTreeGroup
          key={childAssembly.componentPath.join("/")}
          builtAssemblyTree={childAssembly}
          isRootAssembly={false}
          renderState={renderState}
          sceneViewMode={sceneViewMode}
        />
      ))}
    </group>
  );
}
