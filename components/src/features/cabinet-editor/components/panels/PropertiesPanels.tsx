"use client";
import { useState } from "react";
import { BrickWall, ChevronLeft, PencilLine } from "lucide-react";
import { PlacementCatalogImage } from "../placements/PlacementViews";
import { SimpleDoorShape, SimpleWindowShape } from "../sidebar/ContextPanel";
import { canHaveBaseTopFixtureControls, getBlindCabinetWidthSegments, getOvenCabinetHeightSegments, isBlindCabinetImage, isOvenLikeBottomDrawerCabinetImage } from "../../data/placementCatalog";
import { getDefaultPlacementImageForCategory, isAccessoryPlacementImage, isElevationFloatingPlacement, isProductPlacementImage } from "../../engine/placementClassification";
import { add, inchesToPixels, roundToQuarter } from "../../engine/geometry";
import { formatDimensionOptionNumber, getPlacementCatalogItemByIdentity, getCatalogDimensionOptions, getDefaultDimensionFromOptions, matchesDimensionOption } from "../../services/smartKitchenExport";
import type { PlacementDimensionSet, PlacementSelectionDetail, DoorSelectionDetail, OvenCabinetProductLayout, WallPlacementMode, WallSelectionDetail, WindowSelectionDetail } from "../../types/editorTypes";

export function DoorPropertiesPanel({
  selectedDoor,
  onBack,
}: {
  selectedDoor: DoorSelectionDetail;
  onBack: () => void;
}) {
  const updateDoorNumber = (
    field: "widthInches" | "heightInches" | "distanceFromFloorInches" | "distanceFromLeftInches" | "distanceFromRightInches",
    value: string
  ) => {
    const nextValue = Number(value);

    if (!Number.isFinite(nextValue)) return;

    window.dispatchEvent(
      new CustomEvent("pelican-door-attribute-change", {
        detail: {
          id: selectedDoor.id,
          field,
          value: nextValue,
        },
      })
    );
  };


  return (
    <aside className="h-full w-[280px] overflow-y-auto border-r border-slate-200 bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-pelican-navy hover:text-pelican-teal"
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>
      </div>

      <div className="space-y-6 px-4 py-5">
        <div className="flex items-center gap-4">
          <SimpleDoorShape />
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">
              Doors
            </div>
            <div className="text-sm font-bold text-slate-700">
              Simple Door
            </div>
          </div>
        </div>

        <WindowPropertyInput
          label="Width"
          value={roundToQuarter(selectedDoor.widthInches)}
          unit="in"
          onChange={(value) => updateDoorNumber("widthInches", value)}
        />
        <WindowPropertyInput
          label="Height"
          value={roundToQuarter(selectedDoor.heightInches)}
          unit="in"
          onChange={(value) => updateDoorNumber("heightInches", value)}
        />
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Position on wall
          </div>

          {selectedDoor.distanceFromLeftInches !== undefined &&
            selectedDoor.distanceFromRightInches !== undefined &&
            selectedDoor.wallWidthInches !== undefined && (
              <>
                <WindowPropertyInput
                  label="Distance from left"
                  value={roundToQuarter(selectedDoor.distanceFromLeftInches)}
                  unit="in"
                  max={Math.max(0, selectedDoor.wallWidthInches - selectedDoor.widthInches)}
                  onChange={(value) =>
                    updateDoorNumber("distanceFromLeftInches", value)
                  }
                />
                <WindowPropertyInput
                  label="Distance from right"
                  value={roundToQuarter(selectedDoor.distanceFromRightInches)}
                  unit="in"
                  max={Math.max(0, selectedDoor.wallWidthInches - selectedDoor.widthInches)}
                  onChange={(value) =>
                    updateDoorNumber("distanceFromRightInches", value)
                  }
                />
              </>
            )}

          <WindowPropertyInput
            label="Distance from bottom"
            value={roundToQuarter(selectedDoor.distanceFromFloorInches)}
            unit="in"
            onChange={(value) =>
              updateDoorNumber("distanceFromFloorInches", value)
            }
          />
        </div>

        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Door finish
          </div>
          <FinishCard label="Decorator's White" subLabel="Benjamin Moore" />
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Hardware finish
          </div>
          <FinishCard label="Stainless Steel" subLabel="Matcap" />
        </div>
      </div>
    </aside>
  );
}

