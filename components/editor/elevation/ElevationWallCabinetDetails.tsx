import type { CabinetElement, CabinetImage } from "../types";
import { renderBlindCabinetElevationFront } from "./blindCabinetElevationFront";

export function ElevationWallCabinetDetails({
  cabinet,
  image,
  x,
  y,
  width,
  height,
  innerX,
  innerY,
  innerWidth,
  innerHeight,
  innerStroke,
  handleStroke,
  handleTop,
  handleHeight,
}: {
  cabinet?: CabinetElement;
  image: CabinetImage;
  x: number;
  y: number;
  width: number;
  height: number;
  innerX: number;
  innerY: number;
  innerWidth: number;
  innerHeight: number;
  innerStroke: string;
  handleStroke: string;
  handleTop: number;
  handleHeight: number;
}) {
  const handleOffsetFromCenter = Math.max(6, Math.min(16, width * 0.08));
  const leftCenterX = x + width / 2 - handleOffsetFromCenter;
  const rightCenterX = x + width / 2 + handleOffsetFromCenter;
  const panelFill = "#fafaf7";
  const panelGap = Math.max(2, Math.min(6, innerWidth * 0.04));
  const panelStrokeWidth = 1.5;

  const renderSingleDoorTopSection = (sectionHeight: number) => {
    const dividerY = innerY + sectionHeight;
    const panelInsetX = Math.max(4, innerWidth * 0.06);
    const panelInsetY = Math.max(3, sectionHeight * 0.12);
    const panelX = innerX + panelInsetX;
    const panelY = innerY + panelInsetY;
    const panelWidth = innerWidth - panelInsetX * 2;
    const panelHeight = Math.max(0, sectionHeight - panelInsetY * 2);
    const singleDoorHandleX = panelX + panelWidth - Math.max(6, panelWidth * 0.12);
    const singleDoorHandleHeight = Math.max(12, Math.min(24, panelHeight * 0.38));
    const singleDoorHandleTop = panelY + panelHeight * 0.42 - singleDoorHandleHeight / 2;

    return {
      dividerY,
      topSection: (
        <g>
          <line
            x1={innerX}
            y1={dividerY}
            x2={innerX + innerWidth}
            y2={dividerY}
            stroke={innerStroke}
            strokeWidth="1.35"
            vectorEffect="non-scaling-stroke"
          />
          <rect
            x={panelX}
            y={panelY}
            width={panelWidth}
            height={panelHeight}
            fill="none"
            stroke={innerStroke}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={singleDoorHandleX}
            y1={singleDoorHandleTop}
            x2={singleDoorHandleX}
            y2={singleDoorHandleTop + singleDoorHandleHeight}
            stroke={handleStroke}
            strokeWidth="1.8"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ),
    };
  };

  if (image === "base-refrigerator") {
    const bodyX = innerX;
    const bodyY = innerY;
    const bodyWidth = innerWidth;
    const bodyHeight = innerHeight;
    const panelInsetX = Math.max(2.2, bodyWidth * 0.035);
    const panelInsetY = Math.max(2.2, bodyHeight * 0.028);
    const panelX = bodyX + panelInsetX;
    const panelY = bodyY + panelInsetY;
    const panelWidth = bodyWidth - panelInsetX * 2;
    const panelHeight = bodyHeight - panelInsetY * 2;
    const topSectionHeight = panelHeight * 0.63;
    const freezerTopY = panelY + topSectionHeight;
    const centerGap = Math.max(1.5, panelWidth * 0.022);
    const doorWidth = panelWidth / 2 - centerGap / 2;
    const leftDoorX = panelX;
    const rightDoorX = panelX + doorWidth + centerGap;
    const handleTopY = panelY + topSectionHeight * 0.24;
    const handleBottomY = panelY + topSectionHeight * 0.72;
    const dispenserX = leftDoorX + doorWidth * 0.13;
    const dispenserY = panelY + topSectionHeight * 0.30;
    const dispenserWidth = doorWidth * 0.26;
    const dispenserHeight = topSectionHeight * 0.18;
    return (
      <g>
        <rect x={bodyX} y={bodyY} width={bodyWidth} height={bodyHeight} fill="#d1d5db" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <rect x={leftDoorX} y={panelY} width={doorWidth} height={topSectionHeight} fill="#d1d5db" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <rect x={rightDoorX} y={panelY} width={doorWidth} height={topSectionHeight} fill="#d1d5db" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <rect x={panelX} y={freezerTopY} width={panelWidth} height={panelHeight - topSectionHeight} fill="#d1d5db" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <rect x={dispenserX} y={dispenserY} width={dispenserWidth} height={dispenserHeight} rx="2" fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" opacity="0.55" vectorEffect="non-scaling-stroke" />
        <line x1={leftDoorX + doorWidth * 0.76} y1={handleTopY} x2={leftDoorX + doorWidth * 0.76} y2={handleBottomY} stroke={handleStroke} strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={rightDoorX + doorWidth * 0.24} y1={handleTopY} x2={rightDoorX + doorWidth * 0.24} y2={handleBottomY} stroke={handleStroke} strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={panelX} y1={freezerTopY} x2={panelX + panelWidth} y2={freezerTopY} stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (image === "wall-microwave") {
    const frameInset = Math.max(5, Math.min(10, width * 0.06));
    const frameX = innerX + frameInset;
    const frameY = innerY + frameInset;
    const frameWidth = innerWidth - frameInset * 2;
    const frameHeight = innerHeight - frameInset * 2;
    const controlWidth = Math.max(10, frameWidth * 0.18);
    return (
      <g>
        <rect x={frameX} y={frameY} width={frameWidth} height={frameHeight} rx="3" fill="#d1d5db" vectorEffect="non-scaling-stroke" />
        <rect x={frameX + frameWidth * 0.08} y={frameY + frameHeight * 0.18} width={frameWidth - controlWidth - frameWidth * 0.14} height={frameHeight * 0.64} rx="2" fill="#94a3b8" opacity="0.55" stroke="#64748b" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
        <rect x={frameX + frameWidth - controlWidth - 3} y={frameY + frameHeight * 0.12} width={controlWidth} height={frameHeight * 0.76} rx="2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        {Array.from({ length: 9 }).map((_, index) => {
          const col = index % 3;
          const row = Math.floor(index / 3);
          return <circle key={`mw-standalone-btn-${index}`} cx={frameX + frameWidth - controlWidth + 3 + col * (controlWidth / 4)} cy={frameY + frameHeight * 0.28 + row * (frameHeight * 0.13)} r="0.9" fill="#64748b" />;
        })}
      </g>
    );
  }

  if (image === "wall-double-oven") {
    const frameInset = Math.max(4, Math.min(8, width * 0.05));
    const frameX = innerX + frameInset;
    const frameY = innerY + frameInset;
    const frameWidth = innerWidth - frameInset * 2;
    const frameHeight = innerHeight - frameInset * 2;
    const ovenGap = Math.max(3, frameHeight * 0.045);
    const controlHeight = Math.max(5, frameHeight * 0.085);
    const ovenHeight = (frameHeight - ovenGap) / 2;

    const renderOven = (ovenY: number, index: number) => {
      const handleY = ovenY + controlHeight + Math.max(2, ovenHeight * 0.08);
      const windowY = ovenY + controlHeight + ovenHeight * 0.2;
      const windowHeight = ovenHeight * 0.42;
      return (
        <g key={`double-wall-oven-${index}`}>
          <rect
            x={frameX}
            y={ovenY}
            width={frameWidth}
            height={ovenHeight}
            rx="2"
            fill="#d1d5db"
            vectorEffect="non-scaling-stroke"
          />
          <rect
            x={frameX + frameWidth * 0.08}
            y={ovenY + controlHeight * 0.18}
            width={frameWidth * 0.84}
            height={controlHeight}
            rx="1.5"
            fill="#f8fafc"
            stroke="#94a3b8"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />
          {[0.18, 0.31, 0.69, 0.82].map((ratio) => (
            <circle
              key={`double-wall-oven-knob-${index}-${ratio}`}
              cx={frameX + frameWidth * ratio}
              cy={ovenY + controlHeight * 0.7}
              r={Math.max(1.1, frameWidth * 0.023)}
              fill={handleStroke}
            />
          ))}
          <rect
            x={frameX + frameWidth * 0.16}
            y={windowY}
            width={frameWidth * 0.68}
            height={windowHeight}
            rx="2"
            fill="#111827"
            opacity="0.72"
            stroke="#64748b"
            strokeWidth="0.9"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={frameX + frameWidth * 0.12}
            y1={handleY}
            x2={frameX + frameWidth * 0.88}
            y2={handleY}
            stroke={handleStroke}
            strokeWidth="1.7"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      );
    };

    return (
      <g>
        {renderOven(frameY, 0)}
        {renderOven(frameY + ovenHeight + ovenGap, 1)}
      </g>
    );
  }

  if (image === "wall-oven") {
    const frameInset = Math.max(4, Math.min(8, width * 0.05));
    const frameX = innerX + frameInset;
    const frameY = innerY + frameInset;
    const frameWidth = innerWidth - frameInset * 2;
    const frameHeight = innerHeight - frameInset * 2;
    const controlHeight = Math.max(5, frameHeight * 0.11);
    const handleY = frameY + controlHeight + Math.max(2, frameHeight * 0.1);
    const windowY = frameY + controlHeight + frameHeight * 0.22;
    const windowHeight = frameHeight * 0.34;
    return (
      <g>
        <rect
          x={frameX}
          y={frameY}
          width={frameWidth}
          height={frameHeight}
          rx="2"
          fill="#d1d5db"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={frameX + frameWidth * 0.08}
          y={frameY + controlHeight * 0.18}
          width={frameWidth * 0.84}
          height={controlHeight}
          rx="1.5"
          fill="#f8fafc"
          stroke="#94a3b8"
          strokeWidth="0.8"
          vectorEffect="non-scaling-stroke"
        />
        {[0.18, 0.31, 0.69, 0.82].map((ratio) => (
          <circle
            key={`single-wall-oven-knob-${ratio}`}
            cx={frameX + frameWidth * ratio}
            cy={frameY + controlHeight * 0.7}
            r={Math.max(1.1, frameWidth * 0.023)}
            fill={handleStroke}
          />
        ))}
        <rect
          x={frameX + frameWidth * 0.16}
          y={windowY}
          width={frameWidth * 0.68}
          height={windowHeight}
          rx="2"
          fill="#111827"
          opacity="0.72"
          stroke="#64748b"
          strokeWidth="0.9"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={frameX + frameWidth * 0.12}
          y1={handleY}
          x2={frameX + frameWidth * 0.88}
          y2={handleY}
          stroke={handleStroke}
          strokeWidth="1.7"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (image === "wall-hood") {
    const hoodTopWidth = innerWidth * 0.35;
    const hoodBottomWidth = innerWidth * 0.92;
    const hoodCenterX = innerX + innerWidth / 2;
    const chimneyY = innerY;
    const chimneyHeight = innerHeight * 0.42;
    const hoodY = innerY + chimneyHeight * 0.78;
    return (
      <g>
        <rect x={hoodCenterX - hoodTopWidth / 2} y={chimneyY} width={hoodTopWidth} height={chimneyHeight} fill="#e5e7eb" stroke={innerStroke} strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
        <path d={`M ${hoodCenterX - hoodTopWidth / 2} ${hoodY} L ${hoodCenterX + hoodTopWidth / 2} ${hoodY} L ${hoodCenterX + hoodBottomWidth / 2} ${innerY + innerHeight * 0.9} L ${hoodCenterX - hoodBottomWidth / 2} ${innerY + innerHeight * 0.9} Z`} fill="#d1d5db" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <rect x={hoodCenterX - hoodBottomWidth * 0.35} y={innerY + innerHeight * 0.86} width={hoodBottomWidth * 0.7} height={innerHeight * 0.04} rx="1.5" fill="#111827" opacity="0.85" />
      </g>
    );
  }

  if (image === "wall-blind-left" || image === "wall-blind-right") {
    return renderBlindCabinetElevationFront({
      cabinet,
      image,
      innerX,
      innerY,
      innerWidth,
      innerHeight,
      innerStroke,
      handleStroke,
      handleHeight,
    });
  }

  if (image === "pantry-one-door") {
    const panelX = innerX;
    const panelY = innerY;
    const panelWidth = innerWidth;
    const panelHeight = innerHeight;
    const singleDoorHandleX = panelX + panelWidth - Math.max(8, panelWidth * 0.14);

    return (
      <g>
        <rect
          x={panelX}
          y={panelY}
          width={panelWidth}
          height={panelHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={singleDoorHandleX}
          y1={panelY + panelHeight * 0.3}
          x2={singleDoorHandleX}
          y2={panelY + panelHeight * 0.3 + Math.min(handleHeight, panelHeight * 0.42)}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (image === "wall-one-door") {
    const panelX = innerX;
    const panelY = innerY;
    const panelWidth = innerWidth;
    const panelHeight = innerHeight;
    const singleDoorHandleX = panelX + panelWidth - Math.max(10, panelWidth * 0.16);

    return (
      <g>
        <rect
          x={panelX}
          y={panelY}
          width={panelWidth}
          height={panelHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={singleDoorHandleX}
          y1={panelY + panelHeight * 0.3}
          x2={singleDoorHandleX}
          y2={panelY + panelHeight * 0.3 + Math.min(handleHeight, panelHeight * 0.42)}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (image === "wall-microwave-one-door") {
    const topSectionHeight = innerHeight * 0.34;
    const { dividerY, topSection } = renderSingleDoorTopSection(topSectionHeight);
    const lowerSectionY = dividerY + Math.max(2, innerHeight * 0.03);
    const lowerSectionHeight = innerY + innerHeight - lowerSectionY - Math.max(2, innerHeight * 0.03);
    const microwaveInsetX = Math.max(4, innerWidth * 0.05);
    const microwaveX = innerX + microwaveInsetX;
    const microwaveWidth = innerWidth - microwaveInsetX * 2;
    const microwaveFrameHeight = Math.min(lowerSectionHeight * 0.8, microwaveWidth * 0.58);
    const microwaveFrameY = lowerSectionY + (lowerSectionHeight - microwaveFrameHeight) / 2;
    const doorWidth = microwaveWidth * 0.74;
    const controlWidth = microwaveWidth - doorWidth;
    const controlX = microwaveX + doorWidth;
    const glassInset = Math.max(2.8, microwaveWidth * 0.045);
    const glassX = microwaveX + glassInset;
    const glassY = microwaveFrameY + glassInset;
    const glassWidth = Math.max(0, doorWidth - glassInset * 1.55);
    const glassHeight = Math.max(0, microwaveFrameHeight - glassInset * 2);
    const keypadPaddingX = Math.max(2.1, controlWidth * 0.14);
    const keypadPaddingY = Math.max(2.4, microwaveFrameHeight * 0.09);
    const keypadX = controlX + keypadPaddingX;
    const keypadY = microwaveFrameY + keypadPaddingY;
    const keypadWidth = Math.max(0, controlWidth - keypadPaddingX * 2);
    const keypadHeight = Math.max(0, microwaveFrameHeight - keypadPaddingY * 2);
    const buttonCols = 3;
    const buttonRows = 4;
    const buttonGapX = Math.max(1.0, keypadWidth * 0.08);
    const buttonGapY = Math.max(1.2, keypadHeight * 0.07);
    const displayHeight = Math.max(3.2, keypadHeight * 0.16);
    const remainingButtonAreaHeight = Math.max(0, keypadHeight - displayHeight - buttonGapY * 1.4);
    const buttonWidth = Math.max(1.4, (keypadWidth - buttonGapX * (buttonCols - 1)) / buttonCols);
    const buttonHeight = Math.max(1.4, (remainingButtonAreaHeight - buttonGapY * (buttonRows - 1)) / buttonRows);

    return (
      <g>
        {topSection}
        <rect
          x={microwaveX}
          y={microwaveFrameY}
          width={microwaveWidth}
          height={microwaveFrameHeight}
          rx={Math.max(2, Math.min(4, width * 0.025))}
          fill="#d1d5db"
          stroke={innerStroke}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={glassX}
          y={glassY}
          width={glassWidth}
          height={glassHeight}
          rx={Math.max(1.6, Math.min(3.5, glassHeight * 0.08))}
          fill="#cad5df"
          stroke="#94a3b8"
          strokeWidth="0.95"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={glassX + glassWidth * 0.08}
          y={glassY + glassHeight * 0.12}
          width={glassWidth * 0.84}
          height={glassHeight * 0.76}
          rx={Math.max(1.4, Math.min(2.8, glassHeight * 0.06))}
          fill="#9aa7b5"
          opacity="0.42"
        />
        <line
          x1={controlX}
          y1={microwaveFrameY + 2}
          x2={controlX}
          y2={microwaveFrameY + microwaveFrameHeight - 2}
          stroke="#9ca3af"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={keypadX}
          y={keypadY}
          width={keypadWidth}
          height={displayHeight}
          rx="1.1"
          fill="#111827"
          opacity="0.86"
        />
        {Array.from({ length: buttonRows * buttonCols }).map((_, index) => {
          const column = index % buttonCols;
          const row = Math.floor(index / buttonCols);
          const buttonX = keypadX + column * (buttonWidth + buttonGapX);
          const buttonY = keypadY + displayHeight + buttonGapY * 1.4 + row * (buttonHeight + buttonGapY);
          return (
            <rect
              key={`mw-button-${index}`}
              x={buttonX}
              y={buttonY}
              width={buttonWidth}
              height={buttonHeight}
              rx="0.85"
              fill="#f8fafc"
              stroke="#9ca3af"
              strokeWidth="0.55"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </g>
    );
  }

  if (image === "wall-hood-one-door") {
    const topSectionHeight = innerHeight * 0.34;
    const { dividerY, topSection } = renderSingleDoorTopSection(topSectionHeight);
    const hoodTopY = dividerY + Math.max(1.5, innerHeight * 0.02);
    const hoodBottomY = y + height - 1;
    const hoodCenterX = x + width / 2;
    const topWidth = innerWidth * 0.44;
    const bottomWidth = width - 4;
    const topLeftX = hoodCenterX - topWidth / 2;
    const topRightX = hoodCenterX + topWidth / 2;
    const bottomLeftX = hoodCenterX - bottomWidth / 2;
    const bottomRightX = hoodCenterX + bottomWidth / 2;

    return (
      <g>
        {topSection}
        <path
          d={`M ${topLeftX} ${hoodTopY} L ${topRightX} ${hoodTopY} L ${bottomRightX} ${hoodBottomY} L ${bottomLeftX} ${hoodBottomY} Z`}
          fill="#d7dbe0"
          stroke={innerStroke}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  return (
    <g>
      <rect
        x={innerX}
        y={innerY}
        width={Math.max(0, innerWidth / 2 - panelGap / 2)}
        height={innerHeight}
        fill={panelFill}
        stroke={innerStroke}
        strokeWidth={panelStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <rect
        x={innerX + innerWidth / 2 + panelGap / 2}
        y={innerY}
        width={Math.max(0, innerWidth / 2 - panelGap / 2)}
        height={innerHeight}
        fill={panelFill}
        stroke={innerStroke}
        strokeWidth={panelStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={x + width / 2}
        y1={innerY}
        x2={x + width / 2}
        y2={innerY + innerHeight}
        stroke={innerStroke}
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={leftCenterX}
        y1={handleTop}
        x2={leftCenterX}
        y2={handleTop + handleHeight}
        stroke={handleStroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={rightCenterX}
        y1={handleTop}
        x2={rightCenterX}
        y2={handleTop + handleHeight}
        stroke={handleStroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
