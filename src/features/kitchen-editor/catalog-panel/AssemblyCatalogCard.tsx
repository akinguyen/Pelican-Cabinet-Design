"use client";

import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import type { KitchenEditorCatalogId } from "../catalogs/registry/kitchenEditorCatalogConfig";
import { formatInchesLabel } from "../formatting/kitchenEditorLabelFormatting";

type AssemblyCatalogCardProps = Readonly<{
  catalogId: KitchenEditorCatalogId;
  definition: AssemblyDefinition;
  onSelect: (definition: AssemblyDefinition) => void;
}>;

type DefaultSizeInches = Readonly<{
  widthInches: number;
  depthInches: number;
  heightInches: number;
}>;

type CabinetPreviewKind = "one-door" | "two-door" | "drawer" | "sink" | "corner" | "pullout" | "built-in";
type BasicUnitPreviewKind = "panel" | "filler" | "door" | "drawer" | "default";
type AppliancePreviewKind = "refrigerator" | "range" | "oven" | "microwave" | "dishwasher" | "cooktop" | "hood";
type OpeningPreviewKind = "door" | "window";
type FixturePreviewKind = "sink" | "faucet";

const previewStrokeColor = "#94a3b8";
const previewDarkStrokeColor = "#64748b";
const previewFaceColor = "#f1f5f9";
const previewSideColor = "#e2e8f0";
const previewTopColor = "#f8fafc";
const previewDetailColor = "#cbd5e1";
const previewDarkDetailColor = "#334155";

export function AssemblyCatalogCard({ catalogId, definition, onSelect }: AssemblyCatalogCardProps) {
  const defaultSizeInches: DefaultSizeInches = {
    widthInches: definition.dimensions.widthInches.defaultValueInches,
    depthInches: definition.dimensions.depthInches.defaultValueInches,
    heightInches: definition.dimensions.heightInches.defaultValueInches,
  };

  return (
    <button
      type="button"
      className="flex min-h-[13.5rem] w-full flex-col rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
      onClick={() => onSelect(definition)}
    >
      <div className="flex h-28 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-slate-50 to-white">
        <CatalogGeneratedPreview
          catalogId={catalogId}
          definition={definition}
          defaultSizeInches={defaultSizeInches}
        />
      </div>
      <div className="mt-3 min-w-0 text-sm font-semibold leading-tight text-slate-950">{definition.name}</div>
      <div className="mt-auto rounded-md bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-600">
        {formatVisualDefaultSizeLabel(defaultSizeInches)}
      </div>
    </button>
  );
}

function formatVisualDefaultSizeLabel(defaultSizeInches: DefaultSizeInches): string {
  return `${formatInchesLabel(defaultSizeInches.widthInches)} W × ${formatInchesLabel(
    defaultSizeInches.heightInches,
  )} H × ${formatInchesLabel(defaultSizeInches.depthInches)} D`;
}

