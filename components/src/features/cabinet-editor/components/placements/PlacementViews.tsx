"use client";
import * as React from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ElevationPlacementOnWall, ElevationSinkFixture, getBestPlacementWallAttachment, getPlacementElevationCategory, getPlacementElevationItemsForWall, getPlacementElevationSpec, getPlacementTopAccessoryExtraHeightInches, getPlacementWallAttachments, getElevationWallAxis, getPeninWallVisibleSegment, getWallPlacementStackOverflowMessage, isLShapedCornerCabinet, wallsShareEndpoint } from "../elevation/ElevationPlanView";
import { SvgTextHalo } from "../walls/Walls";
import { L_SHAPED_CORNER_PLACEMENT_DISPLAY_IMAGE } from "../../constants/placementConstants";
import { GRID_SIZE } from "../../constants/editorConstants";
import { PLACEMENT_NOT_AGAINST_WALL_MESSAGE, PLACEMENT_OVERLAP_MESSAGE } from "../../constants/messages";
import { PENIN_WALL_THICKNESS, WALL_ATTACH_THRESHOLD, WALL_THICKNESS } from "../../constants/wallConstants";
import { useMeasurementDisplayUnit } from "../../context/MeasurementDisplayUnitContext";
import { getBlindCabinetSide, getBlindCabinetWidthSegments, isBlindCabinetImage, isBuiltInSinkCabinetImage } from "../../data/placementCatalog";
import { getPlacementCategoryForImage, getPlacementImage, isAccessoryPlacementImage, isElevationFloatingPlacement, isFillerAccessoryPlacementImage, isFloorStandingPlacement, isProductPlacementImage } from "../../engine/placementClassification";
import { add, placementShortestAngleDistance, clamp, degreesToRadians, describeArc, distance, dot, formatFeetInches, getAngleDegrees, inchesToPixels, midpoint, mul, normalize, normalizeDegrees, perp, pointInPolygon, pointOnSegment, pointToSegmentDistance, roundToQuarter, segmentsIntersect, sub, vectorLength } from "../../engine/geometry";
import { getWallSegmentBlackDotGeometry, isDetachedPanelWall, isThickWall } from "../../engine/wallEngine";
import type { PlacementCategory, PlacementDistanceMetric, PlacementEdgeSnapOptions, PlacementElement, PlacementElevationPairOverlap, PlacementImage, PlacementPreview, PlacementWallFacingResolution, PlacementWallSideGuideLine, MeasurementSide, OvenCabinetProductLayout, Point, Wall } from "../../types/editorTypes";

export function PlacementToolCard({
  title,
  subtitle,
  active,
  onClick,
  children,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-[150px] w-full flex-col items-center justify-center rounded-md border bg-white p-3 text-center transition hover:border-pelican-teal",
        active ? "border-pelican-navy ring-1 ring-pelican-navy" : "border-slate-200"
      )}
    >
      <div className="flex h-24 w-full items-center justify-center">{children}</div>
      <span className="mt-2 text-[13px] font-medium text-slate-900">{title}</span>
      <span className="mt-1 text-[11px] text-slate-500">{subtitle}</span>
    </button>
  );
}

export function SimpleBaseCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs>
        <linearGradient id="placementFaceGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f6f3ed" />
          <stop offset="100%" stopColor="#ded9cf" />
        </linearGradient>
      </defs>
      <polygon points="42,24 86,24 100,31 55,31" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.5" />
      <polygon points="86,24 100,31 100,86 86,78" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.5" />
      <rect x="42" y="31" width="44" height="50" fill="url(#placementFaceGradient)" stroke="#bfb8ad" strokeWidth="1.5" />
      <line x1="84" y1="31" x2="84" y2="80" stroke="#c7c1b8" strokeWidth="1.25" />
      <rect x="45" y="81" width="39" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
      <line x1="48" y1="22" x2="92" y2="22" stroke="#c6c1b8" strokeWidth="2" strokeLinecap="round" />
      <circle cx="82" cy="54" r="1.4" fill="#aaa49b" />
    </svg>
  );
}

export function SimpleWallCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs>
        <linearGradient id="wallPlacementFaceGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f6f3ed" />
          <stop offset="100%" stopColor="#ded9cf" />
        </linearGradient>
      </defs>
      <polygon points="46,26 84,26 96,32 58,32" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.4" />
      <polygon points="84,26 96,32 96,80 84,74" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.4" />
      <rect x="46" y="32" width="38" height="42" fill="url(#wallPlacementFaceGradient)" stroke="#bfb8ad" strokeWidth="1.4" />
      <line x1="65" y1="32" x2="65" y2="73" stroke="#c7c1b8" strokeWidth="1.15" />
      <line x1="49" y1="24" x2="88" y2="24" stroke="#c6c1b8" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="63" cy="54" r="1.2" fill="#aaa49b" />
      <circle cx="67" cy="54" r="1.2" fill="#aaa49b" />
    </svg>
  );
}

export function getPlacementPlanBodyFill(placementItem: Pick<PlacementElement, "image">, preview = false, invalid = false) {
  if (invalid) return "#fee2e2";
  if (preview) return "#d9f8fd";

  const image = getPlacementImage(placementItem);

  if (
    image === "base-dishwasher" ||
    image === "base-refrigerator" ||
    image === "wall-microwave" ||
    image === "wall-oven" ||
    image === "wall-double-oven"
  ) {
    return "#d1d5db";
  }

  if (image === "base-range" || image === "wall-hood") {
    return "#e5e7eb";
  }

  return "#f1ede4";
}

export function getPlacementCatalogPreviewFrame(image: PlacementImage, categoryOverride?: PlacementCategory) {
  const category = categoryOverride ?? getPlacementCategoryForImage(image);

  if (image === "accessory-wall-filler-horizontal") {
    return { x: 24, y: 52, width: 82, height: 14, category };
  }

  if (isAccessoryPlacementImage(image)) {
    return { x: 58, y: 24, width: 14, height: 62, category };
  }

  if (image === "base-refrigerator") {
    return { x: 28, y: 6, width: 74, height: 94, category };
  }

  if (category === "pantry") {
    const isSingleDoorPantry = image === "pantry-one-door";
    return { x: isSingleDoorPantry ? 42 : 28, y: 8, width: isSingleDoorPantry ? 46 : 74, height: 90, category };
  }

  if (image === "wall-hood") {
    return { x: 24, y: 22, width: 82, height: 64, category };
  }

  if (image === "wall-double-oven") {
    return { x: 36, y: 10, width: 58, height: 80, category };
  }

  if (image === "wall-microwave") {
    return { x: 34, y: 28, width: 62, height: 40, category };
  }

  if (image === "wall-oven") {
    return { x: 34, y: 24, width: 62, height: 48, category };
  }

  if (category === "wall") {
    return { x: 28, y: 28, width: 74, height: 52, category };
  }

  const narrowBaseImages: PlacementImage[] = [
    "base-one-door",
    "base-one-door-one-drawer",
    "base-two-drawer",
    "base-four-drawer",
    "base-spice-rack",
    "base-trash-can",
  ];
  const wideBaseImages: PlacementImage[] = [
    "base-refrigerator",
    "base-corner",
    "base-blind-left",
    "base-blind-right",
    "base-sink-cabinet",
    "base-farm-sink-cabinet",
  ];

  if (wideBaseImages.includes(image)) {
    return { x: 18, y: 28, width: 94, height: 50, category };
  }

  if (narrowBaseImages.includes(image)) {
    return { x: 42, y: 28, width: 46, height: 50, category };
  }

  return { x: 28, y: 28, width: 74, height: 50, category };
}

export function PlacementCatalogImage({
  image,
  category,
  widthInches,
  heightInches,
  blindDoorWidthInches,
  blindFillerWidthInches,
  ovenCabinetProductLayout,
  ovenCabinetProductHeightInches,
  ovenCabinetFillerHeightInches,
  ovenCabinetBottomDrawerHeightInches,
}: {
  image: PlacementImage;
  category?: PlacementCategory;
  widthInches?: number;
  heightInches?: number;
  blindDoorWidthInches?: number;
  blindFillerWidthInches?: number;
  ovenCabinetProductLayout?: OvenCabinetProductLayout;
  ovenCabinetProductHeightInches?: number;
  ovenCabinetFillerHeightInches?: number;
  ovenCabinetBottomDrawerHeightInches?: number;
}) {
  const frame = getPlacementCatalogPreviewFrame(image, category);

  if (image === "base-corner") {
    return <SimpleCornerBaseCabinetImage />;
  }

  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <ElevationPlacementOnWall
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        category={frame.category}
        image={image}
        placement={{
          id: `catalog-preview-${image}`,
          center: { x: 0, y: 0 },
          width: inchesToPixels(widthInches ?? (frame.width / GRID_SIZE) * 12),
          depth: inchesToPixels(24),
          rotation: 0,
          category: frame.category,
          image,
          heightInches,
          sinkFixture: isBuiltInSinkCabinetImage(image) ? true : undefined,
          blindDoorWidthInches,
          blindFillerWidthInches,
          ovenCabinetProductLayout,
          ovenCabinetProductHeightInches,
          ovenCabinetFillerHeightInches,
          ovenCabinetBottomDrawerHeightInches,
        }}
      />
    </svg>
  );
}

export function SimpleCornerBaseCabinetImage() {
  return (
    <div className="flex h-24 w-28 items-center justify-center">
      <img
        src={L_SHAPED_CORNER_PLACEMENT_DISPLAY_IMAGE}
        alt="L-Shaped Corner Cabinet"
        className="h-full w-full object-contain"
        draggable={false}
      />
    </div>
  );
}

export function SimpleOneDoorBaseCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id="oneDoorBaseGradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient></defs>
      <polygon points="50,18 80,18 94,25 63,25" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.25" />
      <polygon points="80,18 94,25 94,88 80,81" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.25" />
      <rect x="50" y="25" width="30" height="56" fill="url(#oneDoorBaseGradient)" stroke="#bfb8ad" strokeWidth="1.25" />
      <rect x="53" y="81" width="26" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
      <line x1="55" y1="16" x2="86" y2="16" stroke="#c6c1b8" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="76" cy="51" r="1.2" fill="#aaa49b" />
    </svg>
  );
}

export function SimpleSinkBaseCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id="sinkPlacementGradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient></defs>
      <polygon points="34,26 93,26 106,33 47,33" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.4" />
      <polygon points="93,26 106,33 106,85 93,78" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.4" />
      <rect x="34" y="33" width="59" height="45" fill="url(#sinkPlacementGradient)" stroke="#bfb8ad" strokeWidth="1.4" />
      <line x1="63.5" y1="33" x2="63.5" y2="78" stroke="#c7c1b8" strokeWidth="1.1" />
      <ellipse cx="64" cy="31" rx="21" ry="3.8" fill="#f7f7f4" stroke="#bfb8ad" strokeWidth="1" />
      <path d="M64 27 C64 16 75 16 75 27" fill="none" stroke="#bfb8ad" strokeWidth="2" strokeLinecap="round" />
      <circle cx="61" cy="52" r="1.2" fill="#aaa49b" /><circle cx="66" cy="52" r="1.2" fill="#aaa49b" />
      <rect x="38" y="78" width="52" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
    </svg>
  );
}

export function SimpleDrawerBaseCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id="drawerPlacementGradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient></defs>
      <polygon points="38,20 90,20 103,27 51,27" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.35" />
      <polygon points="90,20 103,27 103,86 90,79" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.35" />
      <rect x="38" y="27" width="52" height="52" fill="url(#drawerPlacementGradient)" stroke="#bfb8ad" strokeWidth="1.35" />
      <line x1="38" y1="44" x2="90" y2="44" stroke="#c7c1b8" strokeWidth="1.1" />
      <line x1="38" y1="61" x2="90" y2="61" stroke="#c7c1b8" strokeWidth="1.1" />
      <circle cx="64" cy="36" r="1.15" fill="#aaa49b" /><circle cx="64" cy="53" r="1.15" fill="#aaa49b" /><circle cx="64" cy="70" r="1.15" fill="#aaa49b" />
      <rect x="41" y="79" width="47" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
      <line x1="43" y1="18" x2="96" y2="18" stroke="#c6c1b8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SimpleApplianceBaseCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id="appliancePlacementGradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient></defs>
      <polygon points="42,18 86,18 100,25 55,25" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.3" />
      <polygon points="86,18 100,25 100,88 86,82" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.3" />
      <rect x="42" y="25" width="44" height="57" fill="url(#appliancePlacementGradient)" stroke="#bfb8ad" strokeWidth="1.3" />
      <rect x="46" y="41" width="36" height="25" fill="#f3f1ed" stroke="#bfb8ad" strokeWidth="1.25" />
      <line x1="49" y1="37" x2="79" y2="37" stroke="#bfb8ad" strokeWidth="2" strokeLinecap="round" />
      <rect x="48" y="27" width="4" height="9" fill="#e5e0d6" stroke="#bfb8ad" strokeWidth="0.7" /><rect x="76" y="27" width="4" height="9" fill="#e5e0d6" stroke="#bfb8ad" strokeWidth="0.7" />
      <line x1="42" y1="72" x2="86" y2="72" stroke="#c7c1b8" strokeWidth="1.1" />
      <circle cx="64" cy="77" r="1.2" fill="#aaa49b" />
      <rect x="45" y="82" width="39" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
    </svg>
  );
}

export function SimpleBaseCabinetWithDrawerImage({ doors, drawers }: { doors: 1 | 2; drawers: 1 | 2 }) {
  const drawerSplit = drawers === 2;
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id={`baseDrawerDoorGradient-${doors}-${drawers}`} x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient></defs>
      <polygon points={doors === 2 ? "34,22 92,22 106,29 48,29" : "50,22 82,22 96,29 64,29"} fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.35" />
      <polygon points={doors === 2 ? "92,22 106,29 106,86 92,79" : "82,22 96,29 96,86 82,79"} fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.35" />
      <rect x={doors === 2 ? 34 : 50} y="29" width={doors === 2 ? 58 : 32} height="50" fill={`url(#baseDrawerDoorGradient-${doors}-${drawers})`} stroke="#bfb8ad" strokeWidth="1.35" />
      <line x1={doors === 2 ? 34 : 50} y1="42" x2={doors === 2 ? 92 : 82} y2="42" stroke="#c7c1b8" strokeWidth="1.1" />
      {drawerSplit && <line x1="63" y1="29" x2="63" y2="42" stroke="#c7c1b8" strokeWidth="1.1" />}
      {doors === 2 && <line x1="63" y1="42" x2="63" y2="79" stroke="#c7c1b8" strokeWidth="1.1" />}
      {drawerSplit ? <><circle cx="50" cy="35" r="1.15" fill="#aaa49b" /><circle cx="76" cy="35" r="1.15" fill="#aaa49b" /></> : <circle cx={doors === 2 ? 63 : 66} cy="35" r="1.15" fill="#aaa49b" />}
      {doors === 2 ? <><circle cx="60" cy="58" r="1.15" fill="#aaa49b" /><circle cx="66" cy="58" r="1.15" fill="#aaa49b" /></> : <circle cx="78" cy="58" r="1.15" fill="#aaa49b" />}
      <rect x={doors === 2 ? 38 : 53} y="79" width={doors === 2 ? 51 : 27} height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
      <line x1={doors === 2 ? 40 : 55} y1="20" x2={doors === 2 ? 98 : 88} y2="20" stroke="#c6c1b8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SimpleDrawerStackCabinetImage({ drawers }: { drawers: 2 | 4 }) {
  const x = 50;
  const y = 28;
  const w = 32;
  const h = 54;
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id={`drawerStackGradient-${drawers}`} x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient></defs>
      <polygon points="50,21 82,21 96,28 64,28" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.35" />
      <polygon points="82,21 96,28 96,89 82,82" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.35" />
      <rect x={x} y={y} width={w} height={h} fill={`url(#drawerStackGradient-${drawers})`} stroke="#bfb8ad" strokeWidth="1.35" />
      {Array.from({ length: drawers - 1 }, (_, index) => <line key={index} x1={x} y1={y + (h * (index + 1)) / drawers} x2={x + w} y2={y + (h * (index + 1)) / drawers} stroke="#c7c1b8" strokeWidth="1.1" />)}
      {Array.from({ length: drawers }, (_, index) => <circle key={index} cx={x + w / 2} cy={y + (h * (index + 0.5)) / drawers} r="1.15" fill="#aaa49b" />)}
      <rect x="53" y="82" width="27" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
      <line x1="55" y1="19" x2="88" y2="19" stroke="#c6c1b8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SimpleSinkPanelCabinetImage({ doors }: { doors: 1 | 2 }) {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id={`sinkPanelGradient-${doors}`} x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient></defs>
      <polygon points={doors === 2 ? "34,26 93,26 106,33 47,33" : "48,26 84,26 98,33 62,33"} fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.35" />
      <polygon points={doors === 2 ? "93,26 106,33 106,86 93,79" : "84,26 98,33 98,86 84,79"} fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.35" />
      <rect x={doors === 2 ? 34 : 48} y="33" width={doors === 2 ? 59 : 36} height="46" fill={`url(#sinkPanelGradient-${doors})`} stroke="#bfb8ad" strokeWidth="1.35" />
      <line x1={doors === 2 ? 34 : 48} y1="45" x2={doors === 2 ? 93 : 84} y2="45" stroke="#c7c1b8" strokeWidth="1.1" />
      {doors === 2 && <line x1="63.5" y1="45" x2="63.5" y2="79" stroke="#c7c1b8" strokeWidth="1.1" />}
      <ellipse cx="64" cy="30" rx="21" ry="3.8" fill="#f7f7f4" stroke="#bfb8ad" strokeWidth="1" />
      <path d="M64 26 C64 15 75 15 75 26" fill="none" stroke="#bfb8ad" strokeWidth="2" strokeLinecap="round" />
      {doors === 2 ? <><circle cx="61" cy="60" r="1.2" fill="#aaa49b" /><circle cx="66" cy="60" r="1.2" fill="#aaa49b" /></> : <circle cx="80" cy="60" r="1.2" fill="#aaa49b" />}
      <rect x={doors === 2 ? 38 : 51} y="79" width={doors === 2 ? 52 : 31} height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
    </svg>
  );
}

