import { CABINET_TOE_KICK_HEIGHT_INCHES } from "../constants";
import { clamp } from "../geometry";
import { cabinetHasToeKick } from "../catalogHelpers";
import {
  getDefaultCabinetImageForCategory,
  isAccessoryCabinetImage,
  isProductCabinetImage,
} from "../cabinetImageHelpers";
import type { CabinetCategory, CabinetElement, CabinetImage } from "../types";
import { ElevationBaseCabinetDetails } from "./ElevationBaseCabinetDetails";
import { ElevationWallCabinetDetails } from "./ElevationWallCabinetDetails";
import { ElevationCabinetAccessoryDetails } from "./ElevationCabinetAccessoryDetails";
import { getCabinetElevationSpec } from "./cabinetElevationSpec";

export function ElevationCabinetOnWall({
  x,
  y,
  width,
  height,
  category,
  image,
  selected = false,
  invalid = false,
  cabinet,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  category: CabinetCategory;
  image?: CabinetImage;
  selected?: boolean;
  invalid?: boolean;
  cabinet?: CabinetElement;
}) {
  const outerStroke = invalid ? "#ef4444" : selected ? "#22bfd6" : "#111827";
  const outerStrokeWidth = selected ? 3 : 2;
  const innerStroke = invalid ? "#fca5a5" : selected ? "#67e8f9" : "#64748b";
  const cabinetImage = image ?? getDefaultCabinetImageForCategory(category);
  if (isAccessoryCabinetImage(cabinetImage)) {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={invalid ? "#fee2e2" : selected ? "#d9f8fd" : "#fafaf7"}
          stroke={innerStroke}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  const frontControlExtraInches =
    cabinet &&
    category === "base" &&
    cabinet.cooktopFixture === "front" &&
    !isProductCabinetImage(cabinetImage)
      ? Math.max(1, cabinet.cooktopFrontHeightInches ?? 6)
      : 0;
  const baseHeightInches = cabinet
    ? Math.max(1, getCabinetElevationSpec(cabinet, category).heightInches)
    : 0;
  const toeKickHeight =
    cabinet && cabinetHasToeKick(cabinet) && baseHeightInches > 0
      ? clamp((CABINET_TOE_KICK_HEIGHT_INCHES / baseHeightInches) * height, 0, Math.max(0, height - 1))
      : 0;
  const frontControlBlockHeight = frontControlExtraInches > 0 && baseHeightInches > 0
    ? clamp((frontControlExtraInches / baseHeightInches) * height, 0, height * 0.8)
    : 0;
  const bodyY = y;
  const bodyHeight = Math.max(1, height - toeKickHeight);
  const inset = Math.min(10, Math.max(4, Math.min(width, bodyHeight) * 0.08));
  const handleStroke = "#111827";
  const handleHeight = Math.min(bodyHeight * 0.42, Math.max(18, bodyHeight * 0.22));
  const handleTop = bodyY + bodyHeight / 2 - handleHeight / 2;
  const singleHandleX = x + width - inset - Math.max(6, width * 0.08);
  const innerX = x;
  const innerY = bodyY;
  const innerWidth = width;
  const innerHeight = bodyHeight;

  return (
    <g>
      {(selected || invalid) && (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="none"
          stroke={outerStroke}
          strokeWidth={outerStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {category !== "wall" ? (
        <ElevationBaseCabinetDetails
          cabinet={cabinet}
          image={cabinetImage}
          x={x}
          y={bodyY}
          width={width}
          height={bodyHeight}
          inset={inset}
          innerX={innerX}
          innerY={innerY}
          innerWidth={innerWidth}
          innerHeight={innerHeight}
          innerStroke={innerStroke}
          handleStroke={handleStroke}
          handleTop={handleTop}
          handleHeight={handleHeight}
          singleHandleX={singleHandleX}
        />
      ) : (
        <ElevationWallCabinetDetails
          cabinet={cabinet}
          image={cabinetImage}
          x={x}
          y={bodyY}
          width={width}
          height={bodyHeight}
          innerX={innerX}
          innerY={innerY}
          innerWidth={innerWidth}
          innerHeight={innerHeight}
          innerStroke={innerStroke}
          handleStroke={handleStroke}
          handleTop={handleTop}
          handleHeight={handleHeight}
        />
      )}
      {toeKickHeight > 0 && (
        <rect
          x={x}
          y={y + height - toeKickHeight}
          width={width}
          height={toeKickHeight}
          fill="#f1ede4"
          stroke={innerStroke}
          strokeWidth="1.55"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {cabinet && (
        <ElevationCabinetAccessoryDetails
          cabinet={cabinet}
          x={x}
          y={bodyY}
          width={width}
          height={bodyHeight}
          innerStroke={innerStroke}
          handleStroke={handleStroke}
          frontControlBlockHeight={frontControlBlockHeight}
        />
      )}
    </g>
  );
}
