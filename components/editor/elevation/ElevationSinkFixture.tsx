export function ElevationSinkFixture({
  x,
  y,
  width,
  height,
  innerStroke,
  fixtureScale = 1,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  innerStroke: string;
  fixtureScale?: number;
}) {
  const sinkCenterX = x + width / 2;
  const sinkY = y - Math.max(1.4, Math.min(4.5, height * 0.035));
  const sinkRadiusX = Math.max(8, Math.min(width * 0.2, 18));
  const sinkRadiusY = Math.max(2.2, Math.min(height * 0.04, 4.8));

  // Keep the faucet shape consistent across every sink cabinet.
  // Tool card previews can pass a smaller scale so the faucet fits inside the card image.
  const clampedFixtureScale = Math.max(0.55, Math.min(1, fixtureScale));
  const faucetWidth = 11 * clampedFixtureScale;
  const faucetHeight = 24 * clampedFixtureScale;
  const floatingLegHeight = 10 * clampedFixtureScale;
  const archLift = 3.5 * clampedFixtureScale;
  const faucetStrokeWidth = 4.8 * clampedFixtureScale;
  const faucetHighlightStrokeWidth = Math.max(0.8, clampedFixtureScale);
  const rightX = sinkCenterX + 2.5;
  const rightBottomY = sinkY - sinkRadiusY * 0.98;
  const rightTopY = rightBottomY - faucetHeight;
  const leftX = rightX - faucetWidth;
  const leftTopY = rightTopY + 2.8;
  const leftBottomY = leftTopY + floatingLegHeight;
  const archControlY = rightTopY - archLift;

  return (
    <g>
      <ellipse
        cx={sinkCenterX}
        cy={sinkY}
        rx={sinkRadiusX}
        ry={sinkRadiusY}
        fill="#f8fafc"
        stroke={innerStroke}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${rightX} ${rightBottomY} L ${rightX} ${rightTopY} C ${rightX} ${archControlY} ${leftX} ${archControlY} ${leftX} ${leftTopY} L ${leftX} ${leftBottomY}`}
        fill="none"
        stroke="#111827"
        strokeWidth={faucetStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${rightX - 0.8} ${rightBottomY - 0.2} L ${rightX - 0.8} ${rightTopY + 1.5} C ${rightX - 0.8} ${archControlY + 1.2} ${leftX + 0.8} ${archControlY + 1.2} ${leftX + 0.8} ${leftTopY + 1}`}
        fill="none"
        stroke="#475579"
        strokeWidth={faucetHighlightStrokeWidth}
        strokeLinecap="round"
        opacity="0.28"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
