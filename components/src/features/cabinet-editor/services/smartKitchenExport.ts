import { exportRoomInput } from "@/lib/ai/roomExport";
import type { AiRoomInput } from "@/lib/ai/types";
import { getPlacementDistanceWall, getPlacementElevationCategory, getPlacementElevationDistanceMetrics, getElevationWallInteriorSpan, getOpeningElevationDistanceMetrics, getPeninWallVisibleSegment } from "../components/elevation/ElevationPlanView";
import { attachWallDebugDotsForExport } from "../components/walls/Walls";
import { GRID_SIZE } from "../constants/editorConstants";
import { WALL_THICKNESS } from "../constants/wallConstants";
import { PLACEMENT_CATALOG } from "../data/placementCatalog";
import { placementHasToeKick, getPlacementElementType, getSupportTypeForCategory } from "../engine/placementClassification";
import { distance, pixelsToInches, roundToQuarter } from "../engine/geometry";
import { isDetachedPanelWall, isThickWall } from "../engine/wallEngine";
import type { AiRoomWallWithEditorElevationData, PlacementCatalogItem, PlacementElement, PlacementImage, DoorElement, Point, SmartElevationFixedObject, Wall, WindowElement } from "../types/editorTypes";

export function buildSmartInputCatalog(): AiRoomInput["catalog"] {
  return PLACEMENT_CATALOG.map((catalogItem) => ({
    ...catalogItem,
    supportType: getSupportTypeForCategory(
      catalogItem.category,
      catalogItem.widthInches,
      catalogItem.heightInches
    ),
    hasToeKick: placementHasToeKick({
      category: catalogItem.category,
      widthInches: catalogItem.widthInches,
      heightInches: catalogItem.heightInches,
      image: catalogItem.image,
    }),
  })) as AiRoomInput["catalog"];
}

export function withSmartInputCatalog(room: AiRoomInput): AiRoomInput {
  return {
    ...room,
    catalog: buildSmartInputCatalog(),
  };
}

export const AI_WALL_MATCH_TOLERANCE = 0.75;

export function pointsAlmostEqualForAiWall(left: Point, right: Point, tolerance = AI_WALL_MATCH_TOLERANCE) {
  return Math.abs(left.x - right.x) <= tolerance && Math.abs(left.y - right.y) <= tolerance;
}

export function wallsMatchForAiSelection(editorWall: Wall, aiWall: AiRoomInput["walls"][number]) {
  return (
    (pointsAlmostEqualForAiWall(editorWall.start, aiWall.start) &&
      pointsAlmostEqualForAiWall(editorWall.end, aiWall.end)) ||
    (pointsAlmostEqualForAiWall(editorWall.start, aiWall.end) &&
      pointsAlmostEqualForAiWall(editorWall.end, aiWall.start))
  );
}

export function roundSmartWallWidthInches(value: number) {
  return Math.round(value * 10) / 10;
}

export function roundSmartObjectInches(value: number) {
  return Math.round(value * 10) / 10;
}

export function getEditorElevationWallWidthInches(
  wall: Wall,
  editorWalls: Wall[],
  editorPlacements: PlacementElement[]
) {
  if (!isThickWall(wall)) return null;

  const structuralWalls = editorWalls.filter(
    (candidateWall) => isThickWall(candidateWall) && !isDetachedPanelWall(candidateWall)
  );

  const widthPixels = isDetachedPanelWall(wall)
    ? distance(
        getPeninWallVisibleSegment(wall, structuralWalls).start,
        getPeninWallVisibleSegment(wall, structuralWalls).end
      )
    : getElevationWallInteriorSpan(wall, structuralWalls, editorPlacements).length;
  const widthInches = pixelsToInches(widthPixels);

  return Number.isFinite(widthInches) && widthInches > 0
    ? roundSmartWallWidthInches(widthInches)
    : null;
}

export function findEditorWallForAiWall(
  aiWall: AiRoomInput["walls"][number],
  editorWalls: Wall[]
) {
  const exactIdMatch = editorWalls.find(
    (editorWall) => editorWall.id === aiWall.id && isThickWall(editorWall)
  );

  if (exactIdMatch) return exactIdMatch;

  return editorWalls.find(
    (editorWall) => isThickWall(editorWall) && wallsMatchForAiSelection(editorWall, aiWall)
  ) ?? null;
}

export function getEditorPlacementTopOption(placementItem: PlacementElement) {
  if (placementItem.sinkFixture) return "sink" as const;
  if (placementItem.cooktopFixture === "surface") return "surface-cooktop" as const;
  if (placementItem.cooktopFixture === "front") return "front-control-cooktop" as const;
  return null;
}