export function WindowPropertiesPanel({
  selectedWindow,
  onBack,
}: {
  selectedWindow: WindowSelectionDetail;
  onBack: () => void;
}) {
  const updateWindowNumber = (
    field: "widthInches" | "heightInches" | "distanceFromFloorInches" | "distanceFromLeftInches" | "distanceFromRightInches",
    value: string
  ) => {
    const nextValue = Number(value);

    if (!Number.isFinite(nextValue)) return;

    window.dispatchEvent(
      new CustomEvent("pelican-window-attribute-change", {
        detail: {
          id: selectedWindow.id,
          field,
          value: nextValue,
        },
      })
    );
  };

  return (
    <aside className="h-full w-[280px] overflow-y-auto border-r border-slate-200 bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-pelican-navy hover:text-pelican-teal"
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>
      </div>

      <div className="space-y-6 px-4 py-5">
        <div className="flex items-center gap-4">
          <SimpleWindowShape />
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">
              Windows
            </div>
            <div className="text-sm font-bold text-slate-700">
              Simple Window
            </div>
          </div>
        </div>

        <WindowPropertyInput
          label="Width"
          value={roundToQuarter(selectedWindow.widthInches)}
          unit="in"
          onChange={(value) => updateWindowNumber("widthInches", value)}
        />
        <WindowPropertyInput
          label="Height"
          value={roundToQuarter(selectedWindow.heightInches)}
          unit="in"
          onChange={(value) => updateWindowNumber("heightInches", value)}
        />
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Position on wall
          </div>

          {selectedWindow.distanceFromLeftInches !== undefined &&
            selectedWindow.distanceFromRightInches !== undefined &&
            selectedWindow.wallWidthInches !== undefined && (
              <>
                <WindowPropertyInput
                  label="Distance from left"
                  value={roundToQuarter(selectedWindow.distanceFromLeftInches)}
                  unit="in"
                  max={Math.max(0, selectedWindow.wallWidthInches - selectedWindow.widthInches)}
                  onChange={(value) =>
                    updateWindowNumber("distanceFromLeftInches", value)
                  }
                />
                <WindowPropertyInput
                  label="Distance from right"
                  value={roundToQuarter(selectedWindow.distanceFromRightInches)}
                  unit="in"
                  max={Math.max(0, selectedWindow.wallWidthInches - selectedWindow.widthInches)}
                  onChange={(value) =>
                    updateWindowNumber("distanceFromRightInches", value)
                  }
                />
              </>
            )}

          <WindowPropertyInput
            label="Distance from bottom"
            value={roundToQuarter(selectedWindow.distanceFromFloorInches)}
            unit="in"
            onChange={(value) =>
              updateWindowNumber("distanceFromFloorInches", value)
            }
          />
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Frame style
          </div>
          <div className="flex h-14 items-center justify-between rounded-md border border-slate-200 bg-white px-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-slate-100" />
              <div className="text-sm font-bold text-slate-800">Basic</div>
            </div>
            <PencilLine className="h-4 w-4 text-slate-300" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Window finish
          </div>
          <FinishCard label="Decorator's White" subLabel="Benjamin Moore" />
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Frame finish
          </div>
          <FinishCard label="Decorator's White" subLabel="Benjamin Moore" />
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Hardware finish
          </div>
          <FinishCard label="Stainless Steel" subLabel="Matcap" />
        </div>
      </div>
    </aside>
  );
}