function CatalogGeneratedPreview({
  catalogId,
  definition,
  defaultSizeInches,
}: Readonly<{
  catalogId: KitchenEditorCatalogId;
  definition: AssemblyDefinition;
  defaultSizeInches: DefaultSizeInches;
}>) {
  return (
    <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 176 116" role="img">
      <defs>
        <filter id={`catalog-preview-shadow-${definition.id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.2" floodColor="#64748b" floodOpacity="0.16" />
        </filter>
      </defs>
      <g filter={`url(#catalog-preview-shadow-${definition.id})`}>
        {renderCatalogPreview(catalogId, definition, defaultSizeInches)}
      </g>
    </svg>
  );
}

function renderCatalogPreview(
  catalogId: KitchenEditorCatalogId,
  definition: AssemblyDefinition,
  defaultSizeInches: DefaultSizeInches,
) {
  if (catalogId === "basic-units") {
    return <BasicUnitGeneratedPreview definition={definition} defaultSizeInches={defaultSizeInches} />;
  }

  if (
    catalogId === "base-cabinets" ||
    catalogId === "wall-cabinets" ||
    catalogId === "pantry-cabinets" ||
    catalogId === "built-in-cabinets"
  ) {
    return <CabinetGeneratedPreview catalogId={catalogId} definition={definition} defaultSizeInches={defaultSizeInches} />;
  }

  if (catalogId === "surfaces") {
    return <SurfaceGeneratedPreview />;
  }

  if (catalogId === "appliances") {
    return <ApplianceGeneratedPreview definition={definition} defaultSizeInches={defaultSizeInches} />;
  }

  if (catalogId === "openings") {
    return <OpeningGeneratedPreview definition={definition} defaultSizeInches={defaultSizeInches} />;
  }

  if (catalogId === "fixtures") {
    return <FixtureGeneratedPreview definition={definition} />;
  }

  return <DefaultBoxGeneratedPreview />;
}

function BasicUnitGeneratedPreview({
  definition,
  defaultSizeInches,
}: Readonly<{
  definition: AssemblyDefinition;
  defaultSizeInches: DefaultSizeInches;
}>) {
  const previewKind = getBasicUnitPreviewKind(definition);
  const bodyWidth = getBasicPreviewBodyWidthInPixels(previewKind, defaultSizeInches);
  const bodyHeight = getBasicPreviewBodyHeightInPixels(previewKind, defaultSizeInches);
  const bodyLeft = 88 - bodyWidth / 2;
  const bodyTop = 58 - bodyHeight / 2;
  const sideOffsetX = previewKind === "filler" ? 8 : 16;
  const sideOffsetY = previewKind === "filler" ? -7 : -11;
  const bodyRight = bodyLeft + bodyWidth;
  const bodyBottom = bodyTop + bodyHeight;

  return (
    <>
      <IsometricPanelBox
        bodyLeft={bodyLeft}
        bodyTop={bodyTop}
        bodyWidth={bodyWidth}
        bodyHeight={bodyHeight}
        sideOffsetX={sideOffsetX}
        sideOffsetY={sideOffsetY}
        frontFill={previewKind === "filler" ? "#f8fafc" : previewFaceColor}
      />
      <BasicUnitPreviewDetails
        previewKind={previewKind}
        bodyLeft={bodyLeft}
        bodyTop={bodyTop}
        bodyRight={bodyRight}
        bodyBottom={bodyBottom}
        bodyWidth={bodyWidth}
        bodyHeight={bodyHeight}
      />
    </>
  );
}

function BasicUnitPreviewDetails({
  previewKind,
  bodyLeft,
  bodyTop,
  bodyRight,
  bodyBottom,
  bodyWidth,
  bodyHeight,
}: Readonly<{
  previewKind: BasicUnitPreviewKind;
  bodyLeft: number;
  bodyTop: number;
  bodyRight: number;
  bodyBottom: number;
  bodyWidth: number;
  bodyHeight: number;
}>) {
  if (previewKind === "drawer") {
    return (
      <>
        <line
          x1={bodyLeft + 5}
          y1={bodyTop + bodyHeight * 0.34}
          x2={bodyRight - 5}
          y2={bodyTop + bodyHeight * 0.34}
          stroke={previewDetailColor}
          strokeWidth="1.1"
        />
        <rect
          x={bodyLeft + bodyWidth * 0.36}
          y={bodyTop + bodyHeight * 0.58}
          width={bodyWidth * 0.28}
          height="3"
          rx="1.5"
          fill={previewDarkDetailColor}
        />
      </>
    );
  }

  if (previewKind === "door") {
    return <DoorFaceDetails bodyLeft={bodyLeft} bodyTop={bodyTop} bodyWidth={bodyWidth} bodyHeight={bodyHeight} />;
  }

  if (previewKind === "filler") {
    return (
      <>
        <line
          x1={bodyLeft + bodyWidth * 0.5}
          y1={bodyTop + 5}
          x2={bodyLeft + bodyWidth * 0.5}
          y2={bodyBottom - 5}
          stroke={previewDetailColor}
          strokeWidth="1"
        />
        <line x1={bodyLeft + 4} y1={bodyBottom - 4} x2={bodyRight - 4} y2={bodyBottom - 4} stroke={previewDetailColor} />
      </>
    );
  }

  return (
    <>
      <line x1={bodyLeft + 5} y1={bodyTop + 5} x2={bodyRight - 5} y2={bodyTop + 5} stroke={previewDetailColor} />
      <line x1={bodyLeft + 5} y1={bodyBottom - 5} x2={bodyRight - 5} y2={bodyBottom - 5} stroke={previewDetailColor} />
    </>
  );
}

function CabinetGeneratedPreview({
  catalogId,
  definition,
  defaultSizeInches,
}: Readonly<{
  catalogId: KitchenEditorCatalogId;
  definition: AssemblyDefinition;
  defaultSizeInches: DefaultSizeInches;
}>) {
  const previewKind = getCabinetPreviewKind(definition);
  const isWallCabinet = catalogId === "wall-cabinets";
  const isTallCabinet = catalogId === "pantry-cabinets" || defaultSizeInches.heightInches >= 50;
  const bodyWidth = getCabinetBodyWidthInPixels(defaultSizeInches, previewKind);
  const bodyHeight = getCabinetBodyHeightInPixels(defaultSizeInches, isTallCabinet, isWallCabinet);
  const bodyLeft = 88 - bodyWidth / 2;
  const bodyTop = 58 - bodyHeight / 2;
  const bodyRight = bodyLeft + bodyWidth;
  const bodyBottom = bodyTop + bodyHeight;
  const depthX = 16;
  const depthY = -11;

  if (previewKind === "corner") {
    return <CornerCabinetPreview bodyLeft={bodyLeft} bodyTop={bodyTop} bodyWidth={bodyWidth} bodyHeight={bodyHeight} />;
  }

  return (
    <>
      <IsometricPanelBox
        bodyLeft={bodyLeft}
        bodyTop={bodyTop}
        bodyWidth={bodyWidth}
        bodyHeight={bodyHeight}
        sideOffsetX={depthX}
        sideOffsetY={depthY}
        frontFill={previewFaceColor}
      />
      {!isWallCabinet && !isTallCabinet ? <ToeKick bodyLeft={bodyLeft} bodyRight={bodyRight} bodyBottom={bodyBottom} /> : null}
      {previewKind === "drawer" ? (
        <DrawerStackDetails bodyLeft={bodyLeft} bodyTop={bodyTop} bodyRight={bodyRight} bodyBottom={bodyBottom} />
      ) : null}
      {previewKind === "sink" ? (
        <SinkCabinetDetails bodyLeft={bodyLeft} bodyTop={bodyTop} bodyRight={bodyRight} bodyBottom={bodyBottom} />
      ) : null}
      {previewKind === "pullout" ? (
        <PulloutCabinetDetails bodyLeft={bodyLeft} bodyTop={bodyTop} bodyRight={bodyRight} bodyBottom={bodyBottom} />
      ) : null}
      {previewKind === "built-in" ? (
        <BuiltInCabinetDetails bodyLeft={bodyLeft} bodyTop={bodyTop} bodyRight={bodyRight} bodyBottom={bodyBottom} />
      ) : null}
      {previewKind === "one-door" ? (
        <DoorFaceDetails bodyLeft={bodyLeft} bodyTop={bodyTop + 4} bodyWidth={bodyWidth} bodyHeight={bodyHeight - 8} />
      ) : null}
      {previewKind === "two-door" ? (
        <TwoDoorDetails bodyLeft={bodyLeft} bodyTop={bodyTop + 4} bodyRight={bodyRight} bodyBottom={bodyBottom - 7} />
      ) : null}
      {isWallCabinet ? <WallCabinetRail bodyLeft={bodyLeft} bodyTop={bodyTop} bodyRight={bodyRight} /> : null}
    </>
  );
}

function CornerCabinetPreview({
  bodyLeft,
  bodyTop,
  bodyWidth,
  bodyHeight,
}: Readonly<{ bodyLeft: number; bodyTop: number; bodyWidth: number; bodyHeight: number }>) {
  const bodyRight = bodyLeft + bodyWidth;
  const bodyBottom = bodyTop + bodyHeight;
  const side = 16;

  return (
    <>
      <polygon
        points={`${bodyLeft},${bodyTop + side} ${bodyLeft + side},${bodyTop} ${bodyRight},${bodyTop} ${bodyRight},${bodyBottom} ${bodyLeft},${bodyBottom}`}
        fill={previewFaceColor}
        stroke={previewStrokeColor}
        strokeWidth="1.4"
      />
      <line x1={bodyLeft + side} y1={bodyTop} x2={bodyLeft + side} y2={bodyBottom - 6} stroke={previewDetailColor} />
      <line x1={bodyLeft + 5} y1={bodyBottom - 6} x2={bodyRight - 5} y2={bodyBottom - 6} stroke={previewDetailColor} />
      <path
        d={`M ${bodyLeft + 12} ${bodyTop + 24} Q ${bodyLeft + 30} ${bodyTop + 16} ${bodyLeft + 50} ${bodyTop + 24}`}
        fill="none"
        stroke={previewDarkStrokeColor}
        strokeWidth="1.2"
      />
    </>
  );
}

function SurfaceGeneratedPreview() {
  return (
    <>
      <polygon points="32,62 122,62 144,50 54,50" fill={previewTopColor} stroke={previewStrokeColor} strokeWidth="1.4" />
      <polygon points="32,62 122,62 122,69 32,69" fill={previewFaceColor} stroke={previewStrokeColor} strokeWidth="1.2" />
      <polygon points="122,62 144,50 144,57 122,69" fill={previewSideColor} stroke={previewStrokeColor} strokeWidth="1.2" />
      <line x1="42" y1="65.5" x2="112" y2="65.5" stroke={previewDetailColor} strokeWidth="1" />
    </>
  );
}

function ApplianceGeneratedPreview({
  definition,
  defaultSizeInches,
}: Readonly<{
  definition: AssemblyDefinition;
  defaultSizeInches: DefaultSizeInches;
}>) {
  const previewKind = getAppliancePreviewKind(definition);

  if (previewKind === "cooktop") {
    return <CooktopPreview />;
  }

  if (previewKind === "hood") {
    return <RangeHoodPreview />;
  }

  const bodyWidth = previewKind === "refrigerator" ? 58 : Math.max(54, Math.min(76, defaultSizeInches.widthInches * 2.2));
  const bodyHeight = previewKind === "refrigerator" ? 82 : Math.max(50, Math.min(74, defaultSizeInches.heightInches * 1.6));
  const bodyLeft = 88 - bodyWidth / 2;
  const bodyTop = 58 - bodyHeight / 2;
  const bodyRight = bodyLeft + bodyWidth;
  const bodyBottom = bodyTop + bodyHeight;

  return (
    <>
      <IsometricPanelBox
        bodyLeft={bodyLeft}
        bodyTop={bodyTop}
        bodyWidth={bodyWidth}
        bodyHeight={bodyHeight}
        sideOffsetX={14}
        sideOffsetY={-10}
        frontFill="#eef2f7"
      />
      {previewKind === "refrigerator" ? (
        <RefrigeratorDetails bodyLeft={bodyLeft} bodyTop={bodyTop} bodyRight={bodyRight} bodyBottom={bodyBottom} />
      ) : null}
      {previewKind === "range" ? <RangeDetails bodyLeft={bodyLeft} bodyTop={bodyTop} bodyRight={bodyRight} bodyBottom={bodyBottom} /> : null}
      {previewKind === "oven" ? <OvenDetails bodyLeft={bodyLeft} bodyTop={bodyTop} bodyRight={bodyRight} bodyBottom={bodyBottom} /> : null}
      {previewKind === "microwave" ? <MicrowaveDetails bodyLeft={bodyLeft} bodyTop={bodyTop} bodyRight={bodyRight} bodyBottom={bodyBottom} /> : null}
      {previewKind === "dishwasher" ? (
        <DishwasherDetails bodyLeft={bodyLeft} bodyTop={bodyTop} bodyRight={bodyRight} bodyBottom={bodyBottom} />
      ) : null}
    </>
  );
}

function OpeningGeneratedPreview({
  definition,
  defaultSizeInches,
}: Readonly<{ definition: AssemblyDefinition; defaultSizeInches: DefaultSizeInches }>) {
  const previewKind = getOpeningPreviewKind(definition);
  const bodyWidth = Math.max(44, Math.min(64, defaultSizeInches.widthInches * 1.35));
  const bodyHeight = previewKind === "door" ? 86 : 58;
  const bodyLeft = 88 - bodyWidth / 2;
  const bodyTop = 58 - bodyHeight / 2;
  const bodyRight = bodyLeft + bodyWidth;
  const bodyBottom = bodyTop + bodyHeight;

  if (previewKind === "window") {
    return <WindowPreview bodyLeft={bodyLeft} bodyTop={bodyTop} bodyRight={bodyRight} bodyBottom={bodyBottom} />;
  }

  return <DoorOpeningPreview bodyLeft={bodyLeft} bodyTop={bodyTop} bodyRight={bodyRight} bodyBottom={bodyBottom} />;
}

function FixtureGeneratedPreview({ definition }: Readonly<{ definition: AssemblyDefinition }>) {
  const previewKind = getFixturePreviewKind(definition);

  if (previewKind === "faucet") {
    return <FaucetPreview />;
  }

  return <SinkPreview />;
}

function DefaultBoxGeneratedPreview() {
  return <IsometricPanelBox bodyLeft={56} bodyTop={28} bodyWidth={54} bodyHeight={62} sideOffsetX={16} sideOffsetY={-11} />;
}

function IsometricPanelBox({
  bodyLeft,
  bodyTop,
  bodyWidth,
  bodyHeight,
  sideOffsetX,
  sideOffsetY,
  frontFill = previewFaceColor,
}: Readonly<{
  bodyLeft: number;
  bodyTop: number;
  bodyWidth: number;
  bodyHeight: number;
  sideOffsetX: number;
  sideOffsetY: number;
  frontFill?: string;
}>) {
  const bodyRight = bodyLeft + bodyWidth;
  const bodyBottom = bodyTop + bodyHeight;

  return (
    <>
      <polygon
        points={`${bodyLeft},${bodyTop} ${bodyRight},${bodyTop} ${bodyRight + sideOffsetX},${bodyTop + sideOffsetY} ${bodyLeft + sideOffsetX},${bodyTop + sideOffsetY}`}
        fill={previewTopColor}
        stroke={previewDetailColor}
        strokeWidth="1.2"
      />
      <polygon
        points={`${bodyRight},${bodyTop} ${bodyRight + sideOffsetX},${bodyTop + sideOffsetY} ${bodyRight + sideOffsetX},${bodyBottom + sideOffsetY} ${bodyRight},${bodyBottom}`}
        fill={previewSideColor}
        stroke={previewStrokeColor}
        strokeWidth="1.2"
      />
      <rect
        x={bodyLeft}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        rx="1.5"
        fill={frontFill}
        stroke={previewStrokeColor}
        strokeWidth="1.4"
      />
    </>
  );
}

function DoorFaceDetails({
  bodyLeft,
  bodyTop,
  bodyWidth,
  bodyHeight,
}: Readonly<{ bodyLeft: number; bodyTop: number; bodyWidth: number; bodyHeight: number }>) {
  return (
    <>
      <rect
        x={bodyLeft + bodyWidth * 0.14}
        y={bodyTop + bodyHeight * 0.12}
        width={bodyWidth * 0.72}
        height={bodyHeight * 0.76}
        rx="1.5"
        fill="none"
        stroke={previewDetailColor}
        strokeWidth="1"
      />
      <circle cx={bodyLeft + bodyWidth * 0.78} cy={bodyTop + bodyHeight * 0.5} r="1.8" fill={previewDarkDetailColor} />
    </>
  );
}

function TwoDoorDetails({
  bodyLeft,
  bodyTop,
  bodyRight,
  bodyBottom,
}: Readonly<{ bodyLeft: number; bodyTop: number; bodyRight: number; bodyBottom: number }>) {
  const centerX = (bodyLeft + bodyRight) / 2;

  return (
    <>
      <line x1={centerX} y1={bodyTop + 3} x2={centerX} y2={bodyBottom - 3} stroke={previewDetailColor} strokeWidth="1.2" />
      <rect x={bodyLeft + 6} y={bodyTop + 6} width={centerX - bodyLeft - 9} height={bodyBottom - bodyTop - 12} rx="1" fill="none" stroke={previewDetailColor} />
      <rect x={centerX + 3} y={bodyTop + 6} width={bodyRight - centerX - 9} height={bodyBottom - bodyTop - 12} rx="1" fill="none" stroke={previewDetailColor} />
      <circle cx={centerX - 4} cy={(bodyTop + bodyBottom) / 2} r="1.6" fill={previewDarkDetailColor} />
      <circle cx={centerX + 4} cy={(bodyTop + bodyBottom) / 2} r="1.6" fill={previewDarkDetailColor} />
    </>
  );
}

function DrawerStackDetails({
  bodyLeft,
  bodyTop,
  bodyRight,
  bodyBottom,
}: Readonly<{ bodyLeft: number; bodyTop: number; bodyRight: number; bodyBottom: number }>) {
  const drawerHeight = (bodyBottom - bodyTop - 10) / 3;

  return (
    <>
      {[0, 1, 2].map((drawerIndex) => {
        const y = bodyTop + 5 + drawerHeight * drawerIndex;
        return (
          <g key={drawerIndex}>
            <rect x={bodyLeft + 6} y={y} width={bodyRight - bodyLeft - 12} height={drawerHeight - 3} rx="1.5" fill="none" stroke={previewDetailColor} />
            <rect x={(bodyLeft + bodyRight) / 2 - 9} y={y + drawerHeight / 2 - 2} width="18" height="3" rx="1.5" fill={previewDarkDetailColor} />
          </g>
        );
      })}
    </>
  );
}

function SinkCabinetDetails({
  bodyLeft,
  bodyTop,
  bodyRight,
  bodyBottom,
}: Readonly<{ bodyLeft: number; bodyTop: number; bodyRight: number; bodyBottom: number }>) {
  return (
    <>
      <line x1={bodyLeft + 6} y1={bodyTop + 17} x2={bodyRight - 6} y2={bodyTop + 17} stroke={previewDetailColor} />
      <TwoDoorDetails bodyLeft={bodyLeft} bodyTop={bodyTop + 18} bodyRight={bodyRight} bodyBottom={bodyBottom - 7} />
      <ellipse cx={(bodyLeft + bodyRight) / 2} cy={bodyTop + 10} rx="13" ry="4" fill="none" stroke={previewDarkStrokeColor} strokeWidth="1.1" />
    </>
  );
}

function PulloutCabinetDetails({
  bodyLeft,
  bodyTop,
  bodyRight,
  bodyBottom,
}: Readonly<{ bodyLeft: number; bodyTop: number; bodyRight: number; bodyBottom: number }>) {
  return (
    <>
      <rect x={bodyLeft + 8} y={bodyTop + 7} width={bodyRight - bodyLeft - 16} height={bodyBottom - bodyTop - 18} rx="1.5" fill="none" stroke={previewDetailColor} />
      <line x1={(bodyLeft + bodyRight) / 2} y1={bodyTop + 10} x2={(bodyLeft + bodyRight) / 2} y2={bodyBottom - 14} stroke={previewDetailColor} />
      <rect x={(bodyLeft + bodyRight) / 2 - 9} y={bodyTop + 13} width="18" height="3" rx="1.5" fill={previewDarkDetailColor} />
    </>
  );
}

function BuiltInCabinetDetails({
  bodyLeft,
  bodyTop,
  bodyRight,
  bodyBottom,
}: Readonly<{ bodyLeft: number; bodyTop: number; bodyRight: number; bodyBottom: number }>) {
  const openingTop = bodyTop + 13;
  const openingHeight = Math.min(30, (bodyBottom - bodyTop) * 0.38);

  return (
    <>
      <rect x={bodyLeft + 9} y={openingTop} width={bodyRight - bodyLeft - 18} height={openingHeight} rx="2" fill="#e5e7eb" stroke={previewDarkStrokeColor} />
      <rect x={bodyLeft + 15} y={openingTop + 6} width={bodyRight - bodyLeft - 30} height={openingHeight - 12} rx="1.5" fill="#f8fafc" stroke={previewDetailColor} />
      <TwoDoorDetails bodyLeft={bodyLeft} bodyTop={openingTop + openingHeight + 8} bodyRight={bodyRight} bodyBottom={bodyBottom - 7} />
    </>
  );
}

function ToeKick({
  bodyLeft,
  bodyRight,
  bodyBottom,
}: Readonly<{ bodyLeft: number; bodyRight: number; bodyBottom: number }>) {
  return <rect x={bodyLeft + 4} y={bodyBottom - 7} width={bodyRight - bodyLeft - 8} height="7" fill="#475569" opacity="0.45" />;
}

function WallCabinetRail({
  bodyLeft,
  bodyTop,
  bodyRight,
}: Readonly<{ bodyLeft: number; bodyTop: number; bodyRight: number }>) {
  return <line x1={bodyLeft + 6} y1={bodyTop + 6} x2={bodyRight - 6} y2={bodyTop + 6} stroke={previewDetailColor} />;
}

function RefrigeratorDetails({
  bodyLeft,
  bodyTop,
  bodyRight,
  bodyBottom,
}: Readonly<{ bodyLeft: number; bodyTop: number; bodyRight: number; bodyBottom: number }>) {
  const centerX = (bodyLeft + bodyRight) / 2;

  return (
    <>
      <line x1={centerX} y1={bodyTop + 3} x2={centerX} y2={bodyBottom - 3} stroke={previewDetailColor} strokeWidth="1.3" />
      <rect x={centerX - 7} y={bodyTop + 23} width="3" height="26" rx="1.5" fill={previewDarkDetailColor} />
      <rect x={centerX + 4} y={bodyTop + 23} width="3" height="26" rx="1.5" fill={previewDarkDetailColor} />
    </>
  );
}

function RangeDetails({
  bodyLeft,
  bodyTop,
  bodyRight,
  bodyBottom,
}: Readonly<{ bodyLeft: number; bodyTop: number; bodyRight: number; bodyBottom: number }>) {
  return (
    <>
      <line x1={bodyLeft + 6} y1={bodyTop + 18} x2={bodyRight - 6} y2={bodyTop + 18} stroke={previewDetailColor} />
      {[0, 1, 2, 3].map((burnerIndex) => (
        <circle
          key={burnerIndex}
          cx={bodyLeft + 14 + (burnerIndex % 2) * (bodyRight - bodyLeft - 28)}
          cy={bodyTop + 9 + Math.floor(burnerIndex / 2) * 6}
          r="3"
          fill="none"
          stroke={previewDarkStrokeColor}
          strokeWidth="1"
        />
      ))}
      <rect x={bodyLeft + 9} y={bodyTop + 26} width={bodyRight - bodyLeft - 18} height={bodyBottom - bodyTop - 34} rx="2" fill="#f8fafc" stroke={previewDetailColor} />
      <rect x={(bodyLeft + bodyRight) / 2 - 10} y={bodyTop + 31} width="20" height="3" rx="1.5" fill={previewDarkDetailColor} />
    </>
  );
}

function OvenDetails({
  bodyLeft,
  bodyTop,
  bodyRight,
  bodyBottom,
}: Readonly<{ bodyLeft: number; bodyTop: number; bodyRight: number; bodyBottom: number }>) {
  return (
    <>
      <rect x={bodyLeft + 9} y={bodyTop + 10} width={bodyRight - bodyLeft - 18} height={bodyBottom - bodyTop - 20} rx="2" fill="#f8fafc" stroke={previewDarkStrokeColor} />
      <rect x={bodyLeft + 16} y={bodyTop + 19} width={bodyRight - bodyLeft - 32} height={bodyBottom - bodyTop - 38} rx="1.5" fill="#e2e8f0" stroke={previewDetailColor} />
      <rect x={(bodyLeft + bodyRight) / 2 - 11} y={bodyTop + 14} width="22" height="3" rx="1.5" fill={previewDarkDetailColor} />
    </>
  );
}

function MicrowaveDetails({
  bodyLeft,
  bodyTop,
  bodyRight,
  bodyBottom,
}: Readonly<{ bodyLeft: number; bodyTop: number; bodyRight: number; bodyBottom: number }>) {
  return (
    <>
      <rect x={bodyLeft + 8} y={bodyTop + 11} width={bodyRight - bodyLeft - 22} height={bodyBottom - bodyTop - 22} rx="2" fill="#f8fafc" stroke={previewDarkStrokeColor} />
      <rect x={bodyRight - 12} y={bodyTop + 12} width="5" height={bodyBottom - bodyTop - 24} rx="1.5" fill={previewDetailColor} />
      <circle cx={bodyRight - 9.5} cy={(bodyTop + bodyBottom) / 2} r="1.5" fill={previewDarkDetailColor} />
    </>
  );
}

function DishwasherDetails({
  bodyLeft,
  bodyTop,
  bodyRight,
  bodyBottom,
}: Readonly<{ bodyLeft: number; bodyTop: number; bodyRight: number; bodyBottom: number }>) {
  return (
    <>
      <line x1={bodyLeft + 6} y1={bodyTop + 14} x2={bodyRight - 6} y2={bodyTop + 14} stroke={previewDetailColor} />
      <rect x={bodyLeft + 11} y={bodyTop + 24} width={bodyRight - bodyLeft - 22} height={bodyBottom - bodyTop - 36} rx="2" fill="none" stroke={previewDetailColor} />
      <rect x={(bodyLeft + bodyRight) / 2 - 10} y={bodyTop + 8} width="20" height="3" rx="1.5" fill={previewDarkDetailColor} />
    </>
  );
}

function CooktopPreview() {
  return (
    <>
      <polygon points="42,66 126,66 142,54 58,54" fill={previewFaceColor} stroke={previewStrokeColor} strokeWidth="1.4" />
      {[0, 1, 2, 3].map((burnerIndex) => (
        <ellipse
          key={burnerIndex}
          cx={70 + (burnerIndex % 2) * 37}
          cy={58 + Math.floor(burnerIndex / 2) * 7}
          rx="8"
          ry="3.5"
          fill="none"
          stroke={previewDarkStrokeColor}
          strokeWidth="1.1"
        />
      ))}
    </>
  );
}

function RangeHoodPreview() {
  return (
    <>
      <rect x="77" y="24" width="22" height="24" rx="2" fill={previewFaceColor} stroke={previewStrokeColor} strokeWidth="1.3" />
      <polygon points="55,79 121,79 104,48 72,48" fill={previewSideColor} stroke={previewStrokeColor} strokeWidth="1.4" />
      <line x1="64" y1="73" x2="112" y2="73" stroke={previewDarkStrokeColor} strokeWidth="1.2" />
    </>
  );
}

function DoorOpeningPreview({
  bodyLeft,
  bodyTop,
  bodyRight,
  bodyBottom,
}: Readonly<{ bodyLeft: number; bodyTop: number; bodyRight: number; bodyBottom: number }>) {
  return (
    <>
      <rect x={bodyLeft - 4} y={bodyTop - 2} width={bodyRight - bodyLeft + 8} height={bodyBottom - bodyTop + 4} rx="1.5" fill={previewTopColor} stroke={previewStrokeColor} strokeWidth="1.4" />
      <rect x={bodyLeft + 6} y={bodyTop + 9} width={bodyRight - bodyLeft - 12} height={bodyBottom - bodyTop - 13} rx="2" fill={previewFaceColor} stroke={previewDetailColor} />
      <line x1={bodyLeft + 13} y1={bodyTop + 23} x2={bodyRight - 13} y2={bodyTop + 23} stroke={previewDetailColor} />
      <line x1={bodyLeft + 13} y1={bodyTop + 43} x2={bodyRight - 13} y2={bodyTop + 43} stroke={previewDetailColor} />
      <circle cx={bodyRight - 13} cy={(bodyTop + bodyBottom) / 2} r="2" fill={previewDarkDetailColor} />
    </>
  );
}

function WindowPreview({
  bodyLeft,
  bodyTop,
  bodyRight,
  bodyBottom,
}: Readonly<{ bodyLeft: number; bodyTop: number; bodyRight: number; bodyBottom: number }>) {
  const centerX = (bodyLeft + bodyRight) / 2;
  const centerY = (bodyTop + bodyBottom) / 2;

  return (
    <>
      <rect x={bodyLeft - 5} y={bodyTop - 5} width={bodyRight - bodyLeft + 10} height={bodyBottom - bodyTop + 10} rx="2" fill={previewTopColor} stroke={previewStrokeColor} strokeWidth="1.4" />
      <rect x={bodyLeft + 5} y={bodyTop + 5} width={bodyRight - bodyLeft - 10} height={bodyBottom - bodyTop - 10} rx="1.5" fill="#f8fafc" stroke={previewDetailColor} />
      <line x1={centerX} y1={bodyTop + 5} x2={centerX} y2={bodyBottom - 5} stroke={previewDetailColor} />
      <line x1={bodyLeft + 5} y1={centerY} x2={bodyRight - 5} y2={centerY} stroke={previewDetailColor} />
    </>
  );
}

function SinkPreview() {
  return (
    <>
      <ellipse cx="88" cy="60" rx="46" ry="22" fill={previewFaceColor} stroke={previewStrokeColor} strokeWidth="1.4" />
      <ellipse cx="88" cy="60" rx="34" ry="14" fill="#f8fafc" stroke={previewDetailColor} strokeWidth="1.2" />
      <circle cx="88" cy="60" r="3" fill={previewDarkDetailColor} />
      <line x1="58" y1="49" x2="118" y2="49" stroke={previewDetailColor} />
    </>
  );
}

function FaucetPreview() {
  return (
    <>
      <rect x="82" y="61" width="12" height="22" rx="4" fill={previewFaceColor} stroke={previewStrokeColor} strokeWidth="1.4" />
      <path d="M 88 61 C 88 38 124 38 124 61" fill="none" stroke={previewStrokeColor} strokeWidth="5" strokeLinecap="round" />
      <path d="M 124 61 L 124 72" fill="none" stroke={previewDarkStrokeColor} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="88" cy="86" rx="27" ry="5" fill={previewSideColor} stroke={previewStrokeColor} strokeWidth="1.2" />
    </>
  );
}

function getBasicUnitPreviewKind(definition: AssemblyDefinition): BasicUnitPreviewKind {
  if (definition.id.includes("filler")) {
    return "filler";
  }

  if (definition.id.includes("drawer")) {
    return "drawer";
  }

  if (definition.id.includes("door")) {
    return "door";
  }

  if (definition.id.includes("panel")) {
    return "panel";
  }

  return "default";
}

function getCabinetPreviewKind(definition: AssemblyDefinition): CabinetPreviewKind {
  const id = definition.id;

  if (id.includes("corner") || id.includes("blind")) {
    return "corner";
  }

  if (id.includes("sink") || id.includes("farm")) {
    return "sink";
  }

  if (id.includes("pullout") || id.includes("rack") || id.includes("trash")) {
    return "pullout";
  }

  if (id.includes("drawer")) {
    return "drawer";
  }

  if (id.includes("oven") || id.includes("microwave")) {
    return "built-in";
  }

  if (id.includes("two-door") || id.includes("2-door")) {
    return "two-door";
  }

  return "one-door";
}

function getAppliancePreviewKind(definition: AssemblyDefinition): AppliancePreviewKind {
  const id = definition.id;

  if (id.includes("refrigerator")) {
    return "refrigerator";
  }

  if (id.includes("range-hood")) {
    return "hood";
  }

  if (id.includes("cooktop") || id.includes("rangetop")) {
    return "cooktop";
  }

  if (id.includes("range")) {
    return "range";
  }

  if (id.includes("oven")) {
    return "oven";
  }

  if (id.includes("microwave")) {
    return "microwave";
  }

  if (id.includes("dishwasher")) {
    return "dishwasher";
  }

  return "oven";
}

function getOpeningPreviewKind(definition: AssemblyDefinition): OpeningPreviewKind {
  return definition.id.includes("window") ? "window" : "door";
}

function getFixturePreviewKind(definition: AssemblyDefinition): FixturePreviewKind {
  return definition.id.includes("faucet") ? "faucet" : "sink";
}

function getBasicPreviewBodyWidthInPixels(
  previewKind: BasicUnitPreviewKind,
  defaultSizeInches: DefaultSizeInches,
): number {
  const aspectWidth = (defaultSizeInches.widthInches / Math.max(defaultSizeInches.heightInches, 1)) * 78;

  if (previewKind === "filler") {
    return Math.max(18, Math.min(34, aspectWidth));
  }

  if (previewKind === "drawer") {
    return Math.max(72, Math.min(94, aspectWidth));
  }

  return Math.max(48, Math.min(86, aspectWidth));
}

function getBasicPreviewBodyHeightInPixels(
  previewKind: BasicUnitPreviewKind,
  defaultSizeInches: DefaultSizeInches,
): number {
  if (previewKind === "drawer") {
    return Math.max(34, Math.min(56, defaultSizeInches.heightInches * 4));
  }

  return Math.max(64, Math.min(88, defaultSizeInches.heightInches * 2.2));
}

function getCabinetBodyWidthInPixels(defaultSizeInches: DefaultSizeInches, previewKind: CabinetPreviewKind): number {
  if (previewKind === "pullout") {
    return Math.max(28, Math.min(44, defaultSizeInches.widthInches * 2.4));
  }

  return Math.max(44, Math.min(78, defaultSizeInches.widthInches * 1.8));
}

function getCabinetBodyHeightInPixels(
  defaultSizeInches: DefaultSizeInches,
  isTallCabinet: boolean,
  isWallCabinet: boolean,
): number {
  if (isTallCabinet) {
    return Math.max(72, Math.min(88, defaultSizeInches.heightInches * 1.15));
  }

  if (isWallCabinet) {
    return Math.max(54, Math.min(72, defaultSizeInches.heightInches * 1.8));
  }

  return Math.max(58, Math.min(72, defaultSizeInches.heightInches * 1.7));
}
