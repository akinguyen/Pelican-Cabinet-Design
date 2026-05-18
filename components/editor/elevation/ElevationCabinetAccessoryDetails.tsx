import type { ReactNode } from "react";
import { ElevationSinkFixture } from "./ElevationSinkFixture";
import type { CabinetElement } from "../types";

export function ElevationCabinetAccessoryDetails({
  cabinet,
  x,
  y,
  width,
  height,
  innerStroke,
  handleStroke,
  frontControlBlockHeight = 0,
}: {
  cabinet: CabinetElement;
  x: number;
  y: number;
  width: number;
  height: number;
  innerStroke: string;
  handleStroke: string;
  frontControlBlockHeight?: number;
}) {
  const children: ReactNode[] = [];

  if (cabinet.sinkFixture) {
    children.push(
      <ElevationSinkFixture
        key="elevation-sink-addon"
        x={x}
        y={y}
        width={width}
        height={height}
        innerStroke={innerStroke}
        fixtureScale={0.82}
      />
    );
  }

  if (cabinet.cooktopFixture) {
    const cooktopHeight = Math.max(5, Math.min(12, height * 0.08));
    const cooktopX = x + width * 0.14;
    const cooktopWidth = width * 0.72;

    if (cabinet.cooktopFixture === "front") {
      const blockHeight = Math.max(frontControlBlockHeight, cooktopHeight * 1.6);
      const blockY = y - blockHeight;
      const knobY = blockY + blockHeight * 0.52;
      const knobWidth = Math.max(3, Math.min(6, cooktopWidth * 0.08));
      const knobHeight = Math.max(4, Math.min(7, blockHeight * 0.24));
      children.push(
        <g key="elevation-front-control-cooktop-addon">
          <rect
            x={x}
            y={blockY}
            width={width}
            height={blockHeight}
            fill="#d1d5db"
            stroke={innerStroke}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <rect
            x={cooktopX}
            y={blockY - cooktopHeight * 0.35}
            width={cooktopWidth}
            height={cooktopHeight}
            rx="2"
            fill="#e5e7eb"
            stroke={innerStroke}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          {[0.14, 0.38, 0.62, 0.86].map((ratio) => (
            <rect
              key={`front-cooktop-knob-${ratio}`}
              x={cooktopX + cooktopWidth * ratio - knobWidth / 2}
              y={knobY - knobHeight / 2}
              width={knobWidth}
              height={knobHeight}
              fill={handleStroke}
              rx="0.6"
            />
          ))}
        </g>
      );
    } else {
      const topBarY = y - cooktopHeight * 0.28;
      const topBarHeight = Math.max(3, cooktopHeight * 0.38);
      const tabWidth = Math.max(3.2, Math.min(6, width * 0.07));
      const tabHeight = Math.max(4, Math.min(8, cooktopHeight * 1.2));
      const tabTopY = topBarY - tabHeight * 0.72;
      children.push(
        <g key="elevation-surface-cooktop-addon">
          <rect
            x={x + width * 0.08}
            y={topBarY}
            width={width * 0.84}
            height={topBarHeight}
            fill="#cbd5e1"
            stroke={innerStroke}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          {[0.2, 0.36, 0.52, 0.68].map((ratio) => (
            <rect
              key={`surface-cooktop-elevation-tab-${ratio}`}
              x={x + width * ratio - tabWidth / 2}
              y={tabTopY}
              width={tabWidth}
              height={tabHeight}
              fill={handleStroke}
              rx="0.6"
            />
          ))}
        </g>
      );
    }
  }

  if (!children.length) return null;
  return <g>{children}</g>;
}