export function WallPropertiesPanel({
  selectedWall,
  onBack,
}: {
  selectedWall: WallSelectionDetail;
  onBack: () => void;
}) {
  const isThickWallSelection = selectedWall.kind !== "thin-wall";

  return (
    <aside className="h-full w-[280px] overflow-y-auto border-r border-slate-200 bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-pelican-navy hover:text-pelican-teal"
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>
      </div>

      <div className="space-y-6 px-4 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-slate-100 text-pelican-navy">
            <BrickWall className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">
              Walls
            </div>
            <div className="text-sm font-bold text-slate-700">
              {selectedWall.kind === "thin-wall"
                ? "Thin Wall"
                : selectedWall.kind === "penin-wall"
                  ? "Peninsula Wall"
                  : selectedWall.kind === "island-wall"
                    ? "Island Wall"
                    : "Wall"}
            </div>
          </div>
        </div>

        {isThickWallSelection ? (
          <div className="space-y-2">
            <label
              htmlFor="wall-placement-mode"
              className="text-[11px] font-bold uppercase text-pelican-navy"
            >
              Placement placement side
            </label>
            <select
              id="wall-placement-mode"
              value={selectedWall.placementMode ?? "interior"}
              onChange={(event) => {
                window.dispatchEvent(
                  new CustomEvent("pelican-wall-placement-mode-change", {
                    detail: {
                      id: selectedWall.id,
                      value: event.target.value as WallPlacementMode,
                    },
                  })
                );
              }}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-pelican-teal"
            >
              <option value="none">None</option>
              <option value="both">Both</option>
              <option value="interior">Interior</option>
              <option value="exterior">Exterior</option>
            </select>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export function PlacementPropertiesPanel({
  selectedPlacement,
  onBack,
}: {
  selectedPlacement: PlacementSelectionDetail;
  onBack: () => void;
}) {
  const [customDimensionPlacementIds, setCustomDimensionPlacementIds] = useState<Set<string>>(() => new Set());
  const isSelectedAccessory = isAccessoryPlacementImage(selectedPlacement.image);
  const selectedPlacementDimensions: PlacementDimensionSet = {
    widthInches: roundToQuarter(selectedPlacement.widthInches),
    heightInches: roundToQuarter(selectedPlacement.heightInches),
    depthInches: roundToQuarter(selectedPlacement.depthInches),
  };
  const selectedCatalogItem = getPlacementCatalogItemByIdentity({
    catalogId: selectedPlacement.catalogId,
    image: selectedPlacement.image,
  });
  const dimensionOptions = selectedCatalogItem && !isSelectedAccessory
    ? getCatalogDimensionOptions(selectedCatalogItem)
    : {
        widths: [selectedPlacementDimensions.widthInches],
        heights: [selectedPlacementDimensions.heightInches],
        depths: [selectedPlacementDimensions.depthInches],
      };
  const matchesStandardDimensionOptions =
    matchesDimensionOption(dimensionOptions.widths, selectedPlacementDimensions.widthInches) &&
    matchesDimensionOption(dimensionOptions.heights, selectedPlacementDimensions.heightInches) &&
    matchesDimensionOption(dimensionOptions.depths, selectedPlacementDimensions.depthInches);
  const isForcedCustomDimension = customDimensionPlacementIds.has(selectedPlacement.id);
  const showCustomDimensionSliders =
    isSelectedAccessory || isForcedCustomDimension || !matchesStandardDimensionOptions;
  const isSelectedProduct = isProductPlacementImage(selectedPlacement.image);
  const selectedObjectName = selectedCatalogItem?.title ?? (isSelectedAccessory ? "Accessory" : isSelectedProduct ? "Product" : "Cabinet");
  const selectedObjectType = isSelectedAccessory
    ? "Accessories"
    : isSelectedProduct
      ? `${selectedPlacement.category === "wall" ? "Wall" : "Base"} Product`
      : `${selectedPlacement.category === "wall" ? "Wall" : "Base"} Placement`;

  const updatePlacementNumber = (
    field: "widthInches" | "depthInches" | "heightInches" | "distanceFromFloorInches" | "distanceFromLeftInches" | "distanceFromRightInches",
    value: string
  ) => {
    const nextValue = Number(value);

    if (!Number.isFinite(nextValue)) return;

    window.dispatchEvent(
      new CustomEvent("pelican-placement-attribute-change", {
        detail: {
          id: selectedPlacement.id,
          field,
          value: nextValue,
        },
      })
    );
  };

  const updatePlacementDimensionDropdownField = (
    field: "widthInches" | "heightInches" | "depthInches",
    value: string
  ) => {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return;

    setCustomDimensionPlacementIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.delete(selectedPlacement.id);
      return nextIds;
    });

    window.dispatchEvent(
      new CustomEvent("pelican-placement-attribute-change", {
        detail: {
          id: selectedPlacement.id,
          field: "dimensions",
          value: {
            ...selectedPlacementDimensions,
            [field]: nextValue,
          },
        },
      })
    );
  };

  const updateCustomDimensionToggle = (checked: boolean) => {
    setCustomDimensionPlacementIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (checked) {
        nextIds.add(selectedPlacement.id);
      } else {
        nextIds.delete(selectedPlacement.id);
      }
      return nextIds;
    });

    if (!checked && !matchesStandardDimensionOptions && selectedCatalogItem) {
      window.dispatchEvent(
        new CustomEvent("pelican-placement-attribute-change", {
        detail: {
          id: selectedPlacement.id,
          field: "dimensions",
          value: {
            widthInches: getDefaultDimensionFromOptions(selectedCatalogItem, "width"),
            heightInches: getDefaultDimensionFromOptions(selectedCatalogItem, "height"),
              depthInches: getDefaultDimensionFromOptions(selectedCatalogItem, "depth"),
            },
          },
        })
      );
    }
  };

  const updatePlacementAccessory = (
    field:
      | "sinkFixture"
      | "cooktopFixture"
      | "cooktopFrontHeightInches"
      | "blindDoorWidthInches"
      | "blindFillerWidthInches"
      | "topFixture"
      | "ovenCabinetProductLayout"
      | "ovenCabinetProductHeightInches"
      | "ovenCabinetFillerHeightInches"
      | "ovenCabinetBottomDrawerHeightInches",
    value:
      | boolean
      | "surface"
      | "front"
      | "none"
      | OvenCabinetProductLayout
      | null
      | number
  ) => {
    window.dispatchEvent(
      new CustomEvent("pelican-placement-attribute-change", {
        detail: {
          id: selectedPlacement.id,
          field,
          value,
        },
      })
    );
  };

  const canAddPlacementTopFixtures =
    selectedPlacement.category === "base" &&
    !isProductPlacementImage(selectedPlacement.image) &&
    !isSelectedAccessory &&
    canHaveBaseTopFixtureControls(selectedPlacement.image);
  const canEditPlacementBottomDistance = isElevationFloatingPlacement({
    category: selectedPlacement.category,
    widthInches: selectedPlacement.widthInches,
    heightInches: selectedPlacement.heightInches,
    image: selectedPlacement.image,
  });
  const isSelectedBlindPlacement = isBlindCabinetImage(selectedPlacement.image);
  const isSelectedOvenBottomDrawerPlacement = isOvenLikeBottomDrawerCabinetImage(selectedPlacement.image);
  const blindPlacementWidths = isSelectedBlindPlacement
    ? getBlindCabinetWidthSegments({
        image: selectedPlacement.image,
        category: selectedPlacement.category,
        width: inchesToPixels(selectedPlacement.widthInches),
        blindDoorWidthInches: selectedPlacement.blindDoorWidthInches,
        blindFillerWidthInches: selectedPlacement.blindFillerWidthInches,
      })
    : null;
  const ovenPlacementHeights = getOvenCabinetHeightSegments(selectedPlacement);

  return (
    <aside className="h-full w-[280px] overflow-y-auto border-r border-slate-200 bg-white">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-pelican-navy hover:text-pelican-teal"
        >
          <ChevronLeft className="h-5 w-5" />
          Back
        </button>
      </div>

      <div className="space-y-6 px-4 py-5">
        <div className="flex items-center gap-4">
          <PlacementCatalogImage
            image={selectedPlacement.image ?? getDefaultPlacementImageForCategory(selectedPlacement.category ?? (selectedPlacement.depthInches <= 15 ? "wall" : "base"))}
            category={selectedPlacement.category ?? (selectedPlacement.depthInches <= 15 ? "wall" : "base")}
            widthInches={selectedPlacement.widthInches}
            heightInches={selectedPlacement.heightInches}
            blindDoorWidthInches={selectedPlacement.blindDoorWidthInches}
            blindFillerWidthInches={selectedPlacement.blindFillerWidthInches}
            ovenCabinetProductLayout={selectedPlacement.ovenCabinetProductLayout}
            ovenCabinetProductHeightInches={selectedPlacement.ovenCabinetProductHeightInches}
            ovenCabinetFillerHeightInches={selectedPlacement.ovenCabinetFillerHeightInches}
            ovenCabinetBottomDrawerHeightInches={selectedPlacement.ovenCabinetBottomDrawerHeightInches}
          />
          <div>
            <div className="text-[11px] font-bold uppercase text-slate-400">
              {selectedObjectType}
            </div>
            <div className="text-sm font-bold text-slate-700">
              {selectedObjectName}
            </div>
          </div>
        </div>

        {!isSelectedAccessory && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase text-pelican-navy">
              Standard dimension
            </div>

            {showCustomDimensionSliders ? (
              <>
                <WindowPropertyInput
                  label="Width"
                  value={roundToQuarter(selectedPlacement.widthInches)}
                  unit="in"
                  min={6}
                  onChange={(value) => updatePlacementNumber("widthInches", value)}
                />
                <WindowPropertyInput
                  label="Height"
                  value={roundToQuarter(selectedPlacement.heightInches)}
                  unit="in"
                  min={1}
                  onChange={(value) => updatePlacementNumber("heightInches", value)}
                />
                <WindowPropertyInput
                  label="Depth"
                  value={roundToQuarter(selectedPlacement.depthInches)}
                  unit="in"
                  min={1}
                  onChange={(value) => updatePlacementNumber("depthInches", value)}
                />
              </>
            ) : (
              <>
                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Width
                  </span>
                  <select
                    value={roundToQuarter(selectedPlacement.widthInches)}
                    onChange={(event) =>
                      updatePlacementDimensionDropdownField("widthInches", event.target.value)
                    }
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-pelican-navy outline-none focus:border-pelican-teal focus:ring-2 focus:ring-pelican-teal/20"
                  >
                    {dimensionOptions.widths.map((dimension) => (
                      <option key={`width-${dimension}`} value={dimension}>
                        {formatDimensionOptionNumber(dimension)} in
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Height
                  </span>
                  <select
                    value={roundToQuarter(selectedPlacement.heightInches)}
                    onChange={(event) =>
                      updatePlacementDimensionDropdownField("heightInches", event.target.value)
                    }
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-pelican-navy outline-none focus:border-pelican-teal focus:ring-2 focus:ring-pelican-teal/20"
                  >
                    {dimensionOptions.heights.map((dimension) => (
                      <option key={`height-${dimension}`} value={dimension}>
                        {formatDimensionOptionNumber(dimension)} in
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Depth
                  </span>
                  <select
                    value={roundToQuarter(selectedPlacement.depthInches)}
                    onChange={(event) =>
                      updatePlacementDimensionDropdownField("depthInches", event.target.value)
                    }
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-pelican-navy outline-none focus:border-pelican-teal focus:ring-2 focus:ring-pelican-teal/20"
                  >
                    {dimensionOptions.depths.map((dimension) => (
                      <option key={`depth-${dimension}`} value={dimension}>
                        {formatDimensionOptionNumber(dimension)} in
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={showCustomDimensionSliders}
                onChange={(event) => updateCustomDimensionToggle(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-pelican-teal focus:ring-pelican-teal"
              />
              <span>
                <span className="block text-[11px] font-bold uppercase text-pelican-navy">
                  Customize dimension
                </span>
                <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">
                  Turn this on to manually adjust width, height, and depth with sliders.
                </span>
              </span>
            </label>
          </div>
        )}

        {showCustomDimensionSliders && isSelectedAccessory && (
          <>
            <WindowPropertyInput
              label="Width"
              value={roundToQuarter(selectedPlacement.widthInches)}
              unit="in"
              min={0.25}
              onChange={(value) => updatePlacementNumber("widthInches", value)}
            />
            <WindowPropertyInput
              label="Height"
              value={roundToQuarter(selectedPlacement.heightInches)}
              unit="in"
              min={1}
              onChange={(value) => updatePlacementNumber("heightInches", value)}
            />
            <WindowPropertyInput
              label="Depth"
              value={roundToQuarter(selectedPlacement.depthInches)}
              unit="in"
              min={1}
              onChange={(value) => updatePlacementNumber("depthInches", value)}
            />
          </>
        )}

        {(selectedPlacement.distanceFromLeftInches !== undefined || canEditPlacementBottomDistance) && (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase text-pelican-navy">
              Position on wall
            </div>

            {selectedPlacement.distanceFromLeftInches !== undefined &&
              selectedPlacement.distanceFromRightInches !== undefined &&
              selectedPlacement.wallWidthInches !== undefined && (
                <>
                  <WindowPropertyInput
                    label="Distance from left"
                    value={roundToQuarter(selectedPlacement.distanceFromLeftInches)}
                    unit="in"
                    max={Math.max(0, selectedPlacement.wallWidthInches - selectedPlacement.widthInches)}
                    onChange={(value) =>
                      updatePlacementNumber("distanceFromLeftInches", value)
                    }
                  />
                  <WindowPropertyInput
                    label="Distance from right"
                    value={roundToQuarter(selectedPlacement.distanceFromRightInches)}
                    unit="in"
                    max={Math.max(0, selectedPlacement.wallWidthInches - selectedPlacement.widthInches)}
                    onChange={(value) =>
                      updatePlacementNumber("distanceFromRightInches", value)
                    }
                  />
                </>
              )}

            {canEditPlacementBottomDistance && (
              <WindowPropertyInput
                label="Distance from bottom"
                value={roundToQuarter(selectedPlacement.distanceFromFloorInches ?? 54)}
                unit="in"
                onChange={(value) =>
                  updatePlacementNumber("distanceFromFloorInches", value)
                }
              />
            )}
          </div>
        )}

        {canAddPlacementTopFixtures && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase text-pelican-navy">
              Cabinet top option
            </div>

            <label className="block space-y-2">
              <span className="text-[11px] font-semibold text-slate-500">
                Fixture / appliance
              </span>
              <select
                value={selectedPlacement.cooktopFixture ?? "none"}
                onChange={(event) =>
                  updatePlacementAccessory(
                    "topFixture",
                    event.target.value as "none" | "surface" | "front"
                  )
                }
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-pelican-navy outline-none focus:border-pelican-teal focus:ring-2 focus:ring-pelican-teal/20"
              >
                <option value="none">None</option>
                <option value="surface">Surface cooktop</option>
                <option value="front">Front-control cooktop</option>
              </select>
            </label>

            {selectedPlacement.cooktopFixture === "front" && (
              <WindowPropertyInput
                label="Front-control height"
                value={roundToQuarter(selectedPlacement.cooktopFrontHeightInches ?? 6)}
                unit="in"
                onChange={(value) => updatePlacementAccessory("cooktopFrontHeightInches", Number(value))}
              />
            )}
          </div>
        )}

        {isSelectedOvenBottomDrawerPlacement && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase text-pelican-navy">
              Oven cabinet products
            </div>

            <label className="block space-y-2">
              <span className="text-[11px] font-semibold text-slate-500">
                Product stack
              </span>
              <select
                value={selectedPlacement.ovenCabinetProductLayout ?? "none"}
                onChange={(event) =>
                  updatePlacementAccessory(
                    "ovenCabinetProductLayout",
                    event.target.value as OvenCabinetProductLayout
                  )
                }
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-pelican-navy outline-none focus:border-pelican-teal focus:ring-2 focus:ring-pelican-teal/20"
              >
                {selectedPlacement.image === "base-microwave-bottom-drawer" ? (
                  <>
                    <option value="none">None</option>
                    <option value="single-microwave">1 Microwave</option>
                  </>
                ) : (
                  <>
                    <option value="none">None</option>
                    <option value="single-oven">1 Oven</option>
                    <option value="double-oven">2 Ovens</option>
                    <option value="microwave-oven">1 Microwave + 1 Oven</option>
                  </>
                )}
              </select>
            </label>

            <WindowPropertyInput
              label="Products height"
              value={roundToQuarter(ovenPlacementHeights.productHeightInches)}
              unit="in"
              max={Math.max(0, ovenPlacementHeights.totalHeightInches - ovenPlacementHeights.bottomDrawerHeightInches)}
              onChange={(value) =>
                updatePlacementAccessory("ovenCabinetProductHeightInches", Number(value))
              }
            />

            <WindowPropertyInput
              label="Filler height"
              value={roundToQuarter(ovenPlacementHeights.fillerHeightInches)}
              unit="in"
              max={Math.max(0, ovenPlacementHeights.totalHeightInches - ovenPlacementHeights.bottomDrawerHeightInches)}
              onChange={(value) =>
                updatePlacementAccessory("ovenCabinetFillerHeightInches", Number(value))
              }
            />

            <WindowPropertyInput
              label="Bottom drawer height"
              value={roundToQuarter(ovenPlacementHeights.bottomDrawerHeightInches)}
              unit="in"
              max={Math.max(0, ovenPlacementHeights.totalHeightInches - ovenPlacementHeights.productHeightInches)}
              onChange={(value) =>
                updatePlacementAccessory("ovenCabinetBottomDrawerHeightInches", Number(value))
              }
            />
          </div>
        )}

        {isSelectedBlindPlacement && blindPlacementWidths && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-bold uppercase text-pelican-navy">
              Blind cabinet front
            </div>

            <WindowPropertyInput
              label="Door width"
              value={roundToQuarter(blindPlacementWidths.doorWidthInches)}
              unit="in"
              min={0}
              max={Math.max(0, blindPlacementWidths.widthInches - blindPlacementWidths.fillerWidthInches - 3)}
              onChange={(value) =>
                updatePlacementAccessory("blindDoorWidthInches", Number(value))
              }
            />

            <WindowPropertyInput
              label="Built-in Filler Width"
              value={roundToQuarter(blindPlacementWidths.fillerWidthInches)}
              unit="in"
              min={0}
              max={Math.max(0, blindPlacementWidths.widthInches - blindPlacementWidths.doorWidthInches - 3)}
              onChange={(value) =>
                updatePlacementAccessory("blindFillerWidthInches", Number(value))
              }
            />
          </div>
        )}

        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Cabinet finish
          </div>
          <FinishCard label="Decorator's White" subLabel="Benjamin Moore" />
          <div className="text-[11px] font-bold uppercase text-pelican-navy">
            Hardware finish
          </div>
          <FinishCard label="Stainless Steel" subLabel="Matcap" />
        </div>
      </div>
    </aside>
  );
}

export function WindowPropertyInput({
  label,
  value,
  unit,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
}) {
  const defaultMin = label === "Width" ? 12 : 0;
  const defaultMax = label === "Width" ? 120 : 144;
  const sliderMin = min ?? defaultMin;
  const sliderMax = Math.max(sliderMin, max ?? defaultMax, value);

  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-bold uppercase text-pelican-navy">
        {label}
      </span>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 accent-pelican-teal"
        />
        <div className="flex h-11 w-[105px] items-center rounded-md border border-slate-200 bg-slate-50 px-3">
          <input
            type="number"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-right text-sm font-bold text-pelican-navy outline-none"
          />
          <span className="ml-1 text-[11px] font-semibold text-slate-400">
            {unit}
          </span>
        </div>
      </div>
    </label>
  );
}

export function FinishCard({ label, subLabel }: { label: string; subLabel: string }) {
  return (
    <div className="flex h-16 items-center justify-between rounded-md border border-slate-200 bg-white px-2">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-md bg-slate-100" />
        <div>
          <div className="text-sm font-bold text-slate-900">{label}</div>
          <div className="text-[11px] text-slate-500">{subLabel}</div>
        </div>
      </div>
      <PencilLine className="h-4 w-4 text-slate-300" />
    </div>
  );
}
