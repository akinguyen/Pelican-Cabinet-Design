import { getBlindCabinetSide, getBlindCabinetWidthSegments } from "../blindCabinetHelpers";
import { pixelsToInches } from "../measurements";
import type { CabinetElement, CabinetImage } from "../types";

export function renderBlindCabinetElevationFront(params: {
  cabinet?: CabinetElement;
  image: CabinetImage;
  innerX: number;
  innerY: number;
  innerWidth: number;
  innerHeight: number;
  innerStroke: string;
  handleStroke: string;
  handleHeight: number;
}) {
  const {
    cabinet,
    image,
    innerX,
    innerY,
    innerWidth,
    innerHeight,
    innerStroke,
    handleStroke,
    handleHeight,
  } = params;
  const panelFill = "#fafaf7";
  const panelStrokeWidth = 1.5;
  const widthScale = innerWidth / Math.max(1, cabinet?.width ? pixelsToInches(cabinet.width) : innerWidth);
  const blindWidths = cabinet
    ? getBlindCabinetWidthSegments(cabinet)
    : {
        widthInches: innerWidth,
        doorWidthInches: innerWidth * 0.36,
        fillerWidthInches: 3,
        blindWidthInches: innerWidth * 0.64,
        side: getBlindCabinetSide(image),
      };
  const side = blindWidths.side ?? "left";
  const doorWidth = blindWidths.doorWidthInches * widthScale;
  const fillerWidth = blindWidths.fillerWidthInches * widthScale;
  const blindWidth = Math.max(0, innerWidth - doorWidth - fillerWidth);

  if (side === "right") {
    const doorX = innerX;
    const fillerX = doorX + doorWidth;
    const blindX = fillerX + fillerWidth;
    const doorHandleX = doorX + Math.max(7, doorWidth * 0.16);
    return (
      <g>
        <rect x={blindX} y={innerY} width={blindWidth} height={innerHeight} fill="#111827" stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        <rect x={fillerX} y={innerY} width={fillerWidth} height={innerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        <rect x={doorX} y={innerY} width={doorWidth} height={innerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
        <line x1={doorHandleX} y1={innerY + innerHeight * 0.28} x2={doorHandleX} y2={innerY + innerHeight * 0.28 + Math.min(handleHeight, innerHeight * 0.42)} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  const blindX = innerX;
  const fillerX = blindX + blindWidth;
  const doorX = fillerX + fillerWidth;
  const doorHandleX = doorX + doorWidth - Math.max(7, doorWidth * 0.16);
  return (
    <g>
      <rect x={blindX} y={innerY} width={blindWidth} height={innerHeight} fill="#111827" stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
      <rect x={fillerX} y={innerY} width={fillerWidth} height={innerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
      <rect x={doorX} y={innerY} width={doorWidth} height={innerHeight} fill={panelFill} stroke={innerStroke} strokeWidth={panelStrokeWidth} vectorEffect="non-scaling-stroke" />
      <line x1={doorHandleX} y1={innerY + innerHeight * 0.28} x2={doorHandleX} y2={innerY + innerHeight * 0.28 + Math.min(handleHeight, innerHeight * 0.42)} stroke={handleStroke} strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
}
