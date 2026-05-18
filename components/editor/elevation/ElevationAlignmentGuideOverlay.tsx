import type { ElevationAlignmentGuide } from "../types";

export function ElevationAlignmentGuideOverlay({
  guide,
}: {
  guide: ElevationAlignmentGuide;
}) {
  const stroke = "#d946ef";

  return (
    <g pointerEvents="none">
      {guide.kind === "vertical" ? (
        <line
          x1={guide.x}
          y1={guide.y1}
          x2={guide.x}
          y2={guide.y2}
          stroke={stroke}
          strokeWidth="1.5"
          strokeDasharray="5 5"
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <line
          x1={guide.x1}
          y1={guide.y}
          x2={guide.x2}
          y2={guide.y}
          stroke={stroke}
          strokeWidth="1.5"
          strokeDasharray="5 5"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {guide.label && guide.labelX !== undefined && guide.labelY !== undefined && (
        <g>
          <rect
            x={guide.labelX - 22}
            y={guide.labelY - 13}
            width={44}
            height={26}
            rx="10"
            fill={stroke}
            opacity="0.95"
          />
          <text
            x={guide.labelX}
            y={guide.labelY}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-white text-[14px] font-bold"
          >
            {guide.label}
          </text>
        </g>
      )}
    </g>
  );
}
