export function ElevationPeninWallFace({
  x,
  y,
  width,
  height,
  selected = false,
  className,
  onPointerDown,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
  className?: string;
  onPointerDown?: (event: React.PointerEvent<SVGGElement>) => void;
}) {
  const inset = Math.max(7, Math.min(14, Math.min(width, height) * 0.12));
  const stroke = selected ? "#22bfd6" : "#111827";
  const strokeWidth = selected ? 3 : 2.25;
  return (
    <g className={className} onPointerDown={onPointerDown}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#f1ede4"
        stroke={stroke}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <rect
        x={x + inset}
        y={y + inset}
        width={Math.max(0, width - inset * 2)}
        height={Math.max(0, height - inset * 2)}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
