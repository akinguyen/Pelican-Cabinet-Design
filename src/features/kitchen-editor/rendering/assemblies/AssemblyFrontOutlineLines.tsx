"use client";

import { memo, useMemo } from "react";
import { Line } from "@react-three/drei";
import { buildAssemblyFrontOutlineLines } from "@/engine/assemblies/front-outline/assemblyFrontOutlineLines";
import type { BuiltAssemblyTree } from "@/engine/assemblies/assemblyTreeBuilder";

const FRONT_OUTLINE_LINE_COLOR_HEX = "#111827";
const FRONT_OUTLINE_LINE_WIDTH_PIXELS = 1.75;

type AssemblyFrontOutlineLinesProps = Readonly<{
  builtAssemblyTree: BuiltAssemblyTree;
}>;

export const AssemblyFrontOutlineLines = memo(function AssemblyFrontOutlineLines({ builtAssemblyTree }: AssemblyFrontOutlineLinesProps) {
  const frontOutlineLines = useMemo(
    () => buildAssemblyFrontOutlineLines(builtAssemblyTree),
    [builtAssemblyTree],
  );

  if (frontOutlineLines.length === 0) {
    return null;
  }

  return (
    <group>
      {frontOutlineLines.map((frontOutlineLine) => (
        <Line
          key={frontOutlineLine.id}
          points={[
            [
              frontOutlineLine.startPointInches.xInches,
              frontOutlineLine.startPointInches.yInches,
              frontOutlineLine.startPointInches.zInches,
            ],
            [
              frontOutlineLine.endPointInches.xInches,
              frontOutlineLine.endPointInches.yInches,
              frontOutlineLine.endPointInches.zInches,
            ],
          ]}
          color={FRONT_OUTLINE_LINE_COLOR_HEX}
          lineWidth={FRONT_OUTLINE_LINE_WIDTH_PIXELS}
          depthTest
        />
      ))}
    </group>
  );
});