export function getPlacementCatalogItemByIdentity(placementItem: { catalogId?: string; image?: PlacementImage }) {
  if (placementItem.catalogId) {
    const catalogMatch = PLACEMENT_CATALOG.find((catalogItem) => catalogItem.id === placementItem.catalogId);
    if (catalogMatch) return catalogMatch;

    // Backward compatibility for drawings saved before the two-door wall cabinet ID was renamed.
    if (placementItem.catalogId === "wall-cabinet") {
      return PLACEMENT_CATALOG.find((catalogItem) => catalogItem.id === "wall-two-door-cabinet") ?? null;
    }

    // Backward compatibility for drawings saved before filler was renamed to base filler.
    if (placementItem.catalogId === "accessory-filler") {
      return PLACEMENT_CATALOG.find((catalogItem) => catalogItem.id === "accessory-base-filler") ?? null;
    }
  }

  if (placementItem.image === "accessory-filler") {
    return PLACEMENT_CATALOG.find((catalogItem) => catalogItem.id === "accessory-base-filler") ?? null;
  }

  return placementItem.image
    ? PLACEMENT_CATALOG.find((catalogItem) => catalogItem.image === placementItem.image) ?? null
    : null;
}

export function getEditorPlacementCatalogItem(placementItem: PlacementElement) {
  return getPlacementCatalogItemByIdentity(placementItem);
}

export function formatDimensionOptionNumber(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
}

export function getCatalogDimensionOptions(catalogItem: PlacementCatalogItem | null | undefined) {
  if (!catalogItem) {
    return {
      widths: [] as number[],
      heights: [] as number[],
      depths: [] as number[],
    };
  }

  const uniqueSorted = (values: number[]) =>
    Array.from(new Set(values.map((value) => roundToQuarter(value)))).sort(
      (left, right) => left - right
    );

  return {
    widths: uniqueSorted(
      catalogItem.standardWidthOptions?.length
        ? catalogItem.standardWidthOptions
        : [catalogItem.widthInches]
    ),
    heights: uniqueSorted(
      catalogItem.standardHeightOptions?.length
        ? catalogItem.standardHeightOptions
        : [catalogItem.heightInches]
    ),
    depths: uniqueSorted(
      catalogItem.standardDepthOptions?.length
        ? catalogItem.standardDepthOptions
        : [catalogItem.depthInches]
    ),
  };
}

export function exportAiRoomInputFromEditor(params: {
  walls: Wall[];
  windows: WindowElement[];
  doors: DoorElement[];
  placements: PlacementElement[];
}) {
  return exportRoomInput({
    walls: attachWallDebugDotsForExport(params.walls) as never,
    windows: params.windows as never,
    doors: params.doors as never,
    cabinets: params.placements as never,
    catalog: PLACEMENT_CATALOG as never,
    gridSize: GRID_SIZE,
    wallThickness: WALL_THICKNESS,
  });
}

export function matchesDimensionOption(options: number[], value: number) {
  return options.some((option) => Math.abs(option - value) < 0.01);
}

export function getDefaultDimensionFromOptions(
  catalogItem: PlacementCatalogItem | null | undefined,
  axis: "width" | "height" | "depth"
) {
  if (!catalogItem) return 0;
  const options = getCatalogDimensionOptions(catalogItem);
  const axisOptions =
    axis === "width" ? options.widths : axis === "height" ? options.heights : options.depths;
  const currentValue =
    axis === "width"
      ? catalogItem.widthInches
      : axis === "height"
        ? catalogItem.heightInches
        : catalogItem.depthInches;

  if (matchesDimensionOption(axisOptions, currentValue)) return currentValue;
  return axisOptions[0] ?? currentValue;
}

