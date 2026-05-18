import type { CabinetElement, CabinetImage } from "../types";
import { getDefaultBottomDrawerProductLayout } from "../catalogHelpers";
import { getOvenCabinetHeightSegments } from "../specialCabinetHelpers";
import { renderBlindCabinetElevationFront } from "./blindCabinetElevationFront";

export function ElevationBaseCabinetDetails({
  cabinet,
  image,
  x,
  y,
  width,
  height,
  inset: _inset,
  innerX,
  innerY,
  innerWidth,
  innerHeight,
  innerStroke,
  handleStroke,
  handleTop,
  handleHeight,
  singleHandleX,
}: {
  cabinet?: CabinetElement;
  image: CabinetImage;
  x: number;
  y: number;
  width: number;
  height: number;
  inset: number;
  innerX: number;
  innerY: number;
  innerWidth: number;
  innerHeight: number;
  innerStroke: string;
  handleStroke: string;
  handleTop: number;
  handleHeight: number;
  singleHandleX: number;
}) {
  const doorDividerX = x + width / 2;
  const handleOffsetFromCenter = Math.max(6, Math.min(16, width * 0.08));
  const leftHandleX = doorDividerX - handleOffsetFromCenter;
  const rightHandleX = doorDividerX + handleOffsetFromCenter;
  const drawerHandleWidth = Math.max(12, Math.min(34, width * 0.26));
  const drawerHandleX1 = x + width / 2 - drawerHandleWidth / 2;
  const drawerHandleX2 = x + width / 2 + drawerHandleWidth / 2;
  const panelFill = "#fafaf7";
  const panelStrokeWidth = 1.5;
  const panelGap = Math.max(2, Math.min(6, innerWidth * 0.04));

  const renderDoubleDoorLowerSection = (topY: number, lowerHeight: number) => {
    const leftPanelWidth = Math.max(0, innerWidth / 2 - panelGap / 2);
    const rightPanelX = innerX + innerWidth / 2 + panelGap / 2;
    return (
      <>
        <rect
          x={innerX}
          y={topY}
          width={leftPanelWidth}
          height={lowerHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={rightPanelX}
          y={topY}
          width={leftPanelWidth}
          height={lowerHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={doorDividerX}
          y1={topY}
          x2={doorDividerX}
          y2={topY + lowerHeight}
          stroke={innerStroke}
          strokeWidth="1.35"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={leftHandleX}
          y1={topY + lowerHeight * 0.3}
          x2={leftHandleX}
          y2={topY + lowerHeight * 0.3 + Math.min(handleHeight, lowerHeight * 0.42)}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={rightHandleX}
          y1={topY + lowerHeight * 0.3}
          x2={rightHandleX}
          y2={topY + lowerHeight * 0.3 + Math.min(handleHeight, lowerHeight * 0.42)}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </>
    );
  };

  const renderSinkBaseFront = (variant: "standard" | "farm") => {
    const topSectionHeight = innerHeight * 0.24;
    const lowerTop = innerY + topSectionHeight;
    const lowerHeight = innerHeight - topSectionHeight;
    const apronInsetX = Math.max(4, innerWidth * 0.09);
    const apronX = innerX + apronInsetX;
    const apronWidth = innerWidth - apronInsetX * 2;
    const apronHeight = Math.max(0, topSectionHeight * 0.86);
    const apronY = innerY + Math.max(1.5, topSectionHeight * 0.06);

    return (
      <g>
        {variant === "farm" ? (
          <path
            d={`M ${apronX} ${apronY} L ${apronX + apronWidth} ${apronY} L ${apronX + apronWidth} ${apronY + apronHeight * 0.72} Q ${innerX + innerWidth / 2} ${apronY + apronHeight} ${apronX} ${apronY + apronHeight * 0.72} Z`}
            fill="#f8fafc"
            stroke={innerStroke}
            strokeWidth={panelStrokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <rect
            x={innerX}
            y={innerY}
            width={innerWidth}
            height={topSectionHeight}
            fill={panelFill}
            stroke={innerStroke}
            strokeWidth={panelStrokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {renderDoubleDoorLowerSection(lowerTop, lowerHeight)}
      </g>
    );
  };

  const renderFullHeightSingleFront = (showBins = false) => (
    <g>
      <rect
        x={innerX}
        y={innerY}
        width={innerWidth}
        height={innerHeight}
        fill={panelFill}
        stroke={innerStroke}
        strokeWidth={panelStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      {showBins && (
        <>
          {[0.3, 0.7].map((ratio) => (
            <rect
              key={`trash-bin-${ratio}`}
              x={innerX + innerWidth * (ratio - 0.14)}
              y={innerY + innerHeight * 0.26}
              width={innerWidth * 0.22}
              height={innerHeight * 0.34}
              rx="2"
              fill="none"
              stroke={innerStroke}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </>
      )}
      <line
        x1={singleHandleX}
        y1={handleTop}
        x2={singleHandleX}
        y2={handleTop + handleHeight}
        stroke={handleStroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );

  if (image === "base-corner") {
    const returnSectionWidth = Math.max(12, Math.min(innerWidth * 0.24, 26));
    const mainSectionX = innerX + returnSectionWidth;
    const mainSectionWidth = Math.max(0, innerWidth - returnSectionWidth);
    const mainPanelInsetX = Math.max(4, mainSectionWidth * 0.05);
    const mainPanelInsetY = Math.max(4, innerHeight * 0.06);
    const mainPanelX = mainSectionX + mainPanelInsetX;
    const mainPanelY = innerY + mainPanelInsetY;
    const mainPanelWidth = Math.max(0, mainSectionWidth - mainPanelInsetX * 2);
    const mainPanelHeight = Math.max(0, innerHeight - mainPanelInsetY * 2);
    const returnPanelInsetX = Math.max(2.5, returnSectionWidth * 0.12);
    const returnPanelInsetY = Math.max(4, innerHeight * 0.08);
    const returnPanelX = innerX + returnPanelInsetX;
    const returnPanelY = innerY + returnPanelInsetY;
    const returnPanelWidth = Math.max(0, returnSectionWidth - returnPanelInsetX * 1.5);
    const returnPanelHeight = Math.max(0, innerHeight - returnPanelInsetY * 2);
    const mainDoorDividerX = mainPanelX + mainPanelWidth / 2;
    const leftDoorHandleX = mainDoorDividerX - Math.max(6, Math.min(13, mainPanelWidth * 0.11));
    const rightDoorHandleX = mainDoorDividerX + Math.max(6, Math.min(13, mainPanelWidth * 0.11));
    const seamY = innerY + Math.max(4, innerHeight * 0.1);
    const seamDrop = Math.max(5, Math.min(12, innerHeight * 0.14));
    const returnKnobR = Math.max(1.2, Math.min(2.2, width * 0.015));

    return (
      <g>
        <line
          x1={mainSectionX}
          y1={innerY}
          x2={mainSectionX}
          y2={innerY + innerHeight}
          stroke={innerStroke}
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={innerX + returnSectionWidth * 0.3}
          y1={seamY}
          x2={mainSectionX}
          y2={seamY + seamDrop}
          stroke={innerStroke}
          strokeWidth="1.15"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={returnPanelX}
          y={returnPanelY}
          width={returnPanelWidth}
          height={returnPanelHeight}
          fill="none"
          stroke={innerStroke}
          strokeWidth="1.15"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={returnPanelX + Math.max(3.5, returnPanelWidth * 0.2)}
          cy={returnPanelY + returnPanelHeight * 0.42}
          r={returnKnobR}
          fill={handleStroke}
        />
        <rect
          x={mainPanelX}
          y={mainPanelY}
          width={mainPanelWidth}
          height={mainPanelHeight}
          fill="none"
          stroke={innerStroke}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={mainDoorDividerX}
          y1={mainPanelY}
          x2={mainDoorDividerX}
          y2={mainPanelY + mainPanelHeight}
          stroke={innerStroke}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={leftDoorHandleX}
          y1={handleTop}
          x2={leftDoorHandleX}
          y2={handleTop + handleHeight}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={rightDoorHandleX}
          y1={handleTop}
          x2={rightDoorHandleX}
          y2={handleTop + handleHeight}
          stroke={handleStroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (image === "base-drawer") {
    return (
      <g>
        {Array.from({ length: 3 }, (_, index) => {
          const drawerY = innerY + (innerHeight * index) / 3;
          const drawerHeight = innerHeight / 3;
          const centerY = innerY + (innerHeight * (index + 0.5)) / 3;
          return (
            <g key={`elev-drawer-${index}`}>
              <rect
                x={innerX}
                y={drawerY}
                width={innerWidth}
                height={drawerHeight}
                fill={panelFill}
                stroke={innerStroke}
                strokeWidth={panelStrokeWidth}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={drawerHandleX1}
                y1={centerY}
                x2={drawerHandleX2}
                y2={centerY}
                stroke={handleStroke}
                strokeWidth="1.6"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
      </g>
    );
  }

  if (image === "base-sink-cabinet" || image === "base-farm-sink-cabinet") {
    return renderSinkBaseFront(image === "base-farm-sink-cabinet" ? "farm" : "standard");
  }

  if (image === "base-dishwasher") {
    const panelInset = Math.max(4, Math.min(8, width * 0.06));
    const panelX = innerX + panelInset;
    const panelY = innerY + panelInset;
    const panelWidth = innerWidth - panelInset * 2;
    const panelHeight = innerHeight - panelInset * 2;
    return (
      <g>
        <rect x={innerX} y={innerY} width={innerWidth} height={innerHeight} fill="#d1d5db" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <rect x={panelX} y={panelY} width={panelWidth} height={panelHeight} rx="2" fill="#e5e7eb" stroke="#94a3b8" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
        <rect x={panelX + panelWidth * 0.1} y={panelY + panelHeight * 0.08} width={panelWidth * 0.8} height={Math.max(4, panelHeight * 0.08)} rx="2" fill="#9ca3af" opacity="0.65" />
        <rect x={x} y={y + height * 0.88} width={width} height={height * 0.12} fill="#111827" opacity="0.9" />
      </g>
    );
  }

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
    const dispenserX = leftDoorX + doorWidth * 0.14;
    const dispenserY = panelY + topSectionHeight * 0.32;
    const dispenserWidth = doorWidth * 0.24;
    const dispenserHeight = topSectionHeight * 0.2;
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

  if (image === "base-range") {
    const controlBottom = innerY + innerHeight * 0.2;
    const ovenX = innerX + innerWidth * 0.12;
    const ovenY = innerY + innerHeight * 0.42;
    const ovenWidth = innerWidth * 0.76;
    const ovenHeight = innerHeight * 0.38;
    return (
      <g>
        <rect x={innerX} y={innerY} width={innerWidth} height={innerHeight} fill="#e5e7eb" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <line x1={innerX} y1={controlBottom} x2={innerX + innerWidth} y2={controlBottom} stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        {[0.18,0.34,0.5,0.66,0.82].map((ratio) => <circle key={`range-elev-knob-${ratio}`} cx={innerX + innerWidth * ratio} cy={innerY + innerHeight * 0.1} r={Math.max(1.5, innerWidth * 0.025)} fill={handleStroke} />)}
        <rect x={ovenX} y={ovenY} width={ovenWidth} height={ovenHeight} rx="2" fill="#111827" opacity="0.64" stroke="#64748b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1={ovenX + ovenWidth * 0.15} y1={ovenY - innerHeight * 0.08} x2={ovenX + ovenWidth * 0.85} y2={ovenY - innerHeight * 0.08} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <rect x={innerX + innerWidth * 0.08} y={innerY + innerHeight * 0.24} width={innerWidth * 0.84} height={innerHeight * 0.12} rx="3" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (image === "base-appliance") {
    return (
      <g>
        <rect x={innerX + innerWidth * 0.12} y={innerY + innerHeight * 0.22} width={innerWidth * 0.76} height={innerHeight * 0.42} fill="none" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <line x1={innerX + innerWidth * 0.18} y1={innerY + innerHeight * 0.14} x2={innerX + innerWidth * 0.82} y2={innerY + innerHeight * 0.14} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={x} y1={y + height * 0.78} x2={x + width} y2={y + height * 0.78} stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <circle cx={x + width / 2} cy={y + height * 0.88} r={Math.max(1.4, Math.min(3, width * 0.025))} fill="#6b7280" />
      </g>
    );
  }

  if (image === "base-oven-bottom-drawer" || image === "base-microwave-bottom-drawer") {
    const {
      totalHeightInches,
      bottomDrawerHeightInches,
      productHeightInches,
      fillerHeightInches,
    } = getOvenCabinetHeightSegments(cabinet ?? { heightInches: 36 });
    const fillerHeight = totalHeightInches > 0 ? (fillerHeightInches / totalHeightInches) * innerHeight : 0;
    const drawerHeight = totalHeightInches > 0 ? (bottomDrawerHeightInches / totalHeightInches) * innerHeight : 0;
    const productHeight = Math.max(0, innerHeight - fillerHeight - drawerHeight);
    const fillerBottom = innerY + fillerHeight;
    const productY = fillerBottom;
    const drawerTop = innerY + innerHeight - drawerHeight;
    const productX = innerX;
    const productWidth = innerWidth;
    const productInnerX = productX + productWidth * 0.12;
    const drawerHandleWidth = Math.max(10, Math.min(28, innerWidth * 0.28));
    const productLayout =
      cabinet?.ovenCabinetProductLayout ??
      getDefaultBottomDrawerProductLayout(image) ??
      "none";

    const renderSingleOven = (ovenY: number, ovenHeight: number, key: string) => (
      <g key={key}>
        <rect x={productX} y={ovenY} width={productWidth} height={ovenHeight} rx={Math.max(2, Math.min(6, width * 0.03))} fill="#d1d5db" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <rect x={productInnerX} y={ovenY + ovenHeight * 0.16} width={productWidth * 0.76} height={ovenHeight * 0.6} rx={Math.max(2, Math.min(5, height * 0.02))} fill="#eceff3" stroke="#9ca3af" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1={productX + productWidth * 0.22} y1={ovenY + ovenHeight * 0.08} x2={productX + productWidth * 0.78} y2={ovenY + ovenHeight * 0.08} stroke="#6b7280" strokeWidth="1.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );

    const renderMicrowave = (microwaveY: number, microwaveHeight: number) => (
      <g>
        <rect x={productX} y={microwaveY} width={productWidth} height={microwaveHeight} rx="2" fill="#d1d5db" stroke={innerStroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <rect x={productX + productWidth * 0.08} y={microwaveY + microwaveHeight * 0.18} width={productWidth * 0.54} height={microwaveHeight * 0.46} rx="2" fill="#94a3b8" opacity="0.55" stroke="#64748b" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
        <rect x={productX + productWidth * 0.68} y={microwaveY + microwaveHeight * 0.12} width={productWidth * 0.18} height={microwaveHeight * 0.62} rx="2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      </g>
    );

    return (
      <g>
        {fillerHeight > 0 && (
          <rect x={innerX} y={innerY} width={innerWidth} height={fillerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        )}
        {productHeight > 0 && productLayout === "none" && (
          <rect
            x={productX}
            y={productY}
            width={productWidth}
            height={productHeight}
            fill="#111827"
            stroke={innerStroke}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {productHeight > 0 && productLayout === "single-oven" && renderSingleOven(productY, productHeight, "single-oven")}
        {productHeight > 0 && productLayout === "double-oven" && (
          <>
            {renderSingleOven(productY, productHeight / 2 - 1, "double-oven-top")}
            {renderSingleOven(productY + productHeight / 2 + 1, productHeight / 2 - 1, "double-oven-bottom")}
          </>
        )}
        {productHeight > 0 && productLayout === "single-microwave" && renderMicrowave(productY, productHeight)}
        {productHeight > 0 && productLayout === "microwave-oven" && (() => {
          const microwaveHeight = Math.min(productHeight * 0.42, productHeight * 0.48);
          const ovenHeight = Math.max(productHeight - microwaveHeight - 2, productHeight * 0.5);
          return (
            <>
              {renderMicrowave(productY, microwaveHeight)}
              {renderSingleOven(productY + microwaveHeight + 2, ovenHeight, "microwave-oven-bottom")}
            </>
          );
        })()}
        <rect x={innerX} y={drawerTop} width={innerWidth} height={drawerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        <line x1={x + width / 2 - drawerHandleWidth / 2} y1={drawerTop + drawerHeight * 0.5} x2={x + width / 2 + drawerHandleWidth / 2} y2={drawerTop + drawerHeight * 0.5} stroke={handleStroke} strokeWidth="1.55" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (image === "base-two-door-one-drawer" || image === "base-one-door-one-drawer" || image === "base-two-door-two-drawer") {
    const isSingleDoor = image === "base-one-door-one-drawer";
    const hasTwoDrawers = image === "base-two-door-two-drawer";
    const drawerBottom = innerY + innerHeight * 0.24;
    const drawerMidX = innerX + innerWidth / 2;
    const drawerHandleY = innerY + innerHeight * 0.12;
    const drawerHandleWidthLocal = Math.max(8, Math.min(24, innerWidth * 0.2));
    const doorTop = drawerBottom;
    const doorHeight = innerY + innerHeight - doorTop;
    const leftPanelWidth = Math.max(0, innerWidth / 2 - panelGap / 2);
    const rightPanelX = innerX + innerWidth / 2 + panelGap / 2;

    return (
      <g>
        {hasTwoDrawers ? (
          <>
            <rect x={innerX} y={innerY} width={innerWidth / 2} height={drawerBottom - innerY} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
            <rect x={drawerMidX} y={innerY} width={innerWidth / 2} height={drawerBottom - innerY} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
          </>
        ) : (
          <rect x={innerX} y={innerY} width={innerWidth} height={drawerBottom - innerY} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        )}
        {hasTwoDrawers ? (
          <>
            <line x1={innerX + innerWidth * 0.15} y1={drawerHandleY} x2={innerX + innerWidth * 0.35} y2={drawerHandleY} stroke={handleStroke} strokeWidth="1.45" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <line x1={innerX + innerWidth * 0.65} y1={drawerHandleY} x2={innerX + innerWidth * 0.85} y2={drawerHandleY} stroke={handleStroke} strokeWidth="1.45" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </>
        ) : (
          <line x1={x + width / 2 - drawerHandleWidthLocal / 2} y1={drawerHandleY} x2={x + width / 2 + drawerHandleWidthLocal / 2} y2={drawerHandleY} stroke={handleStroke} strokeWidth="1.45" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        )}
        {isSingleDoor ? (
          <rect x={innerX} y={doorTop} width={innerWidth} height={doorHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        ) : (
          <>
            <rect x={innerX} y={doorTop} width={leftPanelWidth} height={doorHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
            <rect x={rightPanelX} y={doorTop} width={leftPanelWidth} height={doorHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
          </>
        )}
        {!isSingleDoor && (
          <line x1={doorDividerX} y1={doorTop} x2={doorDividerX} y2={doorTop + doorHeight} stroke={innerStroke} strokeWidth="1.35" vectorEffect="non-scaling-stroke" />
        )}
        {isSingleDoor ? (
          <line x1={singleHandleX} y1={doorTop + doorHeight * 0.3} x2={singleHandleX} y2={doorTop + doorHeight * 0.3 + Math.min(handleHeight, doorHeight * 0.42)} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ) : (
          <>
            <line x1={leftHandleX} y1={doorTop + doorHeight * 0.3} x2={leftHandleX} y2={doorTop + doorHeight * 0.3 + Math.min(handleHeight, doorHeight * 0.42)} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <line x1={rightHandleX} y1={doorTop + doorHeight * 0.3} x2={rightHandleX} y2={doorTop + doorHeight * 0.3 + Math.min(handleHeight, doorHeight * 0.42)} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </g>
    );
  }

  if (image === "base-two-drawer" || image === "base-four-drawer") {
    const drawerCount = image === "base-two-drawer" ? 2 : 4;
    return (
      <g>
        {Array.from({ length: drawerCount }, (_, index) => {
          const drawerY = innerY + (innerHeight * index) / drawerCount;
          const drawerHeight = innerHeight / drawerCount;
          const centerY = innerY + (innerHeight * (index + 0.5)) / drawerCount;
          const localHandleWidth = Math.max(10, Math.min(28, innerWidth * 0.32));
          return (
            <g key={`elev-new-drawer-pull-${index}`}>
              <rect
                x={innerX}
                y={drawerY}
                width={innerWidth}
                height={drawerHeight}
                fill={panelFill}
                stroke={innerStroke}
                strokeWidth={panelStrokeWidth}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={x + width / 2 - localHandleWidth / 2}
                y1={centerY}
                x2={x + width / 2 + localHandleWidth / 2}
                y2={centerY}
                stroke={handleStroke}
                strokeWidth="1.55"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
      </g>
    );
  }

  if (image === "base-spice-rack") {
    return renderFullHeightSingleFront(false);
  }

  if (image === "base-trash-can") {
    return renderFullHeightSingleFront(true);
  }

  if (
    image === "base-blind-left-one-drawer" ||
    image === "base-blind-right-one-drawer" ||
    image === "base-blind-left" ||
    image === "base-blind-right"
  ) {
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

  if (image === "base" || image === "pantry-two-door") {
    const panelWidth = Math.max(0, innerWidth / 2 - panelGap / 2);
    return (
      <g>
        <rect
          x={innerX}
          y={innerY}
          width={panelWidth}
          height={innerHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={innerX + innerWidth / 2 + panelGap / 2}
          y={innerY}
          width={panelWidth}
          height={innerHeight}
          fill={panelFill}
          stroke={innerStroke}
          strokeWidth={panelStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        <line x1={doorDividerX} y1={innerY} x2={doorDividerX} y2={innerY + innerHeight} stroke={innerStroke} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        <line x1={leftHandleX} y1={handleTop} x2={leftHandleX} y2={handleTop + handleHeight} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={rightHandleX} y1={handleTop} x2={rightHandleX} y2={handleTop + handleHeight} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  return (
    <g>
      <rect
        x={innerX}
        y={innerY}
        width={innerWidth}
        height={innerHeight}
        fill={panelFill}
        stroke={innerStroke}
        strokeWidth={panelStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <line x1={singleHandleX} y1={handleTop} x2={singleHandleX} y2={handleTop + handleHeight} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
}