export function SimpleBlindLeftOneDrawerBaseCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id="blindLeftOneDrawerGradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient><linearGradient id="blindLeftOneDrawerShelfGradient" x1="0" x2="1"><stop offset="0%" stopColor="#c2bdaf" /><stop offset="100%" stopColor="#efece4" /></linearGradient></defs>
      <polygon points="20,25 92,25 106,32 34,32" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.35" />
      <polygon points="92,25 106,32 106,84 92,78" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.35" />
      <rect x="20" y="32" width="34" height="46" fill="url(#blindLeftOneDrawerShelfGradient)" stroke="#bfb8ad" strokeWidth="1.35" />
      <line x1="20" y1="47" x2="54" y2="47" stroke="#f7f5ef" strokeWidth="2" /><line x1="20" y1="62" x2="54" y2="62" stroke="#f7f5ef" strokeWidth="2" />
      <rect x="54" y="32" width="38" height="46" fill="url(#blindLeftOneDrawerGradient)" stroke="#bfb8ad" strokeWidth="1.35" />
      <line x1="54" y1="44" x2="92" y2="44" stroke="#c7c1b8" strokeWidth="1.1" />
      <circle cx="73" cy="38" r="1.15" fill="#aaa49b" /><circle cx="88" cy="59" r="1.2" fill="#aaa49b" />
      <rect x="24" y="78" width="66" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
      <line x1="25" y1="23" x2="98" y2="23" stroke="#c6c1b8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SimpleBlindRightOneDrawerBaseCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id="blindRightOneDrawerGradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient><linearGradient id="blindRightOneDrawerShelfGradient" x1="0" x2="1"><stop offset="0%" stopColor="#c2bdaf" /><stop offset="100%" stopColor="#efece4" /></linearGradient></defs>
      <polygon points="20,25 92,25 106,32 34,32" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.35" />
      <polygon points="92,25 106,32 106,84 92,78" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.35" />
      <rect x="20" y="32" width="38" height="46" fill="url(#blindRightOneDrawerGradient)" stroke="#bfb8ad" strokeWidth="1.35" />
      <line x1="20" y1="44" x2="58" y2="44" stroke="#c7c1b8" strokeWidth="1.1" />
      <circle cx="39" cy="38" r="1.15" fill="#aaa49b" /><circle cx="24" cy="59" r="1.2" fill="#aaa49b" />
      <rect x="58" y="32" width="34" height="46" fill="url(#blindRightOneDrawerShelfGradient)" stroke="#bfb8ad" strokeWidth="1.35" />
      <line x1="58" y1="47" x2="92" y2="47" stroke="#f7f5ef" strokeWidth="2" /><line x1="58" y1="62" x2="92" y2="62" stroke="#f7f5ef" strokeWidth="2" />
      <rect x="24" y="78" width="66" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
      <line x1="25" y1="23" x2="98" y2="23" stroke="#c6c1b8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SimpleBlindLeftBaseCabinetImage() {
  return (
    <svg viewBox="0 0 130 110" className="h-24 w-28">
      <defs><linearGradient id="blindLeftGradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f6f3ed" /><stop offset="100%" stopColor="#ded9cf" /></linearGradient><linearGradient id="openShelfGradient" x1="0" x2="1"><stop offset="0%" stopColor="#c2bdaf" /><stop offset="100%" stopColor="#efece4" /></linearGradient></defs>
      <polygon points="20,25 92,25 106,32 34,32" fill="#ece8df" stroke="#c8c1b6" strokeWidth="1.35" />
      <polygon points="92,25 106,32 106,84 92,78" fill="#d9d4cb" stroke="#bfb8ad" strokeWidth="1.35" />
      <rect x="20" y="32" width="34" height="46" fill="url(#openShelfGradient)" stroke="#bfb8ad" strokeWidth="1.35" />
      <line x1="20" y1="47" x2="54" y2="47" stroke="#f7f5ef" strokeWidth="2" /><line x1="20" y1="62" x2="54" y2="62" stroke="#f7f5ef" strokeWidth="2" />
      <rect x="54" y="32" width="38" height="46" fill="url(#blindLeftGradient)" stroke="#bfb8ad" strokeWidth="1.35" />
      <circle cx="88" cy="52" r="1.2" fill="#aaa49b" />
      <rect x="24" y="78" width="66" height="7" fill="#d1cbc1" stroke="#bbb3a8" strokeWidth="1" />
      <line x1="25" y1="23" x2="98" y2="23" stroke="#c6c1b8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PlacementOnFloor({
  placementItem,
  walls,
  selected,
  dragPreview = null,
  showDegree = false,
  disabled,
  onSelect,
  onDragStart,
  onRotateStart,
}: {
  placementItem: PlacementElement;
  walls: Wall[];
  selected: boolean;
  dragPreview?: PlacementPreview | null;
  showDegree?: boolean;
  disabled?: boolean;
  onSelect: (event: React.PointerEvent<SVGGElement>) => void;
  onDragStart: (event: React.PointerEvent<SVGGElement>) => void;
  onRotateStart: (event: React.PointerEvent<SVGPathElement>) => void;
}) {
  const dragInvalid = Boolean(dragPreview && !dragPreview.isValid);
  const visiblePlacement: PlacementElement = dragPreview
    ? {
        ...placementItem,
        center: dragPreview.center,
        width: dragPreview.width,
        depth: dragPreview.depth,
        rotation: dragPreview.rotation,
        category: dragPreview.category,
        image: dragPreview.image ?? placementItem.image,
        wallId: dragPreview.wallId ?? placementItem.wallId,
      }
    : placementItem;

  const metrics = getPlacementWallDistanceMetrics(visiblePlacement, walls);
  const showDistanceGuides =
    selected && (!dragPreview || isPlacementAttachedToWallFace(visiblePlacement, walls));

  return (
    <g>
      {showDistanceGuides && <PlacementDistanceGuides metrics={metrics} />}
      <g
        onPointerDown={disabled ? undefined : selected ? onDragStart : onSelect}
        style={{ cursor: disabled ? "default" : selected ? "move" : "pointer" }}
      >
        <PlacementPlanShape placementItem={visiblePlacement} selected={selected} invalid={dragInvalid} />
      </g>
      {selected && (
        <PlacementMoveRotateControl
          placementItem={visiblePlacement}
          onRotateStart={dragPreview || disabled ? undefined : onRotateStart}
          invalid={dragInvalid}
          showDegree={showDegree}
        />
      )}
    </g>
  );
}

export function PlacementFloorInteractionTarget({
  placementItem,
  disabled,
  selected,
  onSelect,
  onDragStart,
}: {
  placementItem: PlacementElement;
  disabled?: boolean;
  selected: boolean;
  onSelect: (event: React.PointerEvent<SVGGElement>) => void;
  onDragStart: (event: React.PointerEvent<SVGGElement>) => void;
}) {
  const { center, width, depth, rotation } = placementItem;

  return (
    <g
      transform={`translate(${center.x} ${center.y}) rotate(${rotation})`}
      onPointerDown={disabled ? undefined : selected ? onDragStart : onSelect}
      style={{ cursor: disabled ? "default" : selected ? "move" : "pointer" }}
    >
      <rect
        x={-width / 2}
        y={-depth / 2}
        width={width}
        height={depth}
        fill="transparent"
        stroke="none"
        pointerEvents={disabled ? "none" : "all"}
      />
    </g>
  );
}

export function PlacementSelectionOverlay({
  placementItem,
  walls,
  dragPreview = null,
  showDegree = false,
  onRotateStart,
}: {
  placementItem: PlacementElement;
  walls: Wall[];
  dragPreview?: PlacementPreview | null;
  showDegree?: boolean;
  onRotateStart: (event: React.PointerEvent<SVGPathElement>) => void;
}) {
  const overlayPlacement: PlacementElement = dragPreview
    ? {
        ...placementItem,
        center: dragPreview.center,
        width: dragPreview.width,
        depth: dragPreview.depth,
        rotation: dragPreview.rotation,
        category: dragPreview.category,
        image: dragPreview.image ?? placementItem.image,
        wallId: dragPreview.wallId ?? placementItem.wallId,
      }
    : placementItem;
  const metrics = getPlacementWallDistanceMetrics(overlayPlacement, walls);
  const invalid = Boolean(dragPreview && !dragPreview.isValid);
  const showDistanceGuides = !dragPreview || isPlacementAttachedToWallFace(overlayPlacement, walls);

  return (
    <g>
      {showDistanceGuides && <PlacementDistanceGuides metrics={metrics} />}
      <PlacementPlanSelectionOverlay placementItem={overlayPlacement} invalid={invalid} />
      <PlacementMoveRotateControl
        placementItem={overlayPlacement}
        onRotateStart={onRotateStart}
        invalid={invalid}
        showDegree={showDegree}
      />
    </g>
  );
}

