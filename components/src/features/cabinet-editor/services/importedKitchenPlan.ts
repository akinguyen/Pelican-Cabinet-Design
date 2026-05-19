import type { ImportedKitchenPlacement, ImportedKitchenPlan, ImportedKitchenWallPlan } from "../types/editorTypes";

export function toImportedKitchenNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeImportedKitchenPlacement(value: unknown): ImportedKitchenPlacement | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const catalogId = typeof candidate.catalogId === "string" ? candidate.catalogId : null;
  const leftInches = toImportedKitchenNumber(candidate.leftInches);
  const legacyThicknessInches = toImportedKitchenNumber(candidate.thicknessInches);
  const parsedWidthInches = toImportedKitchenNumber(candidate.widthInches);
  const parsedDepthInches = toImportedKitchenNumber(candidate.depthInches);

  if (!catalogId || leftInches === null) return null;

  return {
    catalogId,
    wallFace:
      candidate.wallFace === "interior" || candidate.wallFace === "exterior"
        ? candidate.wallFace
        : null,
    leftInches,
    bottomInches: toImportedKitchenNumber(candidate.bottomInches),
    builtInFillerWidthInches:
      toImportedKitchenNumber(candidate.builtInFillerWidthInches) ??
      toImportedKitchenNumber(candidate.builtInFillerThicknessInches),
    widthInches: legacyThicknessInches ?? parsedWidthInches,
    depthInches:
      parsedDepthInches ?? (legacyThicknessInches !== null ? parsedWidthInches : null),
    heightInches: toImportedKitchenNumber(candidate.heightInches),
    topOption:
      candidate.topOption === "sink" ||
      candidate.topOption === "surface-cooktop" ||
      candidate.topOption === "front-control-cooktop"
        ? candidate.topOption
        : null,
    notes: Array.isArray(candidate.notes)
      ? candidate.notes.filter((item): item is string => typeof item === "string")
      : [],
  };
}

export function normalizeImportedKitchenPlan(value: unknown): ImportedKitchenPlan | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const innerValue =
    "outputShape" in candidate &&
    candidate.outputShape &&
    typeof candidate.outputShape === "object"
      ? (candidate.outputShape as Record<string, unknown>)
      : candidate;

  return {
    layoutType:
      innerValue.layoutType === "single-wall" ||
      innerValue.layoutType === "galley" ||
      innerValue.layoutType === "l-shape" ||
      innerValue.layoutType === "u-shape" ||
      innerValue.layoutType === "connected-wall-return"
        ? innerValue.layoutType
        : undefined,
    wallOrder: Array.isArray(innerValue.wallOrder)
      ? innerValue.wallOrder.filter((item): item is string => typeof item === "string")
      : [],
    walls: Array.isArray(innerValue.walls)
      ? innerValue.walls
          .map((wall): ImportedKitchenWallPlan | null => {
            if (!wall || typeof wall !== "object") return null;
            const wallCandidate = wall as Record<string, unknown>;
            return {
              wallId:
                typeof wallCandidate.wallId === "string" ? wallCandidate.wallId : undefined,
              wallLabel:
                typeof wallCandidate.wallLabel === "string"
                  ? wallCandidate.wallLabel
                  : undefined,
              placements: Array.isArray(wallCandidate.placements)
                ? wallCandidate.placements
                    .map((placement) => normalizeImportedKitchenPlacement(placement))
                    .filter(
                      (placement): placement is ImportedKitchenPlacement => Boolean(placement)
                    )
                : [],
              notes: Array.isArray(wallCandidate.notes)
                ? wallCandidate.notes.filter((item): item is string => typeof item === "string")
                : [],
            };
          })
          .filter((wall): wall is ImportedKitchenWallPlan => Boolean(wall))
      : [],
    notes: Array.isArray(innerValue.notes)
      ? innerValue.notes.filter((item): item is string => typeof item === "string")
      : [],
  };
}
