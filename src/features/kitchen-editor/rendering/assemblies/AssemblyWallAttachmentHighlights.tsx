"use client";

import { Line } from "@react-three/drei";
import type { AssemblyWallAttachmentHighlight } from "@/engine/assemblies/placement/assemblyPlacementTypes";

const ASSEMBLY_WALL_ATTACHMENT_HIGHLIGHT_Z_INCHES = 6.2;
const ASSEMBLY_WALL_ATTACHMENT_HIGHLIGHT_RENDER_ORDER = 118;
const ASSEMBLY_WALL_ATTACHMENT_HIGHLIGHT_STROKE = "#0ea5e9";

export function AssemblyWallAttachmentHighlights({
  highlights,
}: Readonly<{
  highlights: readonly AssemblyWallAttachmentHighlight[];
}>) {
  return (
    <group>
      {highlights.map((highlight) => (
        <Line
          key={highlight.id}
          points={[
            [highlight.startPointInches.xInches, highlight.startPointInches.yInches, ASSEMBLY_WALL_ATTACHMENT_HIGHLIGHT_Z_INCHES],
            [highlight.endPointInches.xInches, highlight.endPointInches.yInches, ASSEMBLY_WALL_ATTACHMENT_HIGHLIGHT_Z_INCHES],
          ]}
          color={ASSEMBLY_WALL_ATTACHMENT_HIGHLIGHT_STROKE}
          lineWidth={3}
          depthTest={false}
          renderOrder={ASSEMBLY_WALL_ATTACHMENT_HIGHLIGHT_RENDER_ORDER}
        />
      ))}
    </group>
  );
}