export function PlacementPlanSelectionOverlay({
  placementItem,
  invalid = false,
}: {
  placementItem: PlacementElement;
  invalid?: boolean;
}) {
  const { center, width, depth, rotation } = placementItem;
  const stroke = invalid ? "#ef4444" : "#22bfd6";
  const handleFill = invalid ? "#ef4444" : "#22bfd6";
  const image = getPlacementImage(placementItem);

  return (
    <g
      transform={`translate(${center.x} ${center.y}) rotate(${rotation})`}
      pointerEvents="none"
    >
      {image === "base-corner" ? (
        <path
          d={getBaseCornerPlanPath(width, depth)}
          fill="none"
          stroke={stroke}
          strokeWidth="2.6"
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <rect
          x={-width / 2}
          y={-depth / 2}
          width={width}
          height={depth}
          fill="none"
          stroke={stroke}
          strokeWidth="2.6"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {[
        { x: 0, y: -depth / 2 },
        { x: width / 2, y: 0 },
        { x: 0, y: depth / 2 },
        { x: -width / 2, y: 0 },
      ].map((handle, index) => (
        <circle
          key={`placement-selection-handle-${index}`}
          cx={handle.x}
          cy={handle.y}
          r="4"
          fill={handleFill}
          stroke="#ffffff"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

export function PlacementPreviewShape({ preview, walls }: { preview: PlacementPreview; walls: Wall[] }) {
  // Catalog cabinets must be attached to a wall. Hide the floor-plan preview
  // instead of showing a free-floating cabinet when the cursor is away from
  // every valid wall face.
  if (!preview.wallId && !preview.wall) return null;

  const previewPlacement: PlacementElement = {
    id: "cabinet-preview",
    center: preview.center,
    width: preview.width,
    depth: preview.depth,
    rotation: preview.rotation,
    category: preview.category,
    image: preview.image,
    wallId: preview.wallId,
    wallFace: preview.wallFace,
  };
  const metrics = getPlacementWallDistanceMetrics(previewPlacement, walls);
  const showDistanceGuides = isPlacementAttachedToWallFace(previewPlacement, walls);
  const showCollisionInvalidPreview = !preview.isValid;

  return (
    <g pointerEvents="none" opacity={1}>
      {showDistanceGuides && <PlacementDistanceGuides metrics={metrics} />}
      <PlacementPlanShape
        placementItem={previewPlacement}
        selected
        preview
        invalid={showCollisionInvalidPreview}
      />
      <PlacementMoveRotateControl
        placementItem={previewPlacement}
        preview
        invalid={showCollisionInvalidPreview}
      />
    </g>
  );
}

export function getBaseCornerPlanPath(width: number, depth: number, inset = 0) {
  const outerLeft = -width / 2;
  const outerRight = width / 2;
  const outerTop = -depth / 2;
  const outerBottom = depth / 2;
  const outerNotchX = outerLeft + width * 0.48;
  const outerNotchY = outerTop + depth * 0.54;

  if (inset <= 0) {
    return `M ${outerLeft} ${outerTop} L ${outerRight} ${outerTop} L ${outerRight} ${outerBottom} L ${outerNotchX} ${outerBottom} L ${outerNotchX} ${outerNotchY} L ${outerLeft} ${outerNotchY} Z`;
  }

  const left = outerLeft + inset;
  const right = outerRight - inset;
  const top = outerTop + inset;
  const bottom = outerBottom - inset;

  // Local base-corner geometry has a bottom-left notch before rotation.
  // For a consistent inset border, offset the concave notch edges toward the
  // remaining cabinet body: the vertical notch edge moves right, and the
  // horizontal notch edge moves up.
  const notchX = Math.min(right, Math.max(left, outerNotchX + inset));
  const notchY = Math.min(bottom, Math.max(top, outerNotchY - inset));

  return `M ${left} ${top} L ${right} ${top} L ${right} ${bottom} L ${notchX} ${bottom} L ${notchX} ${notchY} L ${left} ${notchY} Z`;
}

export function PlacementPlanShape({
  placementItem,
  selected = false,
  preview = false,
  invalid = false,
}: {
  placementItem: PlacementElement;
  selected?: boolean;
  preview?: boolean;
  invalid?: boolean;
}) {
  const { center, width, depth, rotation } = placementItem;
  const fill = getPlacementPlanBodyFill(placementItem, preview, invalid);
  const fillOpacity = 1;
  const detailOpacity = invalid ? 0.75 : 1;
  const stroke = invalid ? "#ef4444" : selected ? "#22bfd6" : "#475569";
  const innerStroke = invalid ? "#ef4444" : selected ? "#67e8f9" : "#64748b";
  const inset = Math.min(7, Math.max(3, Math.min(width, depth) * 0.16));
  const image = getPlacementImage(placementItem);
  const isLShapedCornerCabinet = image === "base-corner";
  const isAccessory = isAccessoryPlacementImage(image);
  const isBlindCabinet = isBlindCabinetImage(image);
  const selectionHandles = [
    { x: 0, y: -depth / 2 },
    { x: width / 2, y: 0 },
    { x: 0, y: depth / 2 },
    { x: -width / 2, y: 0 },
  ];

  if (isAccessory) {
    const accessoryStrokeWidth = selected ? 2.2 : 2;
    const fillerTabDepth = Math.min(Math.max(inchesToPixels(4), 5), Math.max(1, depth - 2));
    const showFillerTab = isFillerAccessoryPlacementImage(image) && depth > fillerTabDepth + 2;
    const fillerDividerY = depth / 2 - fillerTabDepth;

    return (
      <g transform={`translate(${center.x} ${center.y}) rotate(${rotation})`}>
        <rect
          x={-width / 2}
          y={-depth / 2}
          width={width}
          height={depth}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={stroke}
          strokeWidth={accessoryStrokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        {showFillerTab && (
          <line
            x1={-width / 2}
            y1={fillerDividerY}
            x2={width / 2}
            y2={fillerDividerY}
            stroke={stroke}
            strokeWidth={accessoryStrokeWidth}
            strokeOpacity={detailOpacity}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {selected && selectionHandles.map((handle, index) => (
          <circle
            key={`placement-handle-${index}`}
            cx={handle.x}
            cy={handle.y}
            r="4"
            fill="#22bfd6"
            stroke="#ffffff"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    );
  }

  return (
    <g transform={`translate(${center.x} ${center.y}) rotate(${rotation})`}>
      {isLShapedCornerCabinet ? (
        <>
          <path
            d={getBaseCornerPlanPath(width, depth)}
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={stroke}
            strokeWidth={selected ? 2.2 : 2}
            vectorEffect="non-scaling-stroke"
          />
          {width > inset * 2 && depth > inset * 2 && (
            <path
              d={getBaseCornerPlanPath(width, depth, inset)}
              fill="none"
              stroke={innerStroke}
              strokeWidth="1.2"
              strokeOpacity={detailOpacity}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </>
      ) : (
        <>
          <rect
            x={-width / 2}
            y={-depth / 2}
            width={width}
            height={depth}
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={stroke}
            strokeWidth={selected ? 2.2 : 2}
            vectorEffect="non-scaling-stroke"
          />
          {!isBlindCabinet && width > inset * 2 && depth > inset * 2 && (
            <rect
              x={-width / 2 + inset}
              y={-depth / 2 + inset}
              width={width - inset * 2}
              height={depth - inset * 2}
              fill="none"
              stroke={innerStroke}
              strokeWidth="1.2"
              strokeOpacity={detailOpacity}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </>
      )}
      {!isAccessory && (
        <>
          <PlacementPlanVariantDetails
            placementItem={placementItem}
            inset={inset}
            stroke={innerStroke}
            detailOpacity={detailOpacity}
          />
          <PlacementPlanAccessoryDetails
            placementItem={placementItem}
            inset={inset}
            stroke={innerStroke}
            detailOpacity={detailOpacity}
          />
        </>
      )}
      {!isAccessory && getPlacementPlanHandleTabRects(placementItem).map((tab, index) => (
        <rect
          key={`placement-plan-handle-tab-${index}`}
          x={tab.x}
          y={tab.y}
          width={tab.width}
          height={tab.height}
          rx="1.2"
          fill="#111827"
          fillOpacity={invalid ? 0.55 : 1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {selected && selectionHandles.map((handle, index) => (
        <circle
          key={`placement-handle-${index}`}
          cx={handle.x}
          cy={handle.y}
          r="4"
          fill="#22bfd6"
          stroke="#ffffff"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

export function PlacementMoveRotateControl({
  placementItem,
  onRotateStart,
  preview = false,
  invalid = false,
  showDegree = false,
}: {
  placementItem: PlacementElement;
  onRotateStart?: (event: React.PointerEvent<SVGPathElement>) => void;
  preview?: boolean;
  invalid?: boolean;
  showDegree?: boolean;
}) {
  const radius = Math.max(placementItem.width, placementItem.depth) / 2 + 20;
  const ringCenterRadius = radius - 7;
  const tickHalfLength = 2.7;
  const arcRadius = ringCenterRadius;
  const activeRotation = normalizeDegrees(placementItem.rotation);
  const rotateArcStart = -20;
  const rotateArcEnd = 20;
  const rotateColor = invalid ? "#ef4444" : preview ? "#35bed0" : "#06b6d4";
  const ringColor = invalid ? "#ef4444" : "#7eeaf4";
  const arrowMarkerId = preview ? "placementRotateArrowMarkerPreview" : "placementRotateArrowMarker";

  return (
    <g transform={`translate(${placementItem.center.x} ${placementItem.center.y})`} opacity={invalid ? 0.55 : 1}>
      <defs>
        <marker
          id={arrowMarkerId}
          viewBox="0 0 16 16"
          refX="10.4"
          refY="8"
          markerWidth="4.8"
          markerHeight="4.8"
          orient="auto-start-reverse"
          markerUnits="strokeWidth"
        >
          <path
            d="M 3.2 3.25 L 12.2 8 L 3.2 12.75 Q 5.65 8 3.2 3.25 Z"
            fill={rotateColor}
            stroke={rotateColor}
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      </defs>
      <circle
        r={radius - 7}
        fill="none"
        stroke={ringColor}
        strokeWidth="14"
        strokeOpacity="0.45"
        pointerEvents="none"
        vectorEffect="non-scaling-stroke"
      />
      {Array.from({ length: 8 }).map((_, index) => {
        const angle = (index * Math.PI) / 4;
        const x1 = Math.cos(angle) * (ringCenterRadius - tickHalfLength);
        const y1 = Math.sin(angle) * (ringCenterRadius - tickHalfLength);
        const x2 = Math.cos(angle) * (ringCenterRadius + tickHalfLength);
        const y2 = Math.sin(angle) * (ringCenterRadius + tickHalfLength);
        return (
          <line
            key={`placement-rotate-tick-${index}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#111827"
            strokeWidth="3"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        );
      })}
      <path
        d={describeArc(0, 0, arcRadius, rotateArcStart, rotateArcEnd)}
        transform={`rotate(${activeRotation})`}
        fill="none"
        stroke={rotateColor}
        strokeWidth="4.15"
        strokeLinecap="round"
        markerStart={`url(#${arrowMarkerId})`}
        markerEnd={`url(#${arrowMarkerId})`}
        vectorEffect="non-scaling-stroke"
        onPointerDown={onRotateStart}
        style={{ cursor: onRotateStart ? "grab" : "default", pointerEvents: onRotateStart ? "stroke" : "none" }}
      />
      {showDegree && !preview && (
        <ellipse cx="0" cy="0" rx="25" ry="18" fill="#64748b" opacity="0.92" pointerEvents="none" />
      )}
      {showDegree && !preview && (
        <text x="0" y="6" textAnchor="middle" className="fill-white text-[18px] font-bold" pointerEvents="none">
          {Math.round(activeRotation)}°
        </text>
      )}
    </g>
  );
}

export function PlacementArrow({ x, y, rotation }: { x: number; y: number; rotation: number }) {
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

export function PlacementDistanceGuides({ metrics }: { metrics: PlacementDistanceMetric[] }) {
  const measurementDisplayUnit = useMeasurementDisplayUnit();
  return (
    <g pointerEvents="none">
      {metrics.map((metric) => (
        <g key={metric.key}>
          <line
            x1={metric.start.x}
            y1={metric.start.y}
            x2={metric.end.x}
            y2={metric.end.y}
            stroke="#22bfd6"
            strokeWidth="1.5"
            strokeDasharray="6 8"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={metric.tickStart.x}
            y1={metric.tickStart.y}
            x2={metric.tickEnd.x}
            y2={metric.tickEnd.y}
            stroke="#22bfd6"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <SvgTextHalo
            x={metric.label.x}
            y={metric.label.y}
            text={formatFeetInches(metric.distance, measurementDisplayUnit)}
            className="fill-slate-700 text-[12px] font-bold"
          />
        </g>
      ))}
    </g>
  );
}

export function SelectedPlacementContextMenu({
  position,
  onDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  position: Point;
  onDelete: () => void;
  onDragStart: (
    event: React.PointerEvent<HTMLDivElement>,
    startPosition: Point
  ) => void;
  onDragMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDragEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <foreignObject
      x={position.x}
      y={position.y}
      width={82}
      height={54}
      pointerEvents="all"
      className="overflow-visible"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="flex h-[46px] w-[74px] overflow-hidden rounded-md border-2 border-[#00aee6] bg-white shadow-md">
        <div
          role="button"
          tabIndex={0}
          aria-label="Drag selected cabinet menu"
          className="flex w-6 shrink-0 cursor-grab items-center justify-center bg-[#0fb8d2] active:cursor-grabbing"
          onPointerDown={(event) => onDragStart(event, position)}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="flex flex-col gap-1">
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white" />
          </div>
        </div>

        <button
          type="button"
          aria-label="Delete selected cabinet"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          className="flex h-full w-11 items-center justify-center text-slate-500 hover:bg-slate-50"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </foreignObject>
  );
}

export function getPlacementPreview(
  rawPoint: Point,
  walls: Wall[],
  width: number,
  depth: number,
  rotation: number,
  placements: PlacementElement[] = [],
  excludedPlacementId?: string,
  placementCategory?: PlacementCategory,
  snapToPlacements = true,
  ignorePlacementCollisions = false,
  enforcePlacementRules = true,
  preferredWallId?: string,
  placementImage?: PlacementImage
): PlacementPreview {
  const freeCenter = rawPoint;
  const thickWalls = walls.filter(isThickWall);
  let resolvedRotation = normalizeDegrees(rotation);
  let stickyWallId: string | undefined;
  let wallSnappedCenter = preferredWallId
    ? getWallFaceSnappedPlacementCenterForWall(
        freeCenter,
        thickWalls,
        width,
        depth,
        resolvedRotation,
        preferredWallId,
        WALL_THICKNESS / 2 + 24
      )
    : null;

  if (wallSnappedCenter) {
    stickyWallId = preferredWallId;
  } else {
    wallSnappedCenter = getWallFaceSnappedPlacementCenter(
      freeCenter,
      thickWalls,
      width,
      depth,
      resolvedRotation
    );
  }

  // Convenience auto-facing should not unexpectedly switch wall sides at a corner.
  // When an existing cabinet already belongs to a wall, keep auto-facing tied to
  // that same wall while the cabinet is still close to it. The user can still
  // rotate manually, and dragging clearly away from that wall lets normal auto
  // facing choose another wall.
  const autoFacingRotation = getPlacementAutoFacingRotationForWallFace(
    wallSnappedCenter,
    thickWalls,
    width,
    depth,
    resolvedRotation,
    stickyWallId
  );
  if (autoFacingRotation !== null) {
    resolvedRotation = autoFacingRotation;
    wallSnappedCenter = stickyWallId
      ? getWallFaceSnappedPlacementCenterForWall(
          freeCenter,
          thickWalls,
          width,
          depth,
          resolvedRotation,
          stickyWallId,
          WALL_THICKNESS / 2 + 24
        ) ?? wallSnappedCenter
      : getWallFaceSnappedPlacementCenter(
          freeCenter,
          thickWalls,
          width,
          depth,
          resolvedRotation
        );
  }

  let center = snapToPlacements
    ? getAdjacentPlacementSnappedCenter(
        wallSnappedCenter,
        placements,
        width,
        depth,
        resolvedRotation,
        placementCategory,
        excludedPlacementId
      )
    : wallSnappedCenter;

  center = getWallOverlapResolvedPlacementCenter(
    center,
    thickWalls,
    width,
    depth,
    resolvedRotation,
    stickyWallId
  );

  const handleSafePlacement = resolvePlacementWithHandlesFacingOut({
    rawPoint: freeCenter,
    currentCenter: center,
    walls: thickWalls,
    width,
    depth,
    rotation: resolvedRotation,
    placementCategory,
    placementImage,
    preferredWallId: stickyWallId,
  });
  center = handleSafePlacement.center;
  resolvedRotation = handleSafePlacement.rotation;
  stickyWallId = handleSafePlacement.wallId ?? stickyWallId;

  if (snapToPlacements) {
    center = getCollisionSafeAdjacentPlacementSnappedCenter({
      center,
      walls: thickWalls,
      placements,
      width,
      depth,
      rotation: resolvedRotation,
      placementCategory,
      placementImage,
      excludedPlacementId,
      preferredWallId: stickyWallId,
    });
    center = getWallOverlapResolvedPlacementCenter(
      center,
      thickWalls,
      width,
      depth,
      resolvedRotation,
      stickyWallId
    );
  }

  const attachments = getPlacementWallAttachments(
    { center, width, depth, rotation: resolvedRotation },
    thickWalls,
    Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8)
  );
  const attachment = (stickyWallId
    ? attachments.find((candidate) => candidate.wall.id === stickyWallId)
    : null) ?? attachments[0] ?? null;
  const candidatePlacement: PlacementElement = {
    id: excludedPlacementId ?? "pending-cabinet",
    center,
    width,
    depth,
    rotation: resolvedRotation,
    category: placementCategory,
    image: placementImage,
    heightInches: placementCategory === "wall" ? 30 : placementCategory === "pantry" ? 84 : 36,
    distanceFromFloorInches: placementCategory === "wall" ? 54 : 0,
    wallId: attachment?.wall.id,
    wallFace: attachment?.wallFace,
  };
  const attachedWall = attachment?.wall ?? null;
  const preview = {
    center,
    width,
    depth,
    rotation: resolvedRotation,
    category: placementCategory,
    wall: attachedWall,
    wallId: attachedWall?.id,
    wallFace: attachment?.wallFace,
    isValid: true,
  };

  if (attachedWall && !candidatePlacement.wallId) {
    candidatePlacement.wallId = attachedWall.id;
  }

  const isAttachedToWall = Boolean(attachedWall || candidatePlacement.wallId);
  const intersectsWall = enforcePlacementRules
    ? !isAttachedToWall || placementIntersectsAnyWall(preview, walls) || placementHandleTabsIntersectAnyWall(candidatePlacement, walls)
    : false;
  const intersectsPlacement = enforcePlacementRules && !ignorePlacementCollisions
    ? Boolean(getPlacementRuleViolationMessage(candidatePlacement, placements, walls, excludedPlacementId, false))
    : false;
  let invalidReason: string | null | undefined;

  if (enforcePlacementRules) {
    invalidReason = getPlacementRuleViolationMessage(candidatePlacement, placements, walls, excludedPlacementId, true);
  }

  if (!intersectsWall && !intersectsPlacement && !invalidReason && enforcePlacementRules && placementCategory === "wall") {
    const candidatePlacements = [
      ...placements.filter((placementItem) => placementItem.id !== excludedPlacementId),
      candidatePlacement,
    ];
    invalidReason = getWallPlacementStackOverflowMessage(candidatePlacements, walls, candidatePlacement.id);
  }

  return {
    ...preview,
    isValid: !intersectsWall && !intersectsPlacement && !invalidReason,
    invalidReason: invalidReason ?? (intersectsWall
      ? isAttachedToWall
        ? "Cabinet cannot be placed through a wall."
        : PLACEMENT_NOT_AGAINST_WALL_MESSAGE
      : undefined),
  };
}

export function getWallOverlapResolvedPlacementCenter(
  center: Point,
  walls: Wall[],
  width: number,
  depth: number,
  rotation: number,
  preferredWallId?: string
): Point {
  const thickWalls = walls.filter(isThickWall);
  const collisionCandidate = { center, width, depth, rotation };
  if (!placementIntersectsAnyWall(collisionCandidate, thickWalls)) return center;

  const snappedCandidates: Point[] = [];
  const preferredSnap = preferredWallId
    ? getWallFaceSnappedPlacementCenterForWall(
        center,
        thickWalls,
        width,
        depth,
        rotation,
        preferredWallId,
        Number.POSITIVE_INFINITY
      )
    : null;

  if (preferredSnap) snappedCandidates.push(preferredSnap);

  snappedCandidates.push(
    getWallFaceSnappedPlacementCenter(
      center,
      thickWalls,
      width,
      depth,
      rotation,
      Number.POSITIVE_INFINITY
    )
  );

  for (const wall of thickWalls) {
    const wallSnap = getWallFaceSnappedPlacementCenterForWall(
      center,
      thickWalls,
      width,
      depth,
      rotation,
      wall.id,
      Number.POSITIVE_INFINITY
    );

    if (wallSnap) snappedCandidates.push(wallSnap);
  }

  let bestNonIntersecting: { center: Point; distance: number } | null = null;
  let bestFallback: { center: Point; distance: number } | null = null;

  for (const snappedCenter of snappedCandidates) {
    const moveDistance = distance(center, snappedCenter);
    const snappedCandidate = { center: snappedCenter, width, depth, rotation };

    if (!bestFallback || moveDistance < bestFallback.distance) {
      bestFallback = { center: snappedCenter, distance: moveDistance };
    }

    if (!placementIntersectsAnyWall(snappedCandidate, thickWalls)) {
      if (!bestNonIntersecting || moveDistance < bestNonIntersecting.distance) {
        bestNonIntersecting = { center: snappedCenter, distance: moveDistance };
      }
    }
  }

  return bestNonIntersecting?.center ?? bestFallback?.center ?? center;
}

export function getWallFaceSnappedPlacementCenter(
  center: Point,
  walls: Wall[],
  width: number,
  depth: number,
  rotation: number,
  snapThreshold = 18
): Point {
  const wallFacePadding = WALL_THICKNESS / 2;
  let nextCenter = { ...center };
  let bestXSnap: { delta: number; distance: number } | null = null;
  let bestYSnap: { delta: number; distance: number } | null = null;

  const considerSnap = (axis: "x" | "y", delta: number) => {
    const snapDistance = Math.abs(delta);
    if (snapDistance > snapThreshold) return;

    if (axis === "x") {
      if (!bestXSnap || snapDistance < bestXSnap.distance) {
        bestXSnap = { delta, distance: snapDistance };
      }
      return;
    }

    if (!bestYSnap || snapDistance < bestYSnap.distance) {
      bestYSnap = { delta, distance: snapDistance };
    }
  };

  const collectSnaps = () => {
    const bounds = getRotatedRectBounds(nextCenter, width, depth, rotation);

    for (const wall of walls) {
      const isVertical = Math.abs(wall.start.x - wall.end.x) < Math.abs(wall.start.y - wall.end.y);
      const isHorizontal = !isVertical;

      if (isVertical) {
        const minY = Math.min(wall.start.y, wall.end.y);
        const maxY = Math.max(wall.start.y, wall.end.y);
        const overlapsY = maxY >= bounds.minY && minY <= bounds.maxY;
        if (!overlapsY) continue;

        const centerX = (wall.start.x + wall.end.x) / 2;
        const leftFace = centerX - wallFacePadding;
        const rightFace = centerX + wallFacePadding;
        considerSnap("x", leftFace - bounds.maxX);
        considerSnap("x", rightFace - bounds.minX);
        continue;
      }

      if (isHorizontal) {
        const minX = Math.min(wall.start.x, wall.end.x);
        const maxX = Math.max(wall.start.x, wall.end.x);
        const overlapsX = maxX >= bounds.minX && minX <= bounds.maxX;
        if (!overlapsX) continue;

        const centerY = (wall.start.y + wall.end.y) / 2;
        const topFace = centerY - wallFacePadding;
        const bottomFace = centerY + wallFacePadding;
        considerSnap("y", topFace - bounds.maxY);
        considerSnap("y", bottomFace - bounds.minY);
      }
    }
  };

  collectSnaps();

  const resolvedXSnap = bestXSnap as { delta: number; distance: number } | null;
  const resolvedYSnap = bestYSnap as { delta: number; distance: number } | null;

  if (resolvedXSnap) {
    nextCenter = { ...nextCenter, x: nextCenter.x + resolvedXSnap.delta };
  }

  if (resolvedYSnap) {
    nextCenter = { ...nextCenter, y: nextCenter.y + resolvedYSnap.delta };
  }

  const attachment = getBestPlacementWallAttachment(
    { center: nextCenter, width, depth, rotation },
    walls,
    Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8)
  );

  return attachment
    ? getWallEndStoppedPlacementCenter(nextCenter, walls, width, depth, rotation, attachment.wall.id)
    : nextCenter;
}

export function getPlacementWallSideGuideLine(
  wall: Wall,
  walls: Wall[],
  placementCenter: Point
): PlacementWallSideGuideLine | null {
  const wallDirection = normalize(sub(wall.end, wall.start));
  if (!vectorLength(wallDirection)) return null;

  // Use the wall's own start -> end direction here, not getElevationWallAxis().
  // getElevationWallAxis() may flip the wall for reading order, which also
  // flips left/right and can clamp a cabinet against the opposite black-dot
  // side. A cabinet standing on a wall side must use the two dots that form
  // that exact physical side of this wall segment.
  const wallNormal = normalize(perp(wallDirection));
  const signedSideDistance = dot(sub(placementCenter, wall.start), wallNormal);
  const placementGuideSide: Exclude<MeasurementSide, "length"> =
    signedSideDistance >= 0 ? "left" : "right";

  const segmentGeometry = getWallSegmentBlackDotGeometry(
    wall.start,
    wall.end,
    walls.filter(isThickWall)
  );
  const startAnchor = placementGuideSide === "left"
    ? segmentGeometry.startLeft
    : segmentGeometry.startRight;
  const endAnchor = placementGuideSide === "left"
    ? segmentGeometry.endLeft
    : segmentGeometry.endRight;
  const length = distance(startAnchor, endAnchor);

  if (length < 0.001) return null;

  return {
    startAnchor,
    endAnchor,
    direction: normalize(sub(endAnchor, startAnchor)),
    length,
    side: placementGuideSide,
  };
}

export function getWallEndStoppedPlacementCenter(
  center: Point,
  walls: Wall[],
  width: number,
  depth: number,
  rotation: number,
  wallId: string,
  stopThreshold = Number.POSITIVE_INFINITY
): Point {
  const wall = walls.find((candidate) => candidate.id === wallId && isThickWall(candidate));
  if (!wall) return center;

  const sideLine = getPlacementWallSideGuideLine(wall, walls, center);
  if (!sideLine || sideLine.length < 1) return center;

  // Clamp along the actual wall-side line formed by its two black dots. This
  // fixes chained/mitered wall cases where the wall rectangle edge and the
  // visible black-dot side are not the same usable run.
  const placementInterval = getRotatedRectProjectionInterval(
    center,
    width,
    depth,
    rotation,
    sideLine.startAnchor,
    sideLine.direction
  );
  const startOverflow = -placementInterval.min;
  const endOverflow = placementInterval.max - sideLine.length;
  let projectionDelta = 0;

  if (startOverflow > 0 && startOverflow <= stopThreshold + WALL_THICKNESS) {
    projectionDelta = startOverflow;
  }

  if (endOverflow > 0 && endOverflow <= stopThreshold + WALL_THICKNESS) {
    projectionDelta = projectionDelta === 0
      ? -endOverflow
      : Math.abs(endOverflow) < Math.abs(projectionDelta)
        ? -endOverflow
        : projectionDelta;
  }

  if (projectionDelta === 0) return center;

  return add(center, mul(sideLine.direction, projectionDelta));
}

export function getThickWallProjectionInterval(
  wall: Wall,
  axisStart: Point,
  axisDirection: Point
) {
  const direction = normalize(sub(wall.end, wall.start));
  const normal = perp(direction);
  const corners = [
    add(wall.start, mul(normal, WALL_THICKNESS / 2)),
    add(wall.end, mul(normal, WALL_THICKNESS / 2)),
    add(wall.end, mul(normal, -WALL_THICKNESS / 2)),
    add(wall.start, mul(normal, -WALL_THICKNESS / 2)),
  ];
  const projections = corners.map((corner) => dot(sub(corner, axisStart), axisDirection));

  return {
    min: Math.min(...projections),
    max: Math.max(...projections),
  };
}

export function getRotatedRectProjectionInterval(
  center: Point,
  width: number,
  depth: number,
  rotation: number,
  axisStart: Point,
  axisDirection: Point
) {
  const corners = getRotatedRectCorners(center, width, depth, rotation);
  const projections = corners.map((corner) => dot(sub(corner, axisStart), axisDirection));

  return {
    min: Math.min(...projections),
    max: Math.max(...projections),
  };
}

export function getWallCollisionPolygon(wall: Wall, walls: Wall[]): Point[] {
  if (!isThickWall(wall)) {
    return [wall.start, wall.end, wall.end, wall.start];
  }

  return getWallSegmentBlackDotGeometry(
    wall.start,
    wall.end,
    walls.filter(isThickWall)
  ).polygon;
}

export function polygonsOverlapForPlacementBlocking(firstPolygon: Point[], secondPolygon: Point[]) {
  if (firstPolygon.length < 3 || secondPolygon.length < 3) return false;

  const firstEdges = firstPolygon.map((point, index) => ({
    start: point,
    end: firstPolygon[(index + 1) % firstPolygon.length],
  }));
  const secondEdges = secondPolygon.map((point, index) => ({
    start: point,
    end: secondPolygon[(index + 1) % secondPolygon.length],
  }));

  return (
    firstPolygon.some((point) => pointInPolygon(point, secondPolygon)) ||
    secondPolygon.some((point) => pointInPolygon(point, firstPolygon)) ||
    firstEdges.some((firstEdge) =>
      secondEdges.some((secondEdge) =>
        placementOpenSegmentsIntersect(
          firstEdge.start,
          firstEdge.end,
          secondEdge.start,
          secondEdge.end
        )
      )
    )
  );
}

export function getPlacementPlanHandleTabPolygons(
  placementItem: Pick<PlacementElement, "center" | "width" | "depth" | "rotation"> & Partial<Pick<PlacementElement, "category" | "image">>
) {
  const radians = degreesToRadians(placementItem.rotation);
  const cosValue = Math.cos(radians);
  const sinValue = Math.sin(radians);
  const toWorldPoint = (localPoint: Point): Point => ({
    x: placementItem.center.x + localPoint.x * cosValue - localPoint.y * sinValue,
    y: placementItem.center.y + localPoint.x * sinValue + localPoint.y * cosValue,
  });

  return getPlacementPlanHandleTabRects(placementItem).map((tab) =>
    [
      { x: tab.x, y: tab.y },
      { x: tab.x + tab.width, y: tab.y },
      { x: tab.x + tab.width, y: tab.y + tab.height },
      { x: tab.x, y: tab.y + tab.height },
    ].map(toWorldPoint)
  );
}

export function placementHandleTabsIntersectAnyWall(
  placementItem: Pick<PlacementElement, "center" | "width" | "depth" | "rotation"> & Partial<Pick<PlacementElement, "category" | "image">>,
  walls: Wall[]
) {
  const tabPolygons = getPlacementPlanHandleTabPolygons(placementItem);
  if (tabPolygons.length === 0) return false;

  const thickWalls = walls.filter(isThickWall);
  return tabPolygons.some((tabPolygon) =>
    thickWalls.some((wall) =>
      polygonsOverlapForPlacementBlocking(
        tabPolygon,
        getWallCollisionPolygon(wall, thickWalls)
      )
    )
  );
}

export function resolvePlacementWithHandlesFacingOut({
  rawPoint,
  currentCenter,
  walls,
  width,
  depth,
  rotation,
  placementCategory,
  placementImage,
  preferredWallId,
}: {
  rawPoint: Point;
  currentCenter: Point;
  walls: Wall[];
  width: number;
  depth: number;
  rotation: number;
  placementCategory?: PlacementCategory;
  placementImage?: PlacementImage;
  preferredWallId?: string;
}): PlacementWallFacingResolution {
  const thickWalls = walls.filter(isThickWall);
  if (!thickWalls.length) {
    return { center: currentCenter, rotation };
  }

  const wallIds = [
    ...(preferredWallId ? [preferredWallId] : []),
    ...thickWalls
      .filter((wall) => wall.id !== preferredWallId)
      .slice()
      .sort(
        (left, right) =>
          pointToSegmentDistance(rawPoint, left.start, left.end) -
          pointToSegmentDistance(rawPoint, right.start, right.end)
      )
      .map((wall) => wall.id),
  ];
  const normalizedRotation = normalizeDegrees(rotation);
  const nearestCardinalRotation = normalizeDegrees(Math.round(normalizedRotation / 90) * 90);

  const candidates: Array<PlacementWallFacingResolution & { score: number; bodyBlocked: boolean; handleBlocked: boolean }> = [];

  const getWallParallelPenalty = (candidateRotation: number, candidateWallId?: string) => {
    const attachedWall = candidateWallId
      ? thickWalls.find((wall) => wall.id === candidateWallId)
      : null;
    if (!attachedWall) return 0;

    const alignedRotations = getPlacementRotationsParallelToWall(attachedWall);
    const angleError = Math.min(
      ...alignedRotations.map((alignedRotation) =>
        Math.abs(placementShortestAngleDistance(candidateRotation, alignedRotation))
      )
    );

    // A cabinet placed on a wall must stay parallel to that wall. Without this
    // penalty the resolver can prefer a 90-degree turn because it is a little
    // closer to the cursor, which creates the bad red/perpendicular preview.
    return angleError <= 2 ? 0 : 75000 + angleError * 250;
  };

  const addCandidate = (candidateCenter: Point, candidateRotation: number, candidateWallId?: string, baseScore = 0) => {
    const stoppedCenter = candidateWallId
      ? getWallEndStoppedPlacementCenter(
          candidateCenter,
          thickWalls,
          width,
          depth,
          candidateRotation,
          candidateWallId
        )
      : candidateCenter;
    const candidate = {
      center: stoppedCenter,
      width,
      depth,
      rotation: candidateRotation,
      category: placementCategory,
      image: placementImage,
    };
    const bodyBlocked = placementIntersectsAnyWall(candidate, thickWalls);
    const handleBlocked = placementHandleTabsIntersectAnyWall(candidate, thickWalls);
    const attachment = getBestPlacementWallAttachment(
      candidate,
      thickWalls,
      Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8)
    );
    const wallId = candidateWallId ?? attachment?.wall.id;
    const wallFace = attachment?.wallFace;
    const score =
      baseScore +
      distance(rawPoint, stoppedCenter) +
      getWallParallelPenalty(candidateRotation, wallId) +
      (bodyBlocked ? 100000 : 0) +
      (handleBlocked ? 50000 : 0) +
      (!wallId ? 25000 : 0) +
      (preferredWallId && wallId !== preferredWallId ? 4000 : 0);

    candidates.push({
      center: stoppedCenter,
      rotation: candidateRotation,
      wallId,
      wallFace,
      score,
      bodyBlocked,
      handleBlocked,
    });
  };

  addCandidate(currentCenter, normalizedRotation, preferredWallId, 120);
  addCandidate(currentCenter, normalizeDegrees(normalizedRotation + 180), preferredWallId, 132);

  for (const wallId of wallIds) {
    const wall = thickWalls.find((candidateWall) => candidateWall.id === wallId);
    if (!wall) continue;

    const rotations = Array.from(
      new Set(
        [
          ...getPlacementRotationsParallelToWall(wall),
          nearestCardinalRotation,
          normalizeDegrees(nearestCardinalRotation + 180),
        ]
          .map((value) => Math.round(normalizeDegrees(value)))
          .filter((value) =>
            getPlacementRotationsParallelToWall(wall).some(
              (alignedRotation) => Math.abs(placementShortestAngleDistance(value, alignedRotation)) <= 2
            )
          )
      )
    );

    for (const candidateRotation of rotations) {
      const snappedCenters = getWallFaceSnappedPlacementCentersForWall(
        rawPoint,
        thickWalls,
        width,
        depth,
        candidateRotation,
        wallId,
        Number.POSITIVE_INFINITY
      );

      for (const snappedCenter of snappedCenters) {
        addCandidate(
          getWallOverlapResolvedPlacementCenter(
            snappedCenter,
            thickWalls,
            width,
            depth,
            candidateRotation,
            wallId
          ),
          candidateRotation,
          wallId,
          4
        );
      }
    }
  }

  const validCandidates = candidates.filter(
    (candidate) => !candidate.bodyBlocked && !candidate.handleBlocked
  );
  const bodySafeCandidates = candidates.filter((candidate) => !candidate.bodyBlocked);
  const pool = validCandidates.length ? validCandidates : bodySafeCandidates.length ? bodySafeCandidates : candidates;
  const bestCandidate = pool.slice().sort((left, right) => left.score - right.score)[0];

  return bestCandidate
    ? {
        center: bestCandidate.center,
        rotation: bestCandidate.rotation,
        wallId: bestCandidate.wallId,
        wallFace: bestCandidate.wallFace,
      }
    : { center: currentCenter, rotation: normalizedRotation, wallId: preferredWallId };
}

export function getPlacementRotationsParallelToWall(wall: Wall): number[] {
  const wallVector = sub(wall.end, wall.start);
  const wallAngle = normalizeDegrees((Math.atan2(wallVector.y, wallVector.x) * 180) / Math.PI);
  return [wallAngle, normalizeDegrees(wallAngle + 180)];
}

export function getWallFaceSnappedPlacementCentersForWall(
  center: Point,
  walls: Wall[],
  width: number,
  depth: number,
  rotation: number,
  wallId: string,
  snapThreshold = 18
): Point[] {
  const wall = walls.find((candidate) => candidate.id === wallId && isThickWall(candidate));
  if (!wall) return [];

  const wallFacePadding = WALL_THICKNESS / 2;
  const bounds = getRotatedRectBounds(center, width, depth, rotation);
  const wallIsVertical = Math.abs(wall.start.x - wall.end.x) < Math.abs(wall.start.y - wall.end.y);
  const snappedCenters: Point[] = [];

  const pushUniqueCenter = (candidateCenter: Point) => {
    if (snappedCenters.some((existingCenter) => distance(existingCenter, candidateCenter) < 0.001)) {
      return;
    }
    snappedCenters.push(candidateCenter);
  };

  if (wallIsVertical) {
    const minY = Math.min(wall.start.y, wall.end.y);
    const maxY = Math.max(wall.start.y, wall.end.y);
    const overlapY = Math.min(bounds.maxY, maxY) - Math.max(bounds.minY, minY);
    if (overlapY <= Math.max(1, Math.min(depth, width) * 0.2)) return [];

    const centerX = (wall.start.x + wall.end.x) / 2;
    const leftFace = centerX - wallFacePadding;
    const rightFace = centerX + wallFacePadding;
    const faceDeltas = [leftFace - bounds.maxX, rightFace - bounds.minX].sort(
      (leftDelta, rightDelta) => Math.abs(leftDelta) - Math.abs(rightDelta)
    );

    faceDeltas.forEach((delta) => {
      if (Math.abs(delta) > snapThreshold) return;
      pushUniqueCenter(getWallEndStoppedPlacementCenter(
        { ...center, x: center.x + delta },
        walls,
        width,
        depth,
        rotation,
        wallId
      ));
    });

    return snappedCenters;
  }

  const minX = Math.min(wall.start.x, wall.end.x);
  const maxX = Math.max(wall.start.x, wall.end.x);
  const overlapX = Math.min(bounds.maxX, maxX) - Math.max(bounds.minX, minX);
  if (overlapX <= Math.max(1, Math.min(depth, width) * 0.2)) return [];

  const centerY = (wall.start.y + wall.end.y) / 2;
  const topFace = centerY - wallFacePadding;
  const bottomFace = centerY + wallFacePadding;
  const faceDeltas = [topFace - bounds.maxY, bottomFace - bounds.minY].sort(
    (leftDelta, rightDelta) => Math.abs(leftDelta) - Math.abs(rightDelta)
  );

  faceDeltas.forEach((delta) => {
    if (Math.abs(delta) > snapThreshold) return;
    pushUniqueCenter(getWallEndStoppedPlacementCenter(
      { ...center, y: center.y + delta },
      walls,
      width,
      depth,
      rotation,
      wallId
    ));
  });

  return snappedCenters;
}

export function getWallFaceSnappedPlacementCenterForWall(
  center: Point,
  walls: Wall[],
  width: number,
  depth: number,
  rotation: number,
  wallId: string,
  snapThreshold = 18
): Point | null {
  const snappedCenters = getWallFaceSnappedPlacementCentersForWall(
    center,
    walls,
    width,
    depth,
    rotation,
    wallId,
    snapThreshold
  );

  return snappedCenters.slice().sort(
    (left, right) => distance(center, left) - distance(center, right)
  )[0] ?? null;
}

export function getPlacementAutoFacingRotationForWallFace(
  center: Point,
  walls: Wall[],
  width: number,
  depth: number,
  rotation: number,
  preferredWallId?: string
): number | null {
  const normalizedRotation = normalizeDegrees(rotation);
  const nearestCardinalRotation = normalizeDegrees(Math.round(normalizedRotation / 90) * 90);
  if (placementShortestAngleDistance(normalizedRotation, nearestCardinalRotation) > 2) {
    return null;
  }

  const faceNormal = getNearestPlacementWallFaceNormal(center, walls, width, depth, nearestCardinalRotation, preferredWallId);
  if (!faceNormal) return null;

  return normalizeDegrees((Math.atan2(-faceNormal.x, faceNormal.y) * 180) / Math.PI);
}

export function getNearestPlacementWallFaceNormal(
  center: Point,
  walls: Wall[],
  width: number,
  depth: number,
  rotation: number,
  preferredWallId?: string
): Point | null {
  const attachmentTolerance = 10;
  const wallFacePadding = WALL_THICKNESS / 2;
  const bounds = getRotatedRectBounds(
    center,
    Math.max(1, width - 1),
    Math.max(1, depth - 1),
    rotation
  );
  let bestMatch: { normal: Point; distance: number } | null = null;

  const rangesOverlap = (minA: number, maxA: number, minB: number, maxB: number) =>
    Math.min(maxA, maxB) - Math.max(minA, minB) > 1;

  const considerFace = (normal: Point, faceDistance: number) => {
    const absDistance = Math.abs(faceDistance);
    if (absDistance > attachmentTolerance) return;
    if (!bestMatch || absDistance < bestMatch.distance) {
      bestMatch = { normal, distance: absDistance };
    }
  };

  walls
    .filter(isThickWall)
    .filter((wall) => !preferredWallId || wall.id === preferredWallId)
    .forEach((wall) => {
    const wallIsVertical = Math.abs(wall.start.x - wall.end.x) < Math.abs(wall.start.y - wall.end.y);

    if (wallIsVertical) {
      const minY = Math.min(wall.start.y, wall.end.y);
      const maxY = Math.max(wall.start.y, wall.end.y);
      if (!rangesOverlap(bounds.minY, bounds.maxY, minY, maxY)) return;

      const centerX = (wall.start.x + wall.end.x) / 2;
      const leftFace = centerX - wallFacePadding;
      const rightFace = centerX + wallFacePadding;
      considerFace({ x: -1, y: 0 }, bounds.maxX - leftFace);
      considerFace({ x: 1, y: 0 }, bounds.minX - rightFace);
      return;
    }

    const minX = Math.min(wall.start.x, wall.end.x);
    const maxX = Math.max(wall.start.x, wall.end.x);
    if (!rangesOverlap(bounds.minX, bounds.maxX, minX, maxX)) return;

    const centerY = (wall.start.y + wall.end.y) / 2;
    const topFace = centerY - wallFacePadding;
    const bottomFace = centerY + wallFacePadding;
    considerFace({ x: 0, y: -1 }, bounds.maxY - topFace);
    considerFace({ x: 0, y: 1 }, bounds.minY - bottomFace);
  });

  const resolvedBestMatch = bestMatch as { normal: Point; distance: number } | null;
  return resolvedBestMatch ? resolvedBestMatch.normal : null;
}

export function getAdjacentPlacementSnappedCenter(
  center: Point,
  placements: PlacementElement[],
  width: number,
  depth: number,
  rotation: number,
  placementCategory?: PlacementCategory,
  excludedPlacementId?: string
): Point {
  const neighborAwarenessThreshold = 24;
  const edgeBindingSnapThreshold = 22;
  const alignmentThreshold = 14;
  const rotationIsStraight = Math.abs(placementShortestAngleDistance(normalizeDegrees(rotation), 0)) < 1 ||
    Math.abs(placementShortestAngleDistance(normalizeDegrees(rotation), 180)) < 1;
  const rotationIsQuarterTurn = Math.abs(placementShortestAngleDistance(normalizeDegrees(rotation), 90)) < 1 ||
    Math.abs(placementShortestAngleDistance(normalizeDegrees(rotation), 270)) < 1;

  if (!rotationIsStraight && !rotationIsQuarterTurn) return center;

  const pendingCategory = placementCategory ?? getPlacementElevationCategory({
    id: "pending-cabinet",
    center,
    width,
    depth,
    rotation,
  });

  let nextCenter = { ...center };
  let bestXEdgeSnap: { delta: number; distance: number } | null = null;
  let bestYEdgeSnap: { delta: number; distance: number } | null = null;
  let bestXAlignmentSnap: { delta: number; distance: number } | null = null;
  let bestYAlignmentSnap: { delta: number; distance: number } | null = null;

  const considerSnap = (
    axis: "x" | "y",
    kind: "edge" | "alignment",
    delta: number,
    threshold = neighborAwarenessThreshold
  ) => {
    const snapDistance = Math.abs(delta);
    if (snapDistance > threshold) return;

    if (axis === "x" && kind === "edge") {
      if (!bestXEdgeSnap || snapDistance < bestXEdgeSnap.distance) {
        bestXEdgeSnap = { delta, distance: snapDistance };
      }
      return;
    }

    if (axis === "y" && kind === "edge") {
      if (!bestYEdgeSnap || snapDistance < bestYEdgeSnap.distance) {
        bestYEdgeSnap = { delta, distance: snapDistance };
      }
      return;
    }

    if (axis === "x") {
      if (!bestXAlignmentSnap || snapDistance < bestXAlignmentSnap.distance) {
        bestXAlignmentSnap = { delta, distance: snapDistance };
      }
      return;
    }

    if (!bestYAlignmentSnap || snapDistance < bestYAlignmentSnap.distance) {
      bestYAlignmentSnap = { delta, distance: snapDistance };
    }
  };

  const rangesOverlapOrTouch = (minA: number, maxA: number, minB: number, maxB: number, tolerance = 0) =>
    Math.min(maxA, maxB) - Math.max(minA, minB) >= -tolerance;

  const bounds = getRotatedRectBounds(nextCenter, width, depth, rotation);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  for (const otherPlacement of placements) {
    if (otherPlacement.id === excludedPlacementId) continue;

    const otherCategory = getPlacementElevationCategory(otherPlacement);
    const samePlacementLayer =
      isElevationFloatingPlacement({ category: pendingCategory, width }) ===
      isElevationFloatingPlacement(otherPlacement);

    const otherBounds = getRotatedRectBounds(
      otherPlacement.center,
      otherPlacement.width,
      otherPlacement.depth,
      otherPlacement.rotation
    );
    const otherCenterX = (otherBounds.minX + otherBounds.maxX) / 2;
    const otherCenterY = (otherBounds.minY + otherBounds.maxY) / 2;

    const nearSameRows = rangesOverlapOrTouch(bounds.minY, bounds.maxY, otherBounds.minY, otherBounds.maxY, alignmentThreshold);
    const nearSameColumns = rangesOverlapOrTouch(bounds.minX, bounds.maxX, otherBounds.minX, otherBounds.maxX, alignmentThreshold);
    const nearVerticalNeighbor =
      Math.abs(otherBounds.minY - bounds.maxY) <= neighborAwarenessThreshold ||
      Math.abs(otherBounds.maxY - bounds.minY) <= neighborAwarenessThreshold ||
      nearSameRows;
    const nearHorizontalNeighbor =
      Math.abs(otherBounds.minX - bounds.maxX) <= neighborAwarenessThreshold ||
      Math.abs(otherBounds.maxX - bounds.minX) <= neighborAwarenessThreshold ||
      nearSameColumns;

    // Edge-to-edge snaps are allowed across every cabinet category, but only when
    // the cabinet is almost touching the neighboring cabinet. This preserves the
    // existing snap/bind behavior for closed cabinets while still letting the user
    // intentionally leave a small reveal/filler gap between nearby cabinets.
    if (nearSameRows) {
      considerSnap("x", "edge", otherBounds.minX - bounds.maxX, edgeBindingSnapThreshold);
      considerSnap("x", "edge", otherBounds.maxX - bounds.minX, edgeBindingSnapThreshold);
    }

    if (nearSameColumns) {
      considerSnap("y", "edge", otherBounds.minY - bounds.maxY, edgeBindingSnapThreshold);
      considerSnap("y", "edge", otherBounds.maxY - bounds.minY, edgeBindingSnapThreshold);
    }

    // Alignment snaps are only same-layer. Cross-layer alignment was the root cause
    // of wall cabinets being pulled into a small false gap or a small false overlap
    // when the user wanted edge-to-edge placement beside base/pantry cabinets.
    if (samePlacementLayer && nearVerticalNeighbor) {
      considerSnap("x", "alignment", otherBounds.minX - bounds.minX, alignmentThreshold);
      considerSnap("x", "alignment", otherBounds.maxX - bounds.maxX, alignmentThreshold);
      considerSnap("x", "alignment", otherCenterX - centerX, alignmentThreshold);
    }

    if (samePlacementLayer && nearHorizontalNeighbor) {
      considerSnap("y", "alignment", otherBounds.minY - bounds.minY, alignmentThreshold);
      considerSnap("y", "alignment", otherBounds.maxY - bounds.maxY, alignmentThreshold);
      considerSnap("y", "alignment", otherCenterY - centerY, alignmentThreshold);
    }
  }

  // Prefer true edge-to-edge snaps when the moving cabinet is close enough to
  // another cabinet edge. Fall back to same-layer alignment snaps when there is
  // no nearby edge contact candidate. Collision validation below still decides
  // whether the snapped position is actually allowed in floor/elevation.
  const xSnap = bestXEdgeSnap ?? bestXAlignmentSnap;
  const ySnap = bestYEdgeSnap ?? bestYAlignmentSnap;

  const resolvedXNeighborSnap = xSnap as { delta: number; distance: number } | null;
  const resolvedYNeighborSnap = ySnap as { delta: number; distance: number } | null;

  if (resolvedXNeighborSnap) {
    nextCenter = { ...nextCenter, x: nextCenter.x + resolvedXNeighborSnap.delta };
  }

  if (resolvedYNeighborSnap) {
    nextCenter = { ...nextCenter, y: nextCenter.y + resolvedYNeighborSnap.delta };
  }

  return nextCenter;
}

export function getPlacementEdgeToEdgeSnappedCenter({
  center,
  walls,
  placements,
  width,
  depth,
  rotation,
  placementCategory,
  placementImage,
  excludedPlacementId,
  preferredWallId,
  snapThreshold = 18,
}: PlacementEdgeSnapOptions): Point {
  const thickWalls = walls.filter(isThickWall);
  const movingBounds = getRotatedRectBounds(center, width, depth, rotation);
  const movingCategory = placementCategory ?? getPlacementElevationCategory({
    id: excludedPlacementId ?? "pending-cabinet",
    center,
    width,
    depth,
    rotation,
  });
  const attachments = getPlacementWallAttachments(
    { center, width, depth, rotation },
    thickWalls,
    Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8)
  );
  const wallAttachment = (preferredWallId
    ? attachments.find((attachment) => attachment.wall.id === preferredWallId)
    : null) ?? attachments[0] ?? null;
  const attachedWall = wallAttachment?.wall ?? null;
  const attachedWallIsVertical = attachedWall
    ? Math.abs(attachedWall.start.x - attachedWall.end.x) < Math.abs(attachedWall.start.y - attachedWall.end.y)
    : null;
  const allowedAxes: Array<"x" | "y"> = attachedWallIsVertical === null
    ? ["x", "y"]
    : attachedWallIsVertical
      ? ["y"]
      : ["x"];
  const overlapTolerance = Math.max(8, snapThreshold);
  const targetWallId = preferredWallId ?? attachedWall?.id;
  const targetWall = targetWallId
    ? thickWalls.find((candidateWall) => candidateWall.id === targetWallId) ?? null
    : null;
  const movingPlacementFromList = excludedPlacementId
    ? placements.find((placementItem) => placementItem.id === excludedPlacementId) ?? null
    : null;
  const movingImage = placementImage ?? movingPlacementFromList?.image;

  const rangesNearOrOverlap = (minA: number, maxA: number, minB: number, maxB: number, tolerance = 0) =>
    Math.min(maxA, maxB) - Math.max(minA, minB) >= -tolerance;

  const belongsToSameSnapRun = (otherPlacement: PlacementElement) => {
    if (!targetWallId || !otherPlacement.wallId) return true;
    if (otherPlacement.wallId === targetWallId) return true;

    const involvesCornerPlacement = movingImage === "base-corner" || otherPlacement.image === "base-corner";
    if (!involvesCornerPlacement || !targetWall) return false;

    const otherWall = thickWalls.find((candidateWall) => candidateWall.id === otherPlacement.wallId) ?? null;
    return Boolean(
      otherWall &&
      wallsShareEndpoint(targetWall, otherWall, Math.max(2, WALL_THICKNESS + 4))
    );
  };

  const snapCandidates: Array<{ center: Point; distance: number; axis: "x" | "y" }> = [];

  for (const otherPlacement of placements) {
    if (otherPlacement.id === excludedPlacementId) continue;
    if (!belongsToSameSnapRun(otherPlacement)) continue;

    const otherBounds = getRotatedRectBounds(
      otherPlacement.center,
      otherPlacement.width,
      otherPlacement.depth,
      otherPlacement.rotation
    );
    const otherCategory = getPlacementElevationCategory(otherPlacement);

    // Keep edge snap broad enough to support wall-over-base alignment, but avoid
    // snapping floor-standing cabinets to upper cabinets on different elevation
    // paths unless they share the same wall/run. Collision validation still
    // decides whether the snapped placement is legal after the edge alignment.
    if (
      isElevationFloatingPlacement({ category: movingCategory, width }) !== isElevationFloatingPlacement(otherPlacement) &&
      preferredWallId &&
      otherPlacement.wallId &&
      otherPlacement.wallId !== preferredWallId
    ) {
      continue;
    }

    if (
      allowedAxes.includes("x") &&
      rangesNearOrOverlap(movingBounds.minY, movingBounds.maxY, otherBounds.minY, otherBounds.maxY, overlapTolerance)
    ) {
      [
        otherBounds.minX - movingBounds.maxX,
        otherBounds.maxX - movingBounds.minX,
      ].forEach((delta) => {
        const distance = Math.abs(delta);
        if (distance <= snapThreshold) {
          snapCandidates.push({
            center: { ...center, x: center.x + delta },
            distance,
            axis: "x",
          });
        }
      });
    }

    if (
      allowedAxes.includes("y") &&
      rangesNearOrOverlap(movingBounds.minX, movingBounds.maxX, otherBounds.minX, otherBounds.maxX, overlapTolerance)
    ) {
      [
        otherBounds.minY - movingBounds.maxY,
        otherBounds.maxY - movingBounds.minY,
      ].forEach((delta) => {
        const distance = Math.abs(delta);
        if (distance <= snapThreshold) {
          snapCandidates.push({
            center: { ...center, y: center.y + delta },
            distance,
            axis: "y",
          });
        }
      });
    }
  }

  if (!snapCandidates.length) return center;

  const candidates = snapCandidates
    .map((candidate) => {
      const wallStoppedCenter = attachedWall
        ? getWallEndStoppedPlacementCenter(
            candidate.center,
            thickWalls,
            width,
            depth,
            rotation,
            attachedWall.id
          )
        : candidate.center;
      const wallResolvedCenter = getWallOverlapResolvedPlacementCenter(
        wallStoppedCenter,
        thickWalls,
        width,
        depth,
        rotation,
        preferredWallId ?? attachedWall?.id
      );
      const candidatePlacement = {
        center: wallResolvedCenter,
        width,
        depth,
        rotation,
        category: placementCategory,
        image: movingImage,
      };
      const wallPenalty = placementIntersectsAnyWall(candidatePlacement, thickWalls) ||
        placementHandleTabsIntersectAnyWall(candidatePlacement, thickWalls)
        ? 100000
        : 0;
      return {
        center: wallResolvedCenter,
        score: candidate.distance + wallPenalty,
      };
    })
    .sort((left, right) => left.score - right.score);

  return candidates[0]?.center ?? center;
}

export function getCollisionSafeAdjacentPlacementSnappedCenter(options: PlacementEdgeSnapOptions): Point {
  return getPlacementEdgeToEdgeSnappedCenter(options);
}

export function getWallPlacementElevationOverlapMessage(
  placementItem: PlacementElement,
  placements: PlacementElement[],
  walls: Wall[],
  excludedPlacementId?: string
): string | undefined {
  const thickWalls = walls.filter(isThickWall);
  if (!thickWalls.length) return undefined;

  const candidatePlacements = placements.some((candidate) => candidate.id === placementItem.id)
    ? placements.map((candidate) =>
        candidate.id === placementItem.id ? placementItem : candidate
      )
    : [...placements, placementItem];

  const overlapToleranceInches = 0.25;

  for (const wall of thickWalls) {
    const placements = getPlacementElevationItemsForWall(
      wall,
      candidatePlacements,
      thickWalls
    );
    const movingPlacement = placements.find(
      (placement) => placement.placement.id === placementItem.id
    );

    if (!movingPlacement) continue;

    const movingStart = movingPlacement.startInches;
    const movingEnd = movingPlacement.startInches + movingPlacement.widthInches;
    const movingBottom = movingPlacement.distanceFromFloorInches;
    const movingTop = movingPlacement.distanceFromFloorInches + movingPlacement.heightInches;

    const overlapsAnotherPlacement = placements.some((otherPlacement) => {
      if (otherPlacement.placement.id === placementItem.id) return false;
      if (otherPlacement.placement.id === excludedPlacementId) return false;

      const movingCategory = movingPlacement.category;
      const otherCategory = otherPlacement.category;

      // New wall cabinets are allowed to initially share the same floor/elevation
      // projection with an existing same-wall wall cabinet because the placement
      // step immediately resolves that into a vertical stack. For drags/edits,
      // excludedPlacementId is present, so overlap is still blocked normally.
      if (
        !excludedPlacementId &&
        isElevationFloatingPlacement(movingPlacement.placement) &&
        isElevationFloatingPlacement(otherPlacement.placement) &&
        placementsBelongToSameWall(movingPlacement.placement, otherPlacement.placement)
      ) {
        return false;
      }

      const otherStart = otherPlacement.startInches;
      const otherEnd = otherPlacement.startInches + otherPlacement.widthInches;
      const otherBottom = otherPlacement.distanceFromFloorInches;
      const otherTop = otherPlacement.distanceFromFloorInches + otherPlacement.heightInches;
      const horizontalOverlap = Math.min(movingEnd, otherEnd) - Math.max(movingStart, otherStart);
      const verticalOverlap = Math.min(movingTop, otherTop) - Math.max(movingBottom, otherBottom);

      return horizontalOverlap > overlapToleranceInches && verticalOverlap > overlapToleranceInches;
    });

    if (overlapsAnotherPlacement) {
      return PLACEMENT_OVERLAP_MESSAGE;
    }
  }

  return undefined;
}

export function getPlacementElevationOverlapMessage(
  placementItem: PlacementElement,
  placements: PlacementElement[],
  walls: Wall[],
  excludedPlacementId?: string
): string | undefined {
  return getWallPlacementElevationOverlapMessage(placementItem, placements, walls, excludedPlacementId);
}

export function getPlacementRuleViolationMessage(
  placementItem: PlacementElement,
  placements: PlacementElement[],
  walls: Wall[],
  excludedPlacementId?: string,
  requireWallAttachment = true
): string | undefined {
  // Cabinet-to-cabinet collision has higher priority than wall-attachment
  // messaging. This prevents an attached-but-overlapping cabinet from reporting
  // "Placement should be placed against the wall" when the real blocking issue is
  // another cabinet.
  const disallowedOverlap = getDisallowedPlacementBodyOverlap(placementItem, placements, walls, excludedPlacementId);
  if (disallowedOverlap) return PLACEMENT_OVERLAP_MESSAGE;

  const elevationOverlapMessage = getPlacementElevationOverlapMessage(placementItem, placements, walls, excludedPlacementId);
  if (elevationOverlapMessage) return elevationOverlapMessage;

  if (requireWallAttachment && !isPlacementAttachedToWallFace(placementItem, walls)) {
    return PLACEMENT_NOT_AGAINST_WALL_MESSAGE;
  }

  return undefined;
}

export function getDisallowedPlacementBodyOverlap(
  placementItem: PlacementElement,
  placements: PlacementElement[],
  walls: Wall[],
  excludedPlacementId?: string
): PlacementElement | undefined {
  const bodyBounds = getRotatedRectBounds(
    placementItem.center,
    Math.max(1, placementItem.width - 1),
    Math.max(1, placementItem.depth - 1),
    placementItem.rotation
  );

  return placements.find((otherPlacement) => {
    if (otherPlacement.id === placementItem.id) return false;
    if (otherPlacement.id === excludedPlacementId) return false;

    const otherBodyBounds = getRotatedRectBounds(
      otherPlacement.center,
      Math.max(1, otherPlacement.width - 1),
      Math.max(1, otherPlacement.depth - 1),
      otherPlacement.rotation
    );

    const bodyOverlapX = Math.min(bodyBounds.maxX, otherBodyBounds.maxX) - Math.max(bodyBounds.minX, otherBodyBounds.minX);
    const bodyOverlapY = Math.min(bodyBounds.maxY, otherBodyBounds.maxY) - Math.max(bodyBounds.minY, otherBodyBounds.minY);
    if (bodyOverlapX <= 0.5 || bodyOverlapY <= 0.5) return false;

    const category = getPlacementElevationCategory(placementItem);
    const otherCategory = getPlacementElevationCategory(otherPlacement);
    const sameWall = placementsBelongToSameWall(placementItem, otherPlacement);
    const candidatePlacements = placements.some((candidate) => candidate.id === placementItem.id)
      ? placements.map((candidate) => candidate.id === placementItem.id ? placementItem : candidate)
      : [...placements, placementItem];

    // Base cabinets are floor-standing. If two floor-standing cabinets
    // overlap in the floor plan, they collide physically even when they are
    // attached to different connected wall runs such as an L-shaped corner.
    if (isFloorStandingPlacement(placementItem) && isFloorStandingPlacement(otherPlacement)) {
      if (placementsShareWallButDifferentFaces(placementItem, otherPlacement)) {
        return false;
      }
      return true;
    }

    // A new wall cabinet can share a same-wall footprint with another wall
    // cabinet because placement immediately resolves it into an elevation stack.
    // During drag/edit, excludedPlacementId is present and the elevation check below
    // blocks any remaining vertical overlap.
    if (
      !excludedPlacementId &&
      isElevationFloatingPlacement(placementItem) &&
      isElevationFloatingPlacement(otherPlacement) &&
      sameWall
    ) {
      return false;
    }

    // For upper/lower combinations, the floor plan alone is not enough. A wall
    // or pantry cabinet may look like it sits over a base cabinet in top view but
    // still be valid because it is above the base in elevation. Block only when
    // their vertical elevation ranges overlap. This also catches different-wall
    // floating-cabinet collisions at L-shaped corners.
    if (placementVerticalRangesOverlap(placementItem, otherPlacement)) {
      return true;
    }

    // Keep the same-wall elevation projection check for cases that are not
    // obvious from the floor-plan rectangle alone, such as manual elevation edits
    // and wall cabinets stacked on the same run.
    return Boolean(
      getPlacementElevationOverlapMessage(
        placementItem,
        candidatePlacements,
        walls,
        excludedPlacementId
      )
    );
  });
}

export function placementsBelongToSameWall(
  placementItem: Pick<PlacementElement, "wallId" | "wallFace">,
  otherPlacement: Pick<PlacementElement, "wallId" | "wallFace">
) {
  return Boolean(
    placementItem.wallId &&
      otherPlacement.wallId &&
      placementItem.wallId === otherPlacement.wallId &&
      (placementItem.wallFace === otherPlacement.wallFace ||
        !placementItem.wallFace ||
        !otherPlacement.wallFace)
  );
}

export function placementsShareWallButDifferentFaces(
  placementItem: Pick<PlacementElement, "wallId" | "wallFace">,
  otherPlacement: Pick<PlacementElement, "wallId" | "wallFace">
) {
  return Boolean(
    placementItem.wallId &&
      otherPlacement.wallId &&
      placementItem.wallId === otherPlacement.wallId &&
      placementItem.wallFace &&
      otherPlacement.wallFace &&
      placementItem.wallFace !== otherPlacement.wallFace
  );
}

export function getPlacementVerticalRangeInches(placementItem: PlacementElement) {
  const category = getPlacementElevationCategory(placementItem);
  const spec = getPlacementElevationSpec(placementItem, category);

  return {
    bottom: spec.distanceFromFloorInches,
    top:
      spec.distanceFromFloorInches +
      spec.heightInches +
      getPlacementTopAccessoryExtraHeightInches(placementItem),
  };
}

export function placementVerticalRangesOverlap(
  placementItem: PlacementElement,
  otherPlacement: PlacementElement,
  toleranceInches = 0.25
) {
  const range = getPlacementVerticalRangeInches(placementItem);
  const otherRange = getPlacementVerticalRangeInches(otherPlacement);

  return Math.min(range.top, otherRange.top) - Math.max(range.bottom, otherRange.bottom) > toleranceInches;
}

export function isSameWallWallPlacementStackOverlapAllowed(
  placementItem: PlacementElement,
  otherPlacement: PlacementElement
) {
  const category = getPlacementElevationCategory(placementItem);
  const otherCategory = getPlacementElevationCategory(otherPlacement);

  // Wall cabinets may overlap in the floor plan only when they belong to the
  // same wall. That floor-plan overlap is used to create an elevation stack.
  // A wall cabinet from a different wall is physically crossing into another
  // cabinet's footprint, so it must be blocked.
  return (
    isElevationFloatingPlacement(placementItem) &&
    isElevationFloatingPlacement(otherPlacement) &&
    placementsBelongToSameWall(placementItem, otherPlacement)
  );
}

export function isSameWallCrossLayerPlacementOverlapAllowed(
  placementItem: PlacementElement,
  otherPlacement: PlacementElement
) {
  const category = getPlacementElevationCategory(placementItem);
  const otherCategory = getPlacementElevationCategory(otherPlacement);

  // Wall and pantry cabinets can float above lower cabinets. They may share
  // the same floor-plan footprint only on the same wall because they occupy
  // different elevation layers on that wall. If the cabinets are attached to
  // different walls, the floor-plan overlap is a real collision.
  return (
    isElevationFloatingPlacement(placementItem) !== isElevationFloatingPlacement(otherPlacement) &&
    placementsBelongToSameWall(placementItem, otherPlacement)
  );
}

export function isPlacementAttachedToWallFace(
  placementItem: Pick<PlacementElement, "center" | "width" | "depth" | "rotation">,
  walls: Wall[]
): boolean {
  return Boolean(
    getBestPlacementWallAttachment(
      placementItem,
      walls,
      Math.max(7, WALL_THICKNESS / 2 + 4)
    )
  );
}

export function getWallPlacementSupportedWall(
  placementItem: Pick<PlacementElement, "center" | "width" | "depth" | "rotation"> & Partial<Pick<PlacementElement, "id" | "category" | "wallId" | "wallFace">>,
  placements: PlacementElement[],
  walls: Wall[],
  excludedPlacementId?: string
): Wall | null {
  const category = placementItem.category ?? getPlacementElevationCategory({
    id: placementItem.id ?? "pending-cabinet",
    center: placementItem.center,
    width: placementItem.width,
    depth: placementItem.depth,
    rotation: placementItem.rotation,
  });

  if (!isElevationFloatingPlacement(placementItem)) return null;

  const bodyBounds = getRotatedRectBounds(
    placementItem.center,
    Math.max(1, placementItem.width - 1),
    Math.max(1, placementItem.depth - 1),
    placementItem.rotation
  );

  let bestSupport: { wall: Wall; area: number } | null = null;

  for (const otherPlacement of placements) {
    if (otherPlacement.id === excludedPlacementId || otherPlacement.id === placementItem.id) continue;
    if (placementsShareWallButDifferentFaces(placementItem, otherPlacement)) continue;

    const otherBounds = getRotatedRectBounds(
      otherPlacement.center,
      Math.max(1, otherPlacement.width - 1),
      Math.max(1, otherPlacement.depth - 1),
      otherPlacement.rotation
    );

    const overlapX = Math.min(bodyBounds.maxX, otherBounds.maxX) - Math.max(bodyBounds.minX, otherBounds.minX);
    const overlapY = Math.min(bodyBounds.maxY, otherBounds.maxY) - Math.max(bodyBounds.minY, otherBounds.minY);
    if (overlapX <= 0.5 || overlapY <= 0.5) continue;

    const supportWall = otherPlacement.wallId
      ? walls.find((wall) => wall.id === otherPlacement.wallId && isThickWall(wall)) ?? null
      : getBestPlacementWallAttachment(
          otherPlacement,
          walls,
          Math.max(WALL_ATTACH_THRESHOLD, WALL_THICKNESS / 2 + 8)
        )?.wall ?? null;

    if (!supportWall) continue;

    const area = overlapX * overlapY;
    if (!bestSupport || area > bestSupport.area) {
      bestSupport = { wall: supportWall, area };
    }
  }

  return bestSupport?.wall ?? null;
}

export function getPlacementProjectionOnWallAxis(
  placementItem: Pick<PlacementElement, "center" | "width" | "depth" | "rotation">,
  wall: Wall
): { startProjection: number; endProjection: number; depthFromWallFace: number } | null {
  const axis = getElevationWallAxis(wall);
  if (axis.length < 0.001) return null;

  const corners = getRotatedRectCorners(
    placementItem.center,
    placementItem.width,
    placementItem.depth,
    placementItem.rotation
  );
  const projections = corners.map((corner) => dot(sub(corner, axis.start), axis.direction));
  const rawStartProjection = Math.min(...projections);
  const rawEndProjection = Math.max(...projections);
  const displayWidthPixels = Math.min(rawEndProjection - rawStartProjection, axis.length);

  if (displayWidthPixels <= 0.5) return null;

  let startProjection = rawStartProjection;
  let endProjection = rawEndProjection;

  if (displayWidthPixels >= axis.length) {
    startProjection = 0;
    endProjection = axis.length;
  } else {
    if (startProjection < 0) {
      endProjection -= startProjection;
      startProjection = 0;
    }

    if (endProjection > axis.length) {
      startProjection -= endProjection - axis.length;
      endProjection = axis.length;
    }

    startProjection = clamp(startProjection, 0, axis.length - displayWidthPixels);
    endProjection = startProjection + displayWidthPixels;
  }

  const wallFaceOffset = WALL_THICKNESS / 2;
  const centerSideDistance = dot(sub(placementItem.center, axis.start), axis.normal);
  const depthFromWallFace = Math.max(
    0,
    Math.abs(Math.abs(centerSideDistance) - wallFaceOffset) - placementItem.depth / 2
  );

  return { startProjection, endProjection, depthFromWallFace };
}

export function placementIntersectsAnyPlacement(
  placementItem: Pick<PlacementElement, "center" | "width" | "depth" | "rotation"> & Partial<Pick<PlacementElement, "category" | "image">>,
  placements: PlacementElement[],
  excludedPlacementId?: string
) {
  const bodyBounds = getRotatedRectBounds(
    placementItem.center,
    Math.max(1, placementItem.width - 1),
    Math.max(1, placementItem.depth - 1),
    placementItem.rotation
  );
  const placementCategory = getPlacementElevationCategory({
    id: "pending-cabinet",
    center: placementItem.center,
    width: placementItem.width,
    depth: placementItem.depth,
    rotation: placementItem.rotation,
    category: placementItem.category,
  });
  const tabBounds = getPlacementPlanHandleTabWorldBounds(placementItem);

  return placements.some((otherPlacement) => {
    if (otherPlacement.id === excludedPlacementId) return false;

    const otherCategory = getPlacementElevationCategory(otherPlacement);

    if (
      isElevationFloatingPlacement({
        category: placementCategory,
        width: placementItem.width,
        image: placementItem.image,
      }) &&
      isElevationFloatingPlacement(otherPlacement)
    ) return false;

    // Wall cabinets may sit over base/pantry cabinets, but no cabinet may sit on
    // top of another cabinet of the same placement layer. Base/pantry cabinets are
    // floor-standing and cannot be placed over any cabinet.
    const floatingOverFloorStanding =
      isElevationFloatingPlacement({
        category: placementCategory,
        width: placementItem.width,
        image: placementItem.image,
      }) !== isElevationFloatingPlacement(otherPlacement);
    if (floatingOverFloorStanding) return false;

    const otherBodyBounds = getRotatedRectBounds(
      otherPlacement.center,
      Math.max(1, otherPlacement.width - 1),
      Math.max(1, otherPlacement.depth - 1),
      otherPlacement.rotation
    );

    const bodyOverlapX = Math.min(bodyBounds.maxX, otherBodyBounds.maxX) - Math.max(bodyBounds.minX, otherBodyBounds.minX);
    const bodyOverlapY = Math.min(bodyBounds.maxY, otherBodyBounds.maxY) - Math.max(bodyBounds.minY, otherBodyBounds.minY);
    if (bodyOverlapX > 0.5 && bodyOverlapY > 0.5) return true;

    const otherTabBounds = getPlacementPlanHandleTabWorldBounds(otherPlacement);
    const tabCoverageTolerance = 0.75;

    return (
      tabBounds.some((tab) => rectContainsRect(otherBodyBounds, tab, tabCoverageTolerance)) ||
      otherTabBounds.some((tab) => rectContainsRect(bodyBounds, tab, tabCoverageTolerance))
    );
  });
}

export function getPlacementElevationPairOverlap(
  movingPlacement: PlacementElement,
  otherPlacement: PlacementElement,
  placements: PlacementElement[],
  walls: Wall[]
): PlacementElevationPairOverlap | null {
  const elevationWalls = walls.filter(isThickWall);
  if (elevationWalls.length === 0) return null;

  const candidatePlacements = placements.some((placementItem) => placementItem.id === movingPlacement.id)
    ? placements.map((placementItem) => placementItem.id === movingPlacement.id ? movingPlacement : placementItem)
    : [...placements, movingPlacement];
  const overlapToleranceInches = 0.25;

  for (const wall of elevationWalls) {
    const placements = getPlacementElevationItemsForWall(wall, candidatePlacements, elevationWalls);
    const movingPlacement = placements.find((placement) => placement.placement.id === movingPlacement.id);
    const otherPlacement = placements.find((placement) => placement.placement.id === otherPlacement.id);
    if (!movingPlacement || !otherPlacement) continue;

    const movingStartInches = movingPlacement.startInches;
    const movingEndInches = movingPlacement.startInches + movingPlacement.widthInches;
    const movingBottomInches = movingPlacement.distanceFromFloorInches;
    const movingTopInches = movingPlacement.distanceFromFloorInches + movingPlacement.heightInches;
    const otherStartInches = otherPlacement.startInches;
    const otherEndInches = otherPlacement.startInches + otherPlacement.widthInches;
    const otherBottomInches = otherPlacement.distanceFromFloorInches;
    const otherTopInches = otherPlacement.distanceFromFloorInches + otherPlacement.heightInches;

    const horizontalOverlapInches = Math.min(movingEndInches, otherEndInches) - Math.max(movingStartInches, otherStartInches);
    const verticalOverlapInches = Math.min(movingTopInches, otherTopInches) - Math.max(movingBottomInches, otherBottomInches);

    if (horizontalOverlapInches > overlapToleranceInches && verticalOverlapInches > overlapToleranceInches) {
      return {
        movingStartInches,
        movingEndInches,
        movingBottomInches,
        movingTopInches,
        otherStartInches,
        otherEndInches,
        otherBottomInches,
        otherTopInches,
      };
    }
  }

  return null;
}

export function resolvePlacementDragCenterAgainstPlacementCollisions(
  previousPlacement: PlacementElement,
  proposedPlacement: PlacementElement,
  placements: PlacementElement[],
  walls: Wall[]
): PlacementElement {
  const movement = sub(proposedPlacement.center, previousPlacement.center);

  if (Math.abs(movement.x) < 0.001 && Math.abs(movement.y) < 0.001) {
    return previousPlacement;
  }

  const hasPlacementCollision = (candidateCenter: Point) => {
    const candidatePlacement: PlacementElement = {
      ...proposedPlacement,
      center: candidateCenter,
    };

    return (
      placementIntersectsAnyPlacement(candidatePlacement, placements, previousPlacement.id) ||
      Boolean(getPlacementElevationOverlapMessage(candidatePlacement, placements, walls, previousPlacement.id))
    );
  };

  if (!hasPlacementCollision(proposedPlacement.center)) return proposedPlacement;

  const pairShouldStopDrag = (candidatePlacement: PlacementElement, otherPlacement: PlacementElement) => {
    const candidateCategory = getPlacementElevationCategory(candidatePlacement);
    const otherCategory = getPlacementElevationCategory(otherPlacement);

    // Wall cabinets can overlap in floor plan while being safe at different
    // elevations. Use the elevation projection to decide whether this pair is a
    // real cabinet collision that should block/snap the drag.
    if (isElevationFloatingPlacement(candidatePlacement) || isElevationFloatingPlacement(otherPlacement)) {
      return Boolean(getPlacementElevationPairOverlap(candidatePlacement, otherPlacement, placements, walls));
    }

    return true;
  };

  const startBounds = getRotatedRectBounds(
    previousPlacement.center,
    proposedPlacement.width,
    proposedPlacement.depth,
    proposedPlacement.rotation
  );

  const sweptStops: { center: Point; t: number }[] = [];

  for (const otherPlacement of placements) {
    if (otherPlacement.id === previousPlacement.id) continue;
    if (!pairShouldStopDrag(proposedPlacement, otherPlacement)) continue;

    const otherBounds = getRotatedRectBounds(
      otherPlacement.center,
      otherPlacement.width,
      otherPlacement.depth,
      otherPlacement.rotation
    );

    const getAxisTimes = (
      delta: number,
      movingMin: number,
      movingMax: number,
      obstacleMin: number,
      obstacleMax: number
    ) => {
      if (Math.abs(delta) < 0.001) {
        if (movingMax <= obstacleMin || movingMin >= obstacleMax) return null;
        return { entry: Number.NEGATIVE_INFINITY, exit: Number.POSITIVE_INFINITY };
      }

      if (delta > 0) {
        return {
          entry: (obstacleMin - movingMax) / delta,
          exit: (obstacleMax - movingMin) / delta,
        };
      }

      return {
        entry: (obstacleMax - movingMin) / delta,
        exit: (obstacleMin - movingMax) / delta,
      };
    };

    const xTimes = getAxisTimes(movement.x, startBounds.minX, startBounds.maxX, otherBounds.minX, otherBounds.maxX);
    const yTimes = getAxisTimes(movement.y, startBounds.minY, startBounds.maxY, otherBounds.minY, otherBounds.maxY);
    if (!xTimes || !yTimes) continue;

    const entryTime = Math.max(xTimes.entry, yTimes.entry);
    const exitTime = Math.min(xTimes.exit, yTimes.exit);

    if (entryTime > exitTime || entryTime < 0 || entryTime > 1) continue;

    sweptStops.push({
      center: add(previousPlacement.center, mul(movement, entryTime)),
      t: entryTime,
    });
  }

  if (sweptStops.length) {
    sweptStops.sort((left, right) => left.t - right.t);
    return {
      ...proposedPlacement,
      center: sweptStops[0].center,
    };
  }

  // If the drag started while already overlapping another cabinet, resolve
  // directly to the exact edge-to-edge contact point instead of stopping at a
  // last-safe sampled position. For wall cabinets, only pairs that overlap in
  // the elevation view participate in this blocking/snap calculation.
  const targetBounds = getRotatedRectBounds(
    proposedPlacement.center,
    proposedPlacement.width,
    proposedPlacement.depth,
    proposedPlacement.rotation
  );
  const snapCandidates: { center: Point; distance: number }[] = [];

  const rangesOverlap = (minA: number, maxA: number, minB: number, maxB: number) =>
    Math.min(maxA, maxB) - Math.max(minA, minB) > 0;

  for (const otherPlacement of placements) {
    if (otherPlacement.id === previousPlacement.id) continue;
    if (!pairShouldStopDrag(proposedPlacement, otherPlacement)) continue;

    const otherBounds = getRotatedRectBounds(
      otherPlacement.center,
      otherPlacement.width,
      otherPlacement.depth,
      otherPlacement.rotation
    );

    if (movement.x > 0 && rangesOverlap(targetBounds.minY, targetBounds.maxY, otherBounds.minY, otherBounds.maxY)) {
      const delta = otherBounds.minX - targetBounds.maxX;
      const center = { ...proposedPlacement.center, x: proposedPlacement.center.x + delta };
      snapCandidates.push({ center, distance: Math.abs(delta) });
    }

    if (movement.x < 0 && rangesOverlap(targetBounds.minY, targetBounds.maxY, otherBounds.minY, otherBounds.maxY)) {
      const delta = otherBounds.maxX - targetBounds.minX;
      const center = { ...proposedPlacement.center, x: proposedPlacement.center.x + delta };
      snapCandidates.push({ center, distance: Math.abs(delta) });
    }

    if (movement.y > 0 && rangesOverlap(targetBounds.minX, targetBounds.maxX, otherBounds.minX, otherBounds.maxX)) {
      const delta = otherBounds.minY - targetBounds.maxY;
      const center = { ...proposedPlacement.center, y: proposedPlacement.center.y + delta };
      snapCandidates.push({ center, distance: Math.abs(delta) });
    }

    if (movement.y < 0 && rangesOverlap(targetBounds.minX, targetBounds.maxX, otherBounds.minX, otherBounds.maxX)) {
      const delta = otherBounds.maxY - targetBounds.minY;
      const center = { ...proposedPlacement.center, y: proposedPlacement.center.y + delta };
      snapCandidates.push({ center, distance: Math.abs(delta) });
    }
  }

  if (snapCandidates.length) {
    snapCandidates.sort((left, right) => left.distance - right.distance);
    return {
      ...proposedPlacement,
      center: snapCandidates[0].center,
    };
  }

  // Some cabinet conflicts only appear in the elevation projection. Example:
  // a wall cabinet can look snapped between two base cabinets in the floor plan
  // while still overlapping one of those bases in elevation because its wall-axis
  // projection crosses the base cabinet width. Resolve those cases by moving the
  // cabinet along the elevation wall axis until its projected edge exactly
  // touches the blocking cabinet edge.
  const elevationSnapCandidates: { center: Point; distance: number; alongDrag: boolean }[] = [];
  const elevationWalls = walls.filter(isThickWall);
  const candidatePlacements = placements.some((placementItem) => placementItem.id === proposedPlacement.id)
    ? placements.map((placementItem) => placementItem.id === proposedPlacement.id ? proposedPlacement : placementItem)
    : [...placements, proposedPlacement];
  const overlapToleranceInches = 0.25;

  for (const wall of elevationWalls) {
    const axis = getElevationWallAxis(wall);
    const movementAlongAxis = dot(movement, axis.direction);
    const placements = getPlacementElevationItemsForWall(wall, candidatePlacements, elevationWalls);
    const movingPlacement = placements.find((placement) => placement.placement.id === proposedPlacement.id);
    if (!movingPlacement) continue;

    const movingStartInches = movingPlacement.startInches;
    const movingEndInches = movingPlacement.startInches + movingPlacement.widthInches;
    const movingBottomInches = movingPlacement.distanceFromFloorInches;
    const movingTopInches = movingPlacement.distanceFromFloorInches + movingPlacement.heightInches;

    for (const otherPlacement of placements) {
      if (otherPlacement.placement.id === proposedPlacement.id) continue;

      const otherStartInches = otherPlacement.startInches;
      const otherEndInches = otherPlacement.startInches + otherPlacement.widthInches;
      const otherBottomInches = otherPlacement.distanceFromFloorInches;
      const otherTopInches = otherPlacement.distanceFromFloorInches + otherPlacement.heightInches;
      const horizontalOverlapInches = Math.min(movingEndInches, otherEndInches) - Math.max(movingStartInches, otherStartInches);
      const verticalOverlapInches = Math.min(movingTopInches, otherTopInches) - Math.max(movingBottomInches, otherBottomInches);

      if (horizontalOverlapInches <= overlapToleranceInches || verticalOverlapInches <= overlapToleranceInches) {
        continue;
      }

      const shiftsInches = [
        otherStartInches - movingEndInches,
        otherEndInches - movingStartInches,
      ];

      for (const shiftInches of shiftsInches) {
        if (Math.abs(shiftInches) <= overlapToleranceInches) continue;

        const shiftPixels = inchesToPixels(shiftInches);
        const center = add(proposedPlacement.center, mul(axis.direction, shiftPixels));

        if (hasPlacementCollision(center)) continue;

        const alongDrag = Math.abs(movementAlongAxis) < 0.001
          ? true
          : Math.sign(shiftPixels) !== Math.sign(movementAlongAxis);

        elevationSnapCandidates.push({
          center,
          distance: Math.abs(shiftPixels),
          alongDrag,
        });
      }
    }
  }

  if (elevationSnapCandidates.length) {
    elevationSnapCandidates.sort((left, right) => {
      if (left.alongDrag !== right.alongDrag) return left.alongDrag ? -1 : 1;
      return left.distance - right.distance;
    });

    return {
      ...proposedPlacement,
      center: elevationSnapCandidates[0].center,
    };
  }

  return previousPlacement;
}

export function getPlacementPlanHandleTabWorldBounds(
  placementItem: Pick<PlacementElement, "center" | "width" | "depth" | "rotation"> & Partial<Pick<PlacementElement, "category" | "image">>
) {
  const radians = degreesToRadians(placementItem.rotation);
  const cosValue = Math.cos(radians);
  const sinValue = Math.sin(radians);

  return getPlacementPlanHandleTabRects(placementItem).map((tab) => {
    const corners = [
      { x: tab.x, y: tab.y },
      { x: tab.x + tab.width, y: tab.y },
      { x: tab.x + tab.width, y: tab.y + tab.height },
      { x: tab.x, y: tab.y + tab.height },
    ].map((corner) => ({
      x: placementItem.center.x + corner.x * cosValue - corner.y * sinValue,
      y: placementItem.center.y + corner.x * sinValue + corner.y * cosValue,
    }));
    const xs = corners.map((corner) => corner.x);
    const ys = corners.map((corner) => corner.y);

    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  });
}

export function rectContainsRect(
  outer: { minX: number; maxX: number; minY: number; maxY: number },
  inner: { minX: number; maxX: number; minY: number; maxY: number },
  tolerance = 0
) {
  return (
    inner.minX >= outer.minX - tolerance &&
    inner.maxX <= outer.maxX + tolerance &&
    inner.minY >= outer.minY - tolerance &&
    inner.maxY <= outer.maxY + tolerance
  );
}

export function placementOpenSegmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  if (!segmentsIntersect(a, b, c, d)) return false;

  const aOnWall = pointOnSegment(a, c, d);
  const bOnWall = pointOnSegment(b, c, d);
  const cOnPlacement = pointOnSegment(c, a, b);
  const dOnPlacement = pointOnSegment(d, a, b);

  const onlyTouching = aOnWall || bOnWall || cOnPlacement || dOnPlacement;
  // Treat pure edge/corner contact as allowed. A cabinet should be able to sit
  // flush beside a wall or at an inside corner without showing a red invalid
  // preview. Real wall penetration is still caught when a cabinet corner is
  // inside the wall polygon or when edges cross through each other away from
  // endpoints.
  if (onlyTouching) return false;

  return true;
}

export function getPlacementMenuPosition(placementItem: PlacementElement): Point {
  const menuWidth = 82;
  const menuHeight = 54;
  const ringOuterRadius = Math.max(placementItem.width, placementItem.depth) / 2 + 20;
  const gapAboveRing = 10;
  return {
    x: placementItem.center.x - menuWidth / 2,
    y: placementItem.center.y - ringOuterRadius - menuHeight - gapAboveRing,
  };
}

export function arePlacementsEqual(left: PlacementElement[], right: PlacementElement[]) {
  if (left.length !== right.length) return false;

  return left.every((placementItem, index) => {
    const otherPlacement = right[index];
    return (
      otherPlacement &&
      placementItem.id === otherPlacement.id &&
      Math.abs(placementItem.center.x - otherPlacement.center.x) < 0.001 &&
      Math.abs(placementItem.center.y - otherPlacement.center.y) < 0.001 &&
      Math.abs(placementItem.width - otherPlacement.width) < 0.001 &&
      Math.abs(placementItem.depth - otherPlacement.depth) < 0.001 &&
      Math.abs(placementItem.rotation - otherPlacement.rotation) < 0.001 &&
      Math.abs((placementItem.heightInches ?? 0) - (otherPlacement.heightInches ?? 0)) < 0.001 &&
      Math.abs((placementItem.distanceFromFloorInches ?? 0) - (otherPlacement.distanceFromFloorInches ?? 0)) < 0.001 &&
      Math.abs((placementItem.cooktopFrontHeightInches ?? 0) - (otherPlacement.cooktopFrontHeightInches ?? 0)) < 0.001 &&
      Math.abs((placementItem.blindDoorWidthInches ?? 0) - (otherPlacement.blindDoorWidthInches ?? 0)) < 0.001 &&
      Math.abs((placementItem.blindFillerWidthInches ?? 0) - (otherPlacement.blindFillerWidthInches ?? 0)) < 0.001 &&
      Math.abs((placementItem.ovenCabinetProductHeightInches ?? 0) - (otherPlacement.ovenCabinetProductHeightInches ?? 0)) < 0.001 &&
      Math.abs((placementItem.ovenCabinetFillerHeightInches ?? 0) - (otherPlacement.ovenCabinetFillerHeightInches ?? 0)) < 0.001 &&
      Math.abs((placementItem.ovenCabinetBottomDrawerHeightInches ?? 0) - (otherPlacement.ovenCabinetBottomDrawerHeightInches ?? 0)) < 0.001 &&
      (placementItem.category ?? null) === (otherPlacement.category ?? null) &&
      (placementItem.catalogId ?? null) === (otherPlacement.catalogId ?? null) &&
      (placementItem.image ?? null) === (otherPlacement.image ?? null) &&
      Boolean(placementItem.sinkFixture) === Boolean(otherPlacement.sinkFixture) &&
      (placementItem.cooktopFixture ?? null) === (otherPlacement.cooktopFixture ?? null) &&
      (placementItem.ovenCabinetProductLayout ?? "none") ===
        (otherPlacement.ovenCabinetProductLayout ?? "none") &&
      (placementItem.wallId ?? null) === (otherPlacement.wallId ?? null) &&
      (placementItem.wallFace ?? null) === (otherPlacement.wallFace ?? null)
    );
  });
}

export function getPlacementWallDistanceMetrics(placementItem: PlacementElement, walls: Wall[]): PlacementDistanceMetric[] {
  const bounds = getRotatedRectBounds(
    placementItem.center,
    placementItem.width,
    placementItem.depth,
    placementItem.rotation
  );
  const metrics: PlacementDistanceMetric[] = [];
  const wallFacePadding = WALL_THICKNESS / 2;
  const usableWalls = walls.filter(isThickWall);
  const verticalWalls = usableWalls.filter((wall) => Math.abs(wall.start.x - wall.end.x) < Math.abs(wall.start.y - wall.end.y));
  const horizontalWalls = usableWalls.filter((wall) => Math.abs(wall.start.y - wall.end.y) <= Math.abs(wall.start.x - wall.end.x));

  const verticalOverlap = (wall: Wall) =>
    Math.max(wall.start.y, wall.end.y) >= bounds.minY &&
    Math.min(wall.start.y, wall.end.y) <= bounds.maxY;

  const horizontalOverlap = (wall: Wall) =>
    Math.max(wall.start.x, wall.end.x) >= bounds.minX &&
    Math.min(wall.start.x, wall.end.x) <= bounds.maxX;

  const leftWall = verticalWalls
    .filter(verticalOverlap)
    .map((wall) => {
      const centerX = (wall.start.x + wall.end.x) / 2;
      return { wall, faceX: centerX + wallFacePadding };
    })
    .filter((item) => item.faceX <= bounds.minX + 0.001)
    .sort((a, b) => b.faceX - a.faceX)[0];

  const rightWall = verticalWalls
    .filter(verticalOverlap)
    .map((wall) => {
      const centerX = (wall.start.x + wall.end.x) / 2;
      return { wall, faceX: centerX - wallFacePadding };
    })
    .filter((item) => item.faceX >= bounds.maxX - 0.001)
    .sort((a, b) => a.faceX - b.faceX)[0];

  const topWall = horizontalWalls
    .filter(horizontalOverlap)
    .map((wall) => {
      const centerY = (wall.start.y + wall.end.y) / 2;
      return { wall, faceY: centerY + wallFacePadding };
    })
    .filter((item) => item.faceY <= bounds.minY + 0.001)
    .sort((a, b) => b.faceY - a.faceY)[0];

  const bottomWall = horizontalWalls
    .filter(horizontalOverlap)
    .map((wall) => {
      const centerY = (wall.start.y + wall.end.y) / 2;
      return { wall, faceY: centerY - wallFacePadding };
    })
    .filter((item) => item.faceY >= bounds.maxY - 0.001)
    .sort((a, b) => a.faceY - b.faceY)[0];

  if (leftWall) {
    const y = placementItem.center.y;
    const start = { x: leftWall.faceX, y };
    const end = { x: bounds.minX, y };
    const midX = (start.x + end.x) / 2;
    metrics.push({
      key: "left",
      start,
      end,
      tickStart: { x: start.x, y: y - 8 },
      tickEnd: { x: start.x, y: y + 8 },
      label: { x: midX, y: y - 16 },
      distance: Math.max(0, Math.abs(end.x - start.x)),
    });
  }

  if (rightWall) {
    const y = placementItem.center.y;
    const start = { x: bounds.maxX, y };
    const end = { x: rightWall.faceX, y };
    const midX = (start.x + end.x) / 2;
    metrics.push({
      key: "right",
      start,
      end,
      tickStart: { x: end.x, y: y - 8 },
      tickEnd: { x: end.x, y: y + 8 },
      label: { x: midX, y: y - 16 },
      distance: Math.max(0, Math.abs(end.x - start.x)),
    });
  }

  if (topWall) {
    const x = placementItem.center.x;
    const start = { x, y: topWall.faceY };
    const end = { x, y: bounds.minY };
    const midY = (start.y + end.y) / 2;
    metrics.push({
      key: "top",
      start,
      end,
      tickStart: { x: x - 8, y: start.y },
      tickEnd: { x: x + 8, y: start.y },
      label: { x: x + 34, y: midY + 4 },
      distance: Math.max(0, Math.abs(end.y - start.y)),
    });
  }

  if (bottomWall) {
    const x = placementItem.center.x;
    const start = { x, y: bounds.maxY };
    const end = { x, y: bottomWall.faceY };
    const midY = (start.y + end.y) / 2;
    metrics.push({
      key: "bottom",
      start,
      end,
      tickStart: { x: x - 8, y: end.y },
      tickEnd: { x: x + 8, y: end.y },
      label: { x: x + 34, y: midY + 4 },
      distance: Math.max(0, Math.abs(end.y - start.y)),
    });
  }

  return metrics.filter((metric) => metric.distance > 0.5);
}

export function placementIntersectsAnyWall(
  placementItem: Pick<PlacementElement, "center" | "width" | "depth" | "rotation">,
  walls: Wall[]
) {
  const collisionWidth = Math.max(1, placementItem.width - 1);
  const collisionDepth = Math.max(1, placementItem.depth - 1);
  const corners = getRotatedRectCorners(placementItem.center, collisionWidth, collisionDepth, placementItem.rotation);
  const edges = corners.map((corner, index) => ({
    start: corner,
    end: corners[(index + 1) % corners.length],
  }));

  return walls.filter(isThickWall).some((wall) => {
    const wallDirection = normalize(sub(wall.end, wall.start));
    const wallNormal = perp(wallDirection);
    const wallCorners = [
      add(wall.start, mul(wallNormal, WALL_THICKNESS / 2)),
      add(wall.end, mul(wallNormal, WALL_THICKNESS / 2)),
      add(wall.end, mul(wallNormal, -WALL_THICKNESS / 2)),
      add(wall.start, mul(wallNormal, -WALL_THICKNESS / 2)),
    ];
    const wallEdges = wallCorners.map((corner, index) => ({
      start: corner,
      end: wallCorners[(index + 1) % wallCorners.length],
    }));

    return (
      corners.some((corner) => pointInPolygon(corner, wallCorners)) ||
      wallCorners.some((corner) => pointInPolygon(corner, corners)) ||
      edges.some((edge) =>
        wallEdges.some((wallEdge) => placementOpenSegmentsIntersect(edge.start, edge.end, wallEdge.start, wallEdge.end))
      )
    );
  });
}

export function polygonsIntersect(firstPolygon: Point[], secondPolygon: Point[]) {
  const firstEdges = firstPolygon.map((point, index) => ({
    start: point,
    end: firstPolygon[(index + 1) % firstPolygon.length],
  }));
  const secondEdges = secondPolygon.map((point, index) => ({
    start: point,
    end: secondPolygon[(index + 1) % secondPolygon.length],
  }));

  return (
    firstPolygon.some((point) => pointInPolygon(point, secondPolygon)) ||
    secondPolygon.some((point) => pointInPolygon(point, firstPolygon)) ||
    firstEdges.some((firstEdge) =>
      secondEdges.some((secondEdge) =>
        placementOpenSegmentsIntersect(firstEdge.start, firstEdge.end, secondEdge.start, secondEdge.end)
      )
    )
  );
}

export function getDetachedPanelWallCollisionCorners(wall: Wall, structuralWalls: Wall[] = []) {
  const visibleSegment = getPeninWallVisibleSegment(wall, structuralWalls);
  const panelLength = distance(visibleSegment.start, visibleSegment.end);
  if (panelLength < 0.001) return null;

  return getRotatedRectCorners(
    midpoint(visibleSegment.start, visibleSegment.end),
    Math.max(1, panelLength - 1),
    Math.max(1, PENIN_WALL_THICKNESS - 1),
    getAngleDegrees(visibleSegment.start, visibleSegment.end)
  );
}

export function detachedPanelWallIntersectsFloorPlacement(
  wall: Wall,
  placements: PlacementElement[],
  structuralWalls: Wall[] = [],
  allWalls: Wall[] = [],
  excludedWallId?: string
) {
  const panelCorners = getDetachedPanelWallCollisionCorners(wall, structuralWalls);
  if (!panelCorners) return false;

  const overlapsFloorPlacement = placements.some((placementItem) => {
    if (getPlacementElevationCategory(placementItem) === "wall") return false;

    const placementCorners = getRotatedRectCorners(
      placementItem.center,
      Math.max(1, placementItem.width - 1),
      Math.max(1, placementItem.depth - 1),
      placementItem.rotation
    );

    return polygonsIntersect(panelCorners, placementCorners);
  });

  if (overlapsFloorPlacement) return true;

  const otherDetachedPanels = allWalls.filter(
    (otherWall) =>
      otherWall.id !== excludedWallId &&
      otherWall.id !== wall.id &&
      isDetachedPanelWall(otherWall)
  );

  return otherDetachedPanels.some((otherWall) => {
    const otherPanelCorners = getDetachedPanelWallCollisionCorners(otherWall, structuralWalls);
    return Boolean(otherPanelCorners && polygonsIntersect(panelCorners, otherPanelCorners));
  });
}

export function detectPlacementAttachmentSides(
  placementItem: PlacementElement,
  walls: Wall[],
  placements: PlacementElement[]
): Set<"left" | "right" | "top" | "bottom"> {
  const touchTolerance = 4;
  const bounds = getRotatedRectBounds(
    placementItem.center,
    placementItem.width,
    placementItem.depth,
    placementItem.rotation
  );
  const attachedSides = new Set<"left" | "right" | "top" | "bottom">();

  const rangesOverlap = (
    minA: number,
    maxA: number,
    minB: number,
    maxB: number,
    tolerance = touchTolerance
  ) => Math.min(maxA, maxB) - Math.max(minA, minB) >= -tolerance;

  walls.filter(isThickWall).forEach((wall) => {
    const wallBounds = getWallRectBounds(wall);

    if (rangesOverlap(bounds.minY, bounds.maxY, wallBounds.minY, wallBounds.maxY)) {
      if (Math.abs(bounds.minX - wallBounds.maxX) <= touchTolerance) attachedSides.add("left");
      if (Math.abs(bounds.maxX - wallBounds.minX) <= touchTolerance) attachedSides.add("right");
    }

    if (rangesOverlap(bounds.minX, bounds.maxX, wallBounds.minX, wallBounds.maxX)) {
      if (Math.abs(bounds.minY - wallBounds.maxY) <= touchTolerance) attachedSides.add("top");
      if (Math.abs(bounds.maxY - wallBounds.minY) <= touchTolerance) attachedSides.add("bottom");
    }
  });

  placements.forEach((otherPlacement) => {
    if (otherPlacement.id === placementItem.id) return;

    const otherBounds = getRotatedRectBounds(
      otherPlacement.center,
      otherPlacement.width,
      otherPlacement.depth,
      otherPlacement.rotation
    );

    if (rangesOverlap(bounds.minY, bounds.maxY, otherBounds.minY, otherBounds.maxY)) {
      if (Math.abs(bounds.minX - otherBounds.maxX) <= touchTolerance) attachedSides.add("left");
      if (Math.abs(bounds.maxX - otherBounds.minX) <= touchTolerance) attachedSides.add("right");
    }

    if (rangesOverlap(bounds.minX, bounds.maxX, otherBounds.minX, otherBounds.maxX)) {
      if (Math.abs(bounds.minY - otherBounds.maxY) <= touchTolerance) attachedSides.add("top");
      if (Math.abs(bounds.maxY - otherBounds.minY) <= touchTolerance) attachedSides.add("bottom");
    }
  });

  return attachedSides;
}

export function keepPlacementResizeAnchoredToAttachments(
  previousPlacement: PlacementElement,
  proposedPlacement: PlacementElement,
  walls: Wall[],
  placements: PlacementElement[]
): PlacementElement {
  const attachedSides = detectPlacementAttachmentSides(previousPlacement, walls, placements);
  if (attachedSides.size === 0) return proposedPlacement;

  const previousBounds = getRotatedRectBounds(
    previousPlacement.center,
    previousPlacement.width,
    previousPlacement.depth,
    previousPlacement.rotation
  );
  const radians = degreesToRadians(normalizeDegrees(previousPlacement.rotation));
  const widthAxisHorizontal = Math.abs(Math.cos(radians)) >= Math.abs(Math.sin(radians));
  let nextCenter = { ...proposedPlacement.center };

  if (Math.abs(previousPlacement.width - proposedPlacement.width) > 0.001) {
    if (widthAxisHorizontal) {
      if (attachedSides.has("left") && !attachedSides.has("right")) {
        nextCenter = { ...nextCenter, x: previousBounds.minX + proposedPlacement.width / 2 };
      } else if (attachedSides.has("right") && !attachedSides.has("left")) {
        nextCenter = { ...nextCenter, x: previousBounds.maxX - proposedPlacement.width / 2 };
      }
    } else {
      if (attachedSides.has("top") && !attachedSides.has("bottom")) {
        nextCenter = { ...nextCenter, y: previousBounds.minY + proposedPlacement.width / 2 };
      } else if (attachedSides.has("bottom") && !attachedSides.has("top")) {
        nextCenter = { ...nextCenter, y: previousBounds.maxY - proposedPlacement.width / 2 };
      }
    }
  }

  if (Math.abs(previousPlacement.depth - proposedPlacement.depth) > 0.001) {
    if (widthAxisHorizontal) {
      if (attachedSides.has("top") && !attachedSides.has("bottom")) {
        nextCenter = { ...nextCenter, y: previousBounds.minY + proposedPlacement.depth / 2 };
      } else if (attachedSides.has("bottom") && !attachedSides.has("top")) {
        nextCenter = { ...nextCenter, y: previousBounds.maxY - proposedPlacement.depth / 2 };
      }
    } else {
      if (attachedSides.has("left") && !attachedSides.has("right")) {
        nextCenter = { ...nextCenter, x: previousBounds.minX + proposedPlacement.depth / 2 };
      } else if (attachedSides.has("right") && !attachedSides.has("left")) {
        nextCenter = { ...nextCenter, x: previousBounds.maxX - proposedPlacement.depth / 2 };
      }
    }
  }

  return {
    ...proposedPlacement,
    center: nextCenter,
  };
}

export function resolvePlacementDimensionChange(
  previousPlacement: PlacementElement,
  proposedPlacement: PlacementElement,
  walls: Wall[],
  placements: PlacementElement[]
): PlacementElement {
  const attachmentAwarePlacement = keepPlacementResizeAnchoredToAttachments(
    previousPlacement,
    proposedPlacement,
    walls,
    placements
  );

  return resolvePlacementDimensionChangeAgainstWalls(
    previousPlacement,
    attachmentAwarePlacement,
    walls
  );
}

export function resolvePlacementDimensionChangeAgainstWalls(
  previousPlacement: PlacementElement,
  proposedPlacement: PlacementElement,
  walls: Wall[]
): PlacementElement {
  const thickWalls = walls.filter(isThickWall);
  if (!placementIntersectsAnyWall(proposedPlacement, thickWalls)) return proposedPlacement;

  const wallAnchoredPlacement = keepPlacementOnTouchedWallFaces(
    previousPlacement,
    proposedPlacement,
    thickWalls
  );
  if (!placementIntersectsAnyWall(wallAnchoredPlacement, thickWalls)) return wallAnchoredPlacement;

  const pushedPlacement = pushPlacementOutsideWallOverlaps(wallAnchoredPlacement, thickWalls);
  if (!placementIntersectsAnyWall(pushedPlacement, thickWalls)) return pushedPlacement;

  return previousPlacement;
}

export function keepPlacementOnTouchedWallFaces(
  previousPlacement: PlacementElement,
  proposedPlacement: PlacementElement,
  walls: Wall[]
): PlacementElement {
  const touchTolerance = 3;
  const previousBounds = getRotatedRectBounds(
    previousPlacement.center,
    previousPlacement.width,
    previousPlacement.depth,
    previousPlacement.rotation
  );
  let adjustedPlacement = { ...proposedPlacement };

  const rangesOverlap = (minA: number, maxA: number, minB: number, maxB: number) =>
    Math.min(maxA, maxB) - Math.max(minA, minB) >= -touchTolerance;

  for (const wall of walls) {
    const wallBounds = getWallRectBounds(wall);
    let nextBounds = getRotatedRectBounds(
      adjustedPlacement.center,
      adjustedPlacement.width,
      adjustedPlacement.depth,
      adjustedPlacement.rotation
    );

    const overlapsY = rangesOverlap(previousBounds.minY, previousBounds.maxY, wallBounds.minY, wallBounds.maxY);
    if (overlapsY) {
      if (Math.abs(previousBounds.maxX - wallBounds.minX) <= touchTolerance && nextBounds.maxX > wallBounds.minX) {
        adjustedPlacement = {
          ...adjustedPlacement,
          center: { ...adjustedPlacement.center, x: adjustedPlacement.center.x - (nextBounds.maxX - wallBounds.minX) },
        };
      }
      nextBounds = getRotatedRectBounds(
        adjustedPlacement.center,
        adjustedPlacement.width,
        adjustedPlacement.depth,
        adjustedPlacement.rotation
      );
      if (Math.abs(previousBounds.minX - wallBounds.maxX) <= touchTolerance && nextBounds.minX < wallBounds.maxX) {
        adjustedPlacement = {
          ...adjustedPlacement,
          center: { ...adjustedPlacement.center, x: adjustedPlacement.center.x + (wallBounds.maxX - nextBounds.minX) },
        };
      }
    }

    nextBounds = getRotatedRectBounds(
      adjustedPlacement.center,
      adjustedPlacement.width,
      adjustedPlacement.depth,
      adjustedPlacement.rotation
    );
    const overlapsX = rangesOverlap(previousBounds.minX, previousBounds.maxX, wallBounds.minX, wallBounds.maxX);
    if (overlapsX) {
      if (Math.abs(previousBounds.maxY - wallBounds.minY) <= touchTolerance && nextBounds.maxY > wallBounds.minY) {
        adjustedPlacement = {
          ...adjustedPlacement,
          center: { ...adjustedPlacement.center, y: adjustedPlacement.center.y - (nextBounds.maxY - wallBounds.minY) },
        };
      }
      nextBounds = getRotatedRectBounds(
        adjustedPlacement.center,
        adjustedPlacement.width,
        adjustedPlacement.depth,
        adjustedPlacement.rotation
      );
      if (Math.abs(previousBounds.minY - wallBounds.maxY) <= touchTolerance && nextBounds.minY < wallBounds.maxY) {
        adjustedPlacement = {
          ...adjustedPlacement,
          center: { ...adjustedPlacement.center, y: adjustedPlacement.center.y + (wallBounds.maxY - nextBounds.minY) },
        };
      }
    }
  }

  return adjustedPlacement;
}

export function pushPlacementOutsideWallOverlaps(placementItem: PlacementElement, walls: Wall[]): PlacementElement {
  let adjustedPlacement = { ...placementItem };

  for (let index = 0; index < 6; index += 1) {
    let moved = false;
    let placementBounds = getRotatedRectBounds(
      adjustedPlacement.center,
      adjustedPlacement.width,
      adjustedPlacement.depth,
      adjustedPlacement.rotation
    );

    for (const wall of walls) {
      const wallBounds = getWallRectBounds(wall);
      const overlapX = Math.min(placementBounds.maxX, wallBounds.maxX) - Math.max(placementBounds.minX, wallBounds.minX);
      const overlapY = Math.min(placementBounds.maxY, wallBounds.maxY) - Math.max(placementBounds.minY, wallBounds.minY);
      if (overlapX <= 0 || overlapY <= 0) continue;

      const placementCenterX = (placementBounds.minX + placementBounds.maxX) / 2;
      const placementCenterY = (placementBounds.minY + placementBounds.maxY) / 2;
      const wallCenterX = (wallBounds.minX + wallBounds.maxX) / 2;
      const wallCenterY = (wallBounds.minY + wallBounds.maxY) / 2;
      const clearance = 0.75;

      if (overlapX <= overlapY) {
        const direction = placementCenterX < wallCenterX ? -1 : 1;
        adjustedPlacement = {
          ...adjustedPlacement,
          center: { ...adjustedPlacement.center, x: adjustedPlacement.center.x + direction * (overlapX + clearance) },
        };
      } else {
        const direction = placementCenterY < wallCenterY ? -1 : 1;
        adjustedPlacement = {
          ...adjustedPlacement,
          center: { ...adjustedPlacement.center, y: adjustedPlacement.center.y + direction * (overlapY + clearance) },
        };
      }

      placementBounds = getRotatedRectBounds(
        adjustedPlacement.center,
        adjustedPlacement.width,
        adjustedPlacement.depth,
        adjustedPlacement.rotation
      );
      moved = true;
    }

    if (!moved) break;
  }

  return adjustedPlacement;
}

export function getWallRectBounds(wall: Wall) {
  const direction = normalize(sub(wall.end, wall.start));
  const normal = perp(direction);
  const corners = [
    add(wall.start, mul(normal, WALL_THICKNESS / 2)),
    add(wall.end, mul(normal, WALL_THICKNESS / 2)),
    add(wall.end, mul(normal, -WALL_THICKNESS / 2)),
    add(wall.start, mul(normal, -WALL_THICKNESS / 2)),
  ];
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

export function getRotatedRectCorners(center: Point, width: number, depth: number, rotation: number) {
  const radians = degreesToRadians(rotation);
  const cosValue = Math.cos(radians);
  const sinValue = Math.sin(radians);
  const localCorners = [
    { x: -width / 2, y: -depth / 2 },
    { x: width / 2, y: -depth / 2 },
    { x: width / 2, y: depth / 2 },
    { x: -width / 2, y: depth / 2 },
  ];

  return localCorners.map((corner) => ({
    x: center.x + corner.x * cosValue - corner.y * sinValue,
    y: center.y + corner.x * sinValue + corner.y * cosValue,
  }));
}

export function PlacementPlanAccessoryDetails({
  placementItem,
  inset,
  stroke,
  detailOpacity,
}: {
  placementItem: PlacementElement;
  inset: number;
  stroke: string;
  detailOpacity: number;
}) {
  const { width, depth } = placementItem;
  const items: React.ReactNode[] = [];

  if (placementItem.sinkFixture) {
    const sinkWidth = Math.max(width * 0.38, width - inset * 4.2);
    const sinkDepth = Math.max(depth * 0.22, depth - inset * 5.2);
    const sinkX = -sinkWidth / 2;
    const sinkY = -depth / 2 + inset * 1.65;
    const faucetY = sinkY - Math.max(2.5, inset * 0.45);
    const faucetReach = Math.max(5, Math.min(10, depth * 0.18));
    const faucetHeight = Math.max(5, Math.min(11, depth * 0.28));
    items.push(
      <g key="sink-fixture-plan">
        <rect x={sinkX} y={sinkY} width={sinkWidth} height={sinkDepth} rx={Math.min(6, sinkDepth * 0.28)} fill="none" stroke={stroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <ellipse cx={0} cy={sinkY + sinkDepth / 2} rx={Math.max(5, sinkWidth * 0.18)} ry={Math.max(2.2, sinkDepth * 0.2)} fill="none" stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d={`M ${-faucetReach * 0.38} ${faucetY} C ${-faucetReach * 0.18} ${faucetY - faucetHeight * 0.78}, ${faucetReach * 0.42} ${faucetY - faucetHeight * 0.78}, ${faucetReach * 0.42} ${faucetY + faucetReach * 0.22}`} fill="none" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (placementItem.cooktopFixture) {
    const topX = -width / 2 + inset * 1.55;
    const topY = -depth / 2 + inset * 1.1;
    const topWidth = width - inset * 3.1;
    const topHeight = Math.max(depth * 0.68, depth - inset * 2.45);
    const burnerRadius = Math.max(2.2, Math.min(5.2, Math.min(topWidth, topHeight) * 0.13));

    if (placementItem.cooktopFixture === "surface") {
      const frameX = topX + topWidth * 0.04;
      const frameY = topY + topHeight * 0.06;
      const frameWidth = topWidth * 0.92;
      const frameHeight = topHeight * 0.52;
      const knobY = topY + topHeight * 0.82;
      items.push(
        <g key="cooktop-fixture-plan-surface">
          <rect
            x={frameX}
            y={frameY}
            width={frameWidth}
            height={frameHeight}
            rx={Math.min(7, frameHeight * 0.22)}
            fill="#f8f6ef"
            stroke="#64748b"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          {[0.22, 0.78].map((xRatio) => [0.3, 0.7].map((yRatio) => (
            <circle
              key={`surface-cooktop-burner-${xRatio}-${yRatio}`}
              cx={frameX + frameWidth * xRatio}
              cy={frameY + frameHeight * yRatio}
              r={burnerRadius}
              fill="none"
              stroke={stroke}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )))}
          {[0.18, 0.39, 0.61, 0.82].map((ratio) => (
            <circle
              key={`surface-cooktop-knob-plan-${ratio}`}
              cx={frameX + frameWidth * ratio}
              cy={knobY}
              r={Math.max(2.8, Math.min(5.2, topWidth * 0.06))}
              fill="#111827"
            />
          ))}
        </g>
      );
    } else {
      const burnerFrameX = topX + topWidth * 0.04;
      const burnerFrameY = topY + topHeight * 0.06;
      const burnerFrameWidth = topWidth * 0.92;
      const burnerFrameHeight = topHeight * 0.48;
      const controlBarHeight = Math.max(5, topHeight * 0.2);
      const controlBarY = topY + topHeight - controlBarHeight;
      items.push(
        <g key="cooktop-fixture-plan-front-control">
          <rect
            x={burnerFrameX}
            y={burnerFrameY}
            width={burnerFrameWidth}
            height={burnerFrameHeight}
            rx={Math.min(7, burnerFrameHeight * 0.22)}
            fill="#f8f6ef"
            stroke="#64748b"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
          {[0.22, 0.78].map((xRatio) => [0.3, 0.7].map((yRatio) => (
            <circle
              key={`front-cooktop-burner-${xRatio}-${yRatio}`}
              cx={burnerFrameX + burnerFrameWidth * xRatio}
              cy={burnerFrameY + burnerFrameHeight * yRatio}
              r={burnerRadius}
              fill="none"
              stroke={stroke}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )))}
          <rect
            x={topX}
            y={controlBarY}
            width={topWidth}
            height={controlBarHeight}
            fill="#cbd5e1"
            stroke="#94a3b8"
            strokeWidth="0.9"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      );
    }
  }

  if (!items.length) return null;
  return <g opacity={detailOpacity}>{items}</g>;
}

export function ElevationPlacementAccessoryDetails({
  placement,
  x,
  y,
  width,
  height,
  innerStroke,
  handleStroke,
  frontControlBlockHeight = 0,
}: {
  placement: PlacementElement;
  x: number;
  y: number;
  width: number;
  height: number;
  innerStroke: string;
  handleStroke: string;
  frontControlBlockHeight?: number;
}) {
  const children: React.ReactNode[] = [];

  if (placement.sinkFixture) {
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

  if (placement.cooktopFixture) {
    const cooktopHeight = Math.max(5, Math.min(12, height * 0.08));
    const cooktopX = x + width * 0.14;
    const cooktopWidth = width * 0.72;

    if (placement.cooktopFixture === "front") {
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

export function PlacementPlanVariantDetails({
  placementItem,
  inset,
  stroke,
  detailOpacity,
}: {
  placementItem: PlacementElement;
  inset: number;
  stroke: string;
  detailOpacity: number;
}) {
  const { width, depth } = placementItem;
  const image = getPlacementImage(placementItem);
  const blindPlacementWidths = isBlindCabinetImage(image)
    ? getBlindCabinetWidthSegments(placementItem)
    : null;
  const topLine = (
    <line
      x1={-width / 2 + 6}
      y1={-depth / 2 + 6}
      x2={width / 2 - 6}
      y2={-depth / 2 + 6}
      stroke="#cbd5e1"
      strokeOpacity={detailOpacity}
      strokeWidth="2"
      vectorEffect="non-scaling-stroke"
    />
  );


  if (image === "base-dishwasher") {
    const bodyX = -width / 2 + inset * 1.35;
    const bodyY = -depth / 2 + inset * 1.35;
    const bodyWidth = width - inset * 2.7;
    const bodyHeight = depth - inset * 2.7;
    const handleY = depth / 2 - inset * 1.75;
    return (
      <g opacity={detailOpacity}>
        <rect x={bodyX} y={bodyY} width={bodyWidth} height={bodyHeight} rx="2" fill="none" stroke={stroke} strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
        <line x1={bodyX + bodyWidth * 0.16} y1={handleY} x2={bodyX + bodyWidth * 0.84} y2={handleY} stroke="#111827" strokeWidth="1.8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={bodyX} y1={-depth / 2 + inset * 2.15} x2={bodyX + bodyWidth} y2={-depth / 2 + inset * 2.15} stroke="#94a3b8" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }


  if (image === "base-refrigerator") {
    const bodyX = -width / 2 + inset * 1.15;
    const bodyY = -depth / 2 + inset * 1.15;
    const bodyWidth = width - inset * 2.3;
    const bodyHeight = depth - inset * 2.3;
    const frontY = depth / 2 - inset * 1.3;
    return (
      <g opacity={detailOpacity}>
        <rect x={bodyX} y={bodyY} width={bodyWidth} height={bodyHeight} rx="2" fill="none" stroke={stroke} strokeWidth="1.15" vectorEffect="non-scaling-stroke" />
        <line x1={0} y1={bodyY} x2={0} y2={frontY} stroke={stroke} strokeWidth="1.05" vectorEffect="non-scaling-stroke" />
        <line x1={bodyX} y1={frontY} x2={bodyX + bodyWidth} y2={frontY} stroke="#111827" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        <line x1={-width * 0.08} y1={frontY - bodyHeight * 0.22} x2={-width * 0.08} y2={frontY - bodyHeight * 0.04} stroke="#111827" strokeWidth="1.8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <line x1={width * 0.08} y1={frontY - bodyHeight * 0.22} x2={width * 0.08} y2={frontY - bodyHeight * 0.04} stroke="#111827" strokeWidth="1.8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (image === "base-range") {
    const cooktopX = -width / 2 + inset * 1.5;
    const cooktopY = -depth / 2 + inset * 1.4;
    const cooktopWidth = width - inset * 3;
    const cooktopHeight = depth - inset * 3.2;
    return (
      <g opacity={detailOpacity}>
        {topLine}
        <rect x={cooktopX} y={cooktopY} width={cooktopWidth} height={cooktopHeight} rx="3" fill="#e5e7eb" stroke={stroke} strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
        {[0.25, 0.75].map((xRatio) => [0.3, 0.68].map((yRatio) => <circle key={`range-plan-burner-${xRatio}-${yRatio}`} cx={cooktopX + cooktopWidth * xRatio} cy={cooktopY + cooktopHeight * yRatio} r={Math.max(2.2, Math.min(5.4, Math.min(cooktopWidth, cooktopHeight) * 0.12))} fill="none" stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" />))}
        <rect x={-width / 2 + inset * 1.6} y={depth / 2 - inset * 1.3} width={width - inset * 3.2} height={Math.max(5, inset * 0.85)} rx="1.5" fill="#111827" opacity="0.9" />
      </g>
    );
  }

  if (image === "wall-hood") {
    const backY = -depth / 2 + inset * 1.1;
    const frontY = depth / 2 - inset * 1.1;
    return (
      <g opacity={detailOpacity}>
        <path d={`M ${-width * 0.28} ${backY} L ${width * 0.28} ${backY} L ${width / 2 - inset * 1.2} ${frontY} L ${-width / 2 + inset * 1.2} ${frontY} Z`} fill="none" stroke={stroke} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <line x1={-width * 0.34} y1={frontY - depth * 0.12} x2={width * 0.34} y2={frontY - depth * 0.12} stroke="#111827" strokeWidth="1.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (image === "wall-microwave" || image === "wall-oven" || image === "wall-double-oven") {
    const bodyX = -width / 2 + inset * 1.35;
    const bodyY = -depth / 2 + inset * 1.35;
    const bodyWidth = width - inset * 2.7;
    const bodyHeight = depth - inset * 2.7;
    const isDoubleOven = image === "wall-double-oven";
    return (
      <g opacity={detailOpacity}>
        <rect x={bodyX} y={bodyY} width={bodyWidth} height={bodyHeight} rx="2" fill="none" stroke={stroke} strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
        <line x1={bodyX} y1={depth / 2 - inset * 1.45} x2={bodyX + bodyWidth} y2={depth / 2 - inset * 1.45} stroke="#111827" strokeWidth="1.15" vectorEffect="non-scaling-stroke" />
        {isDoubleOven ? (
          <>
            <rect x={bodyX + bodyWidth * 0.12} y={bodyY + bodyHeight * 0.14} width={bodyWidth * 0.76} height={bodyHeight * 0.18} rx="1.2" fill="#94a3b8" opacity="0.32" />
            <rect x={bodyX + bodyWidth * 0.12} y={bodyY + bodyHeight * 0.42} width={bodyWidth * 0.76} height={bodyHeight * 0.18} rx="1.2" fill="#94a3b8" opacity="0.32" />
          </>
        ) : (
          <rect x={bodyX + bodyWidth * 0.14} y={bodyY + bodyHeight * 0.16} width={bodyWidth * 0.72} height={bodyHeight * 0.18} rx="1.2" fill="#94a3b8" opacity="0.32" />
        )}
      </g>
    );
  }

  if (
    image === "base-drawer" ||
    image === "base-two-drawer" ||
    image === "base-four-drawer" ||
    image === "base-two-door-one-drawer" ||
    image === "base-one-door-one-drawer" ||
    image === "base-two-door-two-drawer" ||
    image === "base-sink-cabinet" ||
    image === "base-farm-sink-cabinet" ||
    image === "base-spice-rack" ||
    image === "base-trash-can"
  ) {
    return <g opacity={detailOpacity}>{topLine}</g>;
  }

  if (
    image === "base-appliance" ||
    image === "base-oven-bottom-drawer" ||
    image === "base-microwave-bottom-drawer"
  ) {
    return (
      <g opacity={detailOpacity}>
        {topLine}
        <rect
          x={-width / 2 + inset * 1.7}
          y={-depth / 2 + inset * 1.55}
          width={width - inset * 3.4}
          height={depth - inset * 3.1}
          fill="none"
          stroke={stroke}
          strokeWidth="1.1"
          vectorEffect="non-scaling-stroke"
        />
        <line x1={-width / 2 + inset * 2} y1={-depth / 2 + inset * 1.1} x2={width / 2 - inset * 2} y2={-depth / 2 + inset * 1.1} stroke={stroke} strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
      </g>
    );
  }

  if (
    image === "base-blind-left" ||
    image === "base-blind-right" ||
    image === "wall-blind-left" ||
    image === "wall-blind-right" ||
    image === "base-blind-left-one-drawer" ||
    image === "base-blind-right-one-drawer"
  ) {
    const panelInsetX = 0;
    const panelInsetY = 0;
    const innerWidth = width;
    const innerHeight = depth;
    const side = blindPlacementWidths?.side ?? getBlindCabinetSide(image) ?? "left";
    const visibleWidthRatio =
      blindPlacementWidths && blindPlacementWidths.widthInches > 0
        ? blindPlacementWidths.visibleWidthInches / blindPlacementWidths.widthInches
        : 0.45;
    const visibleWidth = innerWidth * clamp(visibleWidthRatio, 0, 1);
    const blindWidth = Math.max(0, innerWidth - visibleWidth);
    const visibleX =
      side === "right" ? -width / 2 + panelInsetX : -width / 2 + panelInsetX + blindWidth;
    const blindX =
      side === "right" ? -width / 2 + panelInsetX + visibleWidth : -width / 2 + panelInsetX;
    const dividerX =
      side === "right"
        ? -width / 2 + panelInsetX + visibleWidth
        : -width / 2 + panelInsetX + blindWidth;
    const bodySize = Math.max(4.8, Math.min(8, Math.min(width, depth) * 0.085));
    const captionY = -depth / 2 + innerHeight * 0.46;
    const detailY = captionY + bodySize * 1.15;
    const visiblePatternId = `blind-visible-dot-pattern-${placementItem.id}`;
    const blindPatternId = `blind-hidden-hatch-pattern-${placementItem.id}`;

    return (
      <g opacity={detailOpacity}>
        <defs>
          <pattern
            id={visiblePatternId}
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="3" cy="3" r="1.2" fill="#a78bfa" opacity="0.45" />
          </pattern>
          <pattern
            id={blindPatternId}
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="10"
              stroke="#8b5cf6"
              strokeOpacity="0.28"
              strokeWidth="2"
            />
          </pattern>
        </defs>
        <rect
          x={visibleX}
          y={-depth / 2 + panelInsetY}
          width={visibleWidth}
          height={innerHeight}
          fill={`url(#${visiblePatternId})`}
          opacity="0.85"
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={blindX}
          y={-depth / 2 + panelInsetY}
          width={blindWidth}
          height={innerHeight}
          fill={`url(#${blindPatternId})`}
          opacity="0.9"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={dividerX}
          y1={-depth / 2}
          x2={dividerX}
          y2={depth / 2}
          stroke={stroke}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <text
          x={visibleX + visibleWidth / 2}
          y={captionY}
          textAnchor="middle"
          fontSize={bodySize}
          fontWeight="600"
          fill="#3f3f46"
        >
          visible
        </text>
        <text
          x={visibleX + visibleWidth / 2}
          y={detailY}
          textAnchor="middle"
          fontSize={bodySize}
          fontWeight="700"
          fill="#3f3f46"
        >
          {`${roundToQuarter(blindPlacementWidths?.visibleWidthInches ?? 0)}"`}
        </text>
        <text
          x={blindX + blindWidth / 2}
          y={captionY}
          textAnchor="middle"
          fontSize={bodySize}
          fontWeight="600"
          fill="#3f3f46"
        >
          blind
        </text>
        <text
          x={blindX + blindWidth / 2}
          y={detailY}
          textAnchor="middle"
          fontSize={bodySize}
          fontWeight="700"
          fill="#3f3f46"
        >
          {`${roundToQuarter(blindPlacementWidths?.blindWidthInches ?? 0)}"`}
        </text>
      </g>
    );
  }

  if (image === "base-corner") {
    return null;
  }

  return <g opacity={detailOpacity}>{topLine}</g>;
}

export function getPlacementPlanHandleTabRects(
  placementItem: Pick<PlacementElement, "width" | "depth" | "center" | "rotation"> & Partial<Pick<PlacementElement, "category" | "image">>
) {
  const image = getPlacementImage(placementItem);
  if (isProductPlacementImage(image)) return [];

  if (isAccessoryPlacementImage(image)) {
    return [];
  }

  const tabWidth = Math.min(22, Math.max(10, placementItem.width * 0.18));
  const tabHeight = Math.min(8, Math.max(5, placementItem.depth * 0.18));
  const tabY = placementItem.depth / 2 - tabHeight * 0.12;

  if (image === "base-corner") {
    const left = -placementItem.width / 2;
    const top = -placementItem.depth / 2;
    const bottom = placementItem.depth / 2;
    const innerX = left + placementItem.width * 0.48;
    const innerY = top + placementItem.depth * 0.54;

    // Define the handle placement in the cabinet's base local orientation,
    // where the L-shape notch is on the bottom-left. The whole cabinet group
    // is rotated afterward, so this local placement will rotate with it and
    // match the user-facing orientation.
    const verticalWidth = Math.max(5, Math.min(7, tabHeight));
    const verticalHeight = Math.max(16, Math.min(24, tabWidth * 1.05));

    const notchVerticalCenterY = innerY + (bottom - innerY) * 0.44;
    const edgeGap = 1.5;

    return [
      {
        // vertical handle on the inner vertical notch face, protruding into the notch
        x: innerX - verticalWidth - edgeGap,
        y: notchVerticalCenterY - verticalHeight / 2,
        width: verticalWidth,
        height: verticalHeight,
      },
    ];
  }

  let tabCenters: number[];

  if (
    image === "base-one-door" ||
    image === "pantry-one-door" ||
    image === "base-spice-rack" ||
    image === "base-trash-can" ||
    image === "base-appliance" ||
    image === "base-oven-bottom-drawer" ||
    image === "base-microwave-bottom-drawer" ||
    image === "base-blind-left" ||
    image === "wall-blind-left" ||
    image === "base-one-door-one-drawer" ||
    image === "base-two-drawer" ||
    image === "base-four-drawer" ||
    image === "base-blind-left-one-drawer"
  ) {
    tabCenters = [placementItem.width / 2 - tabWidth * 0.9];
  } else if (
    image === "base-blind-right-one-drawer" ||
    image === "base-blind-right" ||
    image === "wall-blind-right"
  ) {
    tabCenters = [-placementItem.width / 2 + tabWidth * 0.9];
  } else if (image === "base-drawer") {
    tabCenters = [0];
  } else {
      tabCenters = [-placementItem.width * 0.24, placementItem.width * 0.24];
  }

  return tabCenters.map((centerX) => ({
    x: centerX - tabWidth / 2,
    y: tabY,
    width: tabWidth,
    height: tabHeight,
  }));
}

export function getPlacementPlanOccupiedCorners(
  placementItem: Pick<PlacementElement, "center" | "width" | "depth" | "rotation"> & Partial<Pick<PlacementElement, "category" | "image">>
) {
  const radians = degreesToRadians(placementItem.rotation);
  const cosValue = Math.cos(radians);
  const sinValue = Math.sin(radians);
  const localCorners = [
    { x: -placementItem.width / 2, y: -placementItem.depth / 2 },
    { x: placementItem.width / 2, y: -placementItem.depth / 2 },
    { x: placementItem.width / 2, y: placementItem.depth / 2 },
    { x: -placementItem.width / 2, y: placementItem.depth / 2 },
  ];

  getPlacementPlanHandleTabRects(placementItem).forEach((tab) => {
    localCorners.push(
      { x: tab.x, y: tab.y },
      { x: tab.x + tab.width, y: tab.y },
      { x: tab.x + tab.width, y: tab.y + tab.height },
      { x: tab.x, y: tab.y + tab.height }
    );
  });

  return localCorners.map((corner) => ({
    x: placementItem.center.x + corner.x * cosValue - corner.y * sinValue,
    y: placementItem.center.y + corner.x * sinValue + corner.y * cosValue,
  }));
}

export function getPlacementPlanOccupiedBounds(
  placementItem: Pick<PlacementElement, "center" | "width" | "depth" | "rotation"> & Partial<Pick<PlacementElement, "category" | "image">>
) {
  const corners = getPlacementPlanOccupiedCorners(placementItem);
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

export function getRotatedRectBounds(center: Point, width: number, depth: number, rotation: number) {
  const corners = getRotatedRectCorners(center, width, depth, rotation);
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}
