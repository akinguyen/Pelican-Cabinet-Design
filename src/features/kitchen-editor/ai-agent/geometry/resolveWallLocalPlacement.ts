import type { SelectedWallAiContextResult } from "../context/buildSelectedWallAiContext";

export type AiWallLocalPlacementIntent = Readonly<{
  uStartInches: number;
  placementDescription: string;
}>;

type WallLocalPlacementSide = "start" | "end";

export function resolveWallLocalPlacement(args: {
  message: string;
  widthInches: number;
  selectedWallContextResult?: SelectedWallAiContextResult;
}): AiWallLocalPlacementIntent {
  const normalizedMessage = args.message.trim().toLowerCase();
  const wallLengthInches = args.selectedWallContextResult?.ok === true
    ? args.selectedWallContextResult.context.lengthInches
    : null;
  const offsetFromStartInches = readOffsetFromSideInches(normalizedMessage, "start");

  if (offsetFromStartInches !== null) {
    return {
      uStartInches: offsetFromStartInches,
      placementDescription: `${formatInches(offsetFromStartInches)} from the elevation-left start side`,
    };
  }

  const offsetFromEndInches = readOffsetFromSideInches(normalizedMessage, "end");

  if (offsetFromEndInches !== null) {
    return {
      uStartInches: wallLengthInches === null ? 0 : wallLengthInches - args.widthInches - offsetFromEndInches,
      placementDescription: `${formatInches(offsetFromEndInches)} from the elevation-right end side`,
    };
  }

  const explicitAtOffsetInches = readExplicitAtOffsetInches(normalizedMessage);

  if (explicitAtOffsetInches !== null) {
    return {
      uStartInches: explicitAtOffsetInches,
      placementDescription: `${formatInches(explicitAtOffsetInches)} from the elevation-left start side`,
    };
  }

  if (/\b(center|centered|centre|centred|middle)\b/.test(normalizedMessage)) {
    return {
      uStartInches: wallLengthInches === null ? 0 : (wallLengthInches - args.widthInches) / 2,
      placementDescription: "centered on the selected wall face",
    };
  }

  if (matchesEndSide(normalizedMessage)) {
    return {
      uStartInches: wallLengthInches === null ? 0 : wallLengthInches - args.widthInches,
      placementDescription: "at the elevation-right end side of the selected wall face",
    };
  }

  if (matchesStartSide(normalizedMessage)) {
    return {
      uStartInches: 0,
      placementDescription: "at the elevation-left start side of the selected wall face",
    };
  }

  return {
    uStartInches: 0,
    placementDescription: "at the elevation-left start side of the selected wall face",
  };
}

function readOffsetFromSideInches(message: string, side: WallLocalPlacementSide): number | null {
  const sidePattern = side === "start"
    ? "(?:start|left)"
    : "(?:end|right)";
  const match = message.match(new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*(?:\\"|inches|inch|in\\b)?\\s+from\\s+(?:the\\s+)?${sidePattern}(?:\\s+side)?\\b`));

  if (match === null) {
    return null;
  }

  const valueInches = Number(match[1]);

  return Number.isFinite(valueInches) ? valueInches : null;
}

function readExplicitAtOffsetInches(message: string): number | null {
  const match = message.match(/\b(?:at|start(?:ing)?\s+at)\s+(\d+(?:\.\d+)?)\s*(?:\"|inches|inch|in\b)?\b/);

  if (match === null) {
    return null;
  }

  const valueInches = Number(match[1]);

  return Number.isFinite(valueInches) ? valueInches : null;
}

function matchesStartSide(message: string): boolean {
  return /\b(?:start|left)\b/.test(message);
}

function matchesEndSide(message: string): boolean {
  return /\b(?:end|right)\b/.test(message);
}

function formatInches(valueInches: number): string {
  return `${Number(valueInches.toFixed(2))}\"`;
}
