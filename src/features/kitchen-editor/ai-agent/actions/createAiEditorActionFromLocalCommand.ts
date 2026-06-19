import type { AiEditorAction } from "./aiEditorActionTypes";
import type { SelectedWallAiContextResult } from "../context/buildSelectedWallAiContext";
import { resolveWallLocalPlacement } from "../geometry/resolveWallLocalPlacement";

const DEFAULT_BASE_CABINET_DEFINITION_ID = "two-door-base-cabinet";
const DEFAULT_BASE_CABINET_WIDTH_INCHES = 30;

export function createAiEditorActionsFromLocalCommand(
  message: string,
  selectedWallContextResult?: SelectedWallAiContextResult,
): readonly AiEditorAction[] {
  const normalizedMessage = message.trim().toLowerCase();

  if (normalizedMessage.length === 0) {
    return [];
  }

  const mentionsCabinet = /\b(cabinet|base cabinet|base)\b/.test(normalizedMessage);
  const looksLikePlacementRequest = /\b(place|add|put|insert|create)\b/.test(normalizedMessage);

  if (!mentionsCabinet || !looksLikePlacementRequest) {
    return [];
  }

  const widthInches = readRequestedCabinetWidthInches(normalizedMessage) ?? DEFAULT_BASE_CABINET_WIDTH_INCHES;
  const placement = resolveWallLocalPlacement({
    message: normalizedMessage,
    widthInches,
    selectedWallContextResult,
  });

  return [
    {
      type: "placeAssemblyOnSelectedWallFace",
      definitionId: DEFAULT_BASE_CABINET_DEFINITION_ID,
      widthInches,
      uStartInches: placement.uStartInches,
      placementDescription: placement.placementDescription,
    },
  ];
}

function readRequestedCabinetWidthInches(message: string): number | null {
  const widthNearCabinetMatch = message.match(
    /\b(\d+(?:\.\d+)?)\s*(?:"|inches|inch|in\b)\s*(?:wide\s+)?(?:base\s+)?cabinet\b/,
  );

  if (widthNearCabinetMatch !== null) {
    return Number(widthNearCabinetMatch[1]);
  }

  const cabinetNearWidthMatch = message.match(
    /\b(?:base\s+)?cabinet\b\s*(?:that\s+is\s+|with\s+width\s+|width\s+|of\s+)(\d+(?:\.\d+)?)\s*(?:"|inches|inch|in\b)?\s*(?:wide)?\b/,
  );

  if (cabinetNearWidthMatch !== null) {
    const valueInches = Number(cabinetNearWidthMatch[1]);

    if (Number.isFinite(valueInches)) {
      return valueInches;
    }
  }

  const cabinetWideMatch = message.match(
    /\b(?:base\s+)?cabinet\b\s+(\d+(?:\.\d+)?)\s*(?:"|inches|inch|in\b)?\s+wide\b/,
  );

  if (cabinetWideMatch !== null) {
    const valueInches = Number(cabinetWideMatch[1]);

    if (Number.isFinite(valueInches)) {
      return valueInches;
    }
  }

  const widthKeywordMatch = message.match(
    /\b(?:width|wide)\b\s*(?:is|=|of)?\s*(\d+(?:\.\d+)?)\s*(?:"|inches|inch|in\b)?\b/,
  );

  if (widthKeywordMatch !== null) {
    const valueInches = Number(widthKeywordMatch[1]);

    if (Number.isFinite(valueInches)) {
      return valueInches;
    }
  }

  const firstNumberMatch = message.match(/\b(\d+(?:\.\d+)?)\b/);

  if (firstNumberMatch === null) {
    return null;
  }

  const firstNumberValue = Number(firstNumberMatch[1]);

  if (!Number.isFinite(firstNumberValue)) {
    return null;
  }

  if (isOnlyNumberLikelyPlacementOffset(message, firstNumberValue)) {
    return null;
  }

  return firstNumberValue;
}

function isOnlyNumberLikelyPlacementOffset(message: string, valueInches: number): boolean {
  const numberMatches = [...message.matchAll(/\b(\d+(?:\.\d+)?)\b/g)];

  if (numberMatches.length !== 1) {
    return false;
  }

  const escapedValue = valueInches.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return new RegExp(`\\b${escapedValue}\\s*(?:\\"|inches|inch|in\\b)?\\s+from\\s+(?:the\\s+)?(?:start|end|left|right)(?:\\s+side)?\\b`).test(message)
    || new RegExp(`\\b(?:at|start(?:ing)?\\s+at)\\s+${escapedValue}\\s*(?:\\"|inches|inch|in\\b)?\\b`).test(message);
}
