export function ElevationDimensionLine({
  x1,
  y1,
  x2,
  y2,
  label,
  rotateText = false,
  textOffset = -10,
  extensionTop = 12,
  extensionBottom = 12,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  rotateText?: boolean;
  textOffset?: number;
  extensionTop?: number;
  extensionBottom?: number;
}) {
  const isVertical = Math.abs(x1 - x2) < Math.abs(y1 - y2);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const labelX = rotateText ? midX + textOffset : midX;
  const labelY = rotateText ? midY : midY + textOffset;
  const approxLabelWidth = Math.max(34, label.length * 12);
  const labelPaddingX = 8;
  const labelPaddingY = 5;
  const labelBoxWidth = approxLabelWidth + labelPaddingX * 2;
  const labelBoxHeight = rotateText ? 46 : 22 + labelPaddingY * 2;

  return (
    <g pointerEvents="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4f46e5" strokeWidth="1.6" />
      {isVertical ? (
        <>
          <line x1={x1 - extensionBottom / 2} y1={y1} x2={x1 + extensionBottom / 2} y2={y1} stroke="#4f46e5" strokeWidth="1.6" />
          <line x1={x2 - extensionTop / 2} y1={y2} x2={x2 + extensionTop / 2} y2={y2} stroke="#4f46e5" strokeWidth="1.6" />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - extensionBottom / 2} x2={x1} y2={y1 + extensionBottom / 2} stroke="#4f46e5" strokeWidth="1.6" />
          <line x1={x2} y1={y2 - extensionTop / 2} x2={x2} y2={y2 + extensionTop / 2} stroke="#4f46e5" strokeWidth="1.6" />
        </>
      )}
      <g transform={rotateText ? `rotate(-90 ${labelX} ${labelY})` : undefined}>
        <rect
          x={labelX - labelBoxWidth / 2}
          y={labelY - labelBoxHeight / 2}
          width={labelBoxWidth}
          height={labelBoxHeight}
          rx="4"
          fill="#ffffff"
          fillOpacity="0.96"
          pointerEvents="none"
        />
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-white text-[20px] font-semibold"
          stroke="#ffffff"
          strokeWidth="5"
          strokeLinejoin="round"
        >
          {label}
        </text>
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-indigo-700 text-[20px] font-semibold"
        >
          {label}
        </text>
      </g>
    </g>
  );
}