export function getEditorElevationFixedObjectsForWall(
  editorWall: Wall,
  editorWalls: Wall[],
  editorWindows: WindowElement[],
  editorDoors: DoorElement[],
  editorPlacements: PlacementElement[]
): SmartElevationFixedObject[] {
  const openingFixedObjects = [
    ...editorWindows
      .filter((windowItem) => windowItem.wallId === editorWall.id)
      .map((windowItem): SmartElevationFixedObject | null => {
        const metrics = getOpeningElevationDistanceMetrics(
          windowItem,
          editorWalls,
          editorPlacements
        );
        if (!metrics) return null;

        return {
          id: windowItem.id,
          type: "window",
          coordinateSpace: "elevationPlan",
          leftInches: roundSmartObjectInches(metrics.distanceFromLeftInches),
          rightInches: roundSmartObjectInches(metrics.distanceFromRightInches),
          bottomInches: roundSmartObjectInches(windowItem.distanceFromFloorInches),
          widthInches: roundSmartObjectInches(pixelsToInches(windowItem.width)),
          heightInches: roundSmartObjectInches(windowItem.heightInches),
        };
      }),
    ...editorDoors
      .filter((doorItem) => doorItem.wallId === editorWall.id)
      .map((doorItem): SmartElevationFixedObject | null => {
        const metrics = getOpeningElevationDistanceMetrics(
          doorItem,
          editorWalls,
          editorPlacements
        );
        if (!metrics) return null;

        return {
          id: doorItem.id,
          type: "door",
          coordinateSpace: "elevationPlan",
          leftInches: roundSmartObjectInches(metrics.distanceFromLeftInches),
          rightInches: roundSmartObjectInches(metrics.distanceFromRightInches),
          bottomInches: roundSmartObjectInches(doorItem.distanceFromFloorInches),
          widthInches: roundSmartObjectInches(pixelsToInches(doorItem.width)),
          heightInches: roundSmartObjectInches(doorItem.heightInches),
        };
      }),
  ].filter((fixedObject): fixedObject is SmartElevationFixedObject => Boolean(fixedObject));

  const placementFixedObjects = editorPlacements
    .map((placementItem): SmartElevationFixedObject | null => {
      const attachedWall = getPlacementDistanceWall(placementItem, editorWalls, editorPlacements);
      if (!attachedWall || attachedWall.id !== editorWall.id) return null;

      const metrics = getPlacementElevationDistanceMetrics(
        placementItem,
        editorWalls,
        editorPlacements
      );
      if (!metrics) return null;

      const catalogItem = getEditorPlacementCatalogItem(placementItem);
      const category =
        getPlacementElevationCategory(placementItem) ??
        placementItem.category ??
        catalogItem?.category ??
        "base";
      const placementType = getPlacementElementType({
        ...placementItem,
        image: placementItem.image ?? catalogItem?.image,
      });
      const bottomInches =
        category === "wall"
          ? placementItem.distanceFromFloorInches ??
            catalogItem?.defaultDistanceFromFloorInches ??
            0
          : 0;

      return {
        id: placementItem.id,
        type: placementType,
        coordinateSpace: "elevationPlan",
        catalogId: placementItem.catalogId ?? null,
        title: catalogItem?.title ?? "Placed object",
        category,
        image: placementItem.image ?? catalogItem?.image ?? null,
        topOption: getEditorPlacementTopOption(placementItem),
        leftInches: roundSmartObjectInches(metrics.distanceFromLeftInches),
        rightInches: roundSmartObjectInches(metrics.distanceFromRightInches),
        bottomInches: roundSmartObjectInches(bottomInches),
        widthInches: roundSmartObjectInches(pixelsToInches(placementItem.width)),
        depthInches: roundSmartObjectInches(pixelsToInches(placementItem.depth)),
        heightInches: roundSmartObjectInches(
          placementItem.heightInches ??
            catalogItem?.heightInches ??
            (category === "wall" ? 30 : 36)
        ),
        lockMode: placementItem.lockMode ?? "locked",
      };
    })
    .filter((fixedObject): fixedObject is SmartElevationFixedObject => Boolean(fixedObject));

  return [...openingFixedObjects, ...placementFixedObjects];
}

export function addEditorElevationWidthsToRoom(
  room: AiRoomInput,
  editorWalls: Wall[],
  editorPlacements: PlacementElement[],
  editorWindows: WindowElement[] = [],
  editorDoors: DoorElement[] = []
): AiRoomInput {
  return {
    ...room,
    walls: room.walls.map((aiWall) => {
      if (aiWall.kind === "thin-wall") return aiWall;

      const editorWall = findEditorWallForAiWall(aiWall, editorWalls);
      const widthInches = editorWall
        ? getEditorElevationWallWidthInches(editorWall, editorWalls, editorPlacements)
        : null;
      const fixedObjects = editorWall
        ? getEditorElevationFixedObjectsForWall(
            editorWall,
            editorWalls,
            editorWindows,
            editorDoors,
            editorPlacements
          )
        : [];
      const needPlacement = editorWall?.needPlacement ?? true;

      if (widthInches === null && fixedObjects.length === 0 && needPlacement) {
        return aiWall;
      }

      const wallWithElevation = aiWall as AiRoomWallWithEditorElevationData;

      return {
        ...wallWithElevation,
        needPlacement,
        elevationPlan: {
          ...(wallWithElevation.elevationPlan ?? {}),
          ...(widthInches === null ? {} : { widthInches }),
          fixedObjects,
        },
        ...(widthInches === null ? {} : { elevationWidthInches: widthInches }),
      };
    }),
  };
}
