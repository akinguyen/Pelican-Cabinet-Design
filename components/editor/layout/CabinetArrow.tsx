export function CabinetArrow({
  x,
  y,
  rotation,
}: {
  x: number;
  y: number;
  rotation: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation})`} opacity="0.78">
      <path
        d="M-11.5,-3 H2 V-6.7 L9.6,0 L2,6.7 V3 H-11.5 Z"
        fill="#94a3b8"
        stroke="#ffffff"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
