import type { Point } from "../types";

export function SelectionAreaBox({ start, end }: { start: Point; end: Point }) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="rgba(14, 165, 233, 0.10)"
      stroke="#0ea5e9"
      strokeWidth={1.5}
      strokeDasharray="6 5"
      vectorEffect="non-scaling-stroke"
      pointerEvents="none"
    />
  );
}
