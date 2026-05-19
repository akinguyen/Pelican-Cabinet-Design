# Placement element terminology refactor

The editor previously used cabinet terminology for the shared placed-object model. That became confusing once the same shape represented real cabinets, products such as refrigerators/ranges, and accessories such as fillers/end panels.

The active source now uses this neutral model:

```ts
PlacementElementBase
  -> CabinetElement
  -> ProductElement
  -> AccessoryElement

PlacementElement = CabinetElement | ProductElement | AccessoryElement
```

## Renamed shared concepts

The shared, generic concepts were renamed across the active refactor source:

```txt
CabinetCategory       -> PlacementCategory
CabinetImage          -> PlacementImage
CabinetCatalogItem    -> PlacementCatalogItem
CabinetDimensionSet   -> PlacementDimensionSet
CabinetSelectionDetail -> PlacementSelectionDetail
CabinetPlacementPreview -> PlacementPreview
CABINET_CATALOG       -> PLACEMENT_CATALOG
```

The active generic state and function parameters now use names like `placements`, `selectedPlacement`, `placementPreview`, `commitPlacementsChange`, and `placementsRef` instead of generic `cabinets` names. This includes cross-file props and engine helpers, such as `ElevationPlanView` receiving `placements: PlacementElement[]` instead of `cabinets: PlacementElement[]`.

## Names intentionally kept

Some cabinet wording remains where it is semantically correct:

- `CabinetElement` is the actual cabinet subtype of `PlacementElement`.
- Catalog IDs such as `base-two-door-cabinet` are preserved for saved-file and AI compatibility.
- Cabinet-specific helpers such as `isBlindCabinetImage`, `getOvenCabinetHeightSegments`, and `CABINET_TOE_KICK_HEIGHT_INCHES` remain because those rules only apply to real cabinet objects.
- External AI payload fields such as `cabinets` and summary fields such as `cabinetCount` remain because they belong to the existing external contract.
- `_legacy/CabinetEditorBase.original.tsx` intentionally keeps the original terminology as a rollback/diff reference.

## Renamed active files

```txt
components/cabinets/CabinetViews.tsx      -> components/placements/PlacementViews.tsx
constants/cabinetConstants.ts             -> constants/placementConstants.ts
data/cabinetCatalog.ts                    -> data/placementCatalog.ts
engine/cabinetClassification.ts           -> engine/placementClassification.ts
```

## New event/tool names

The internal generic placement interactions now use placement terminology:

```txt
place-cabinet                         -> place-placement
pelican-cabinet-selection-change      -> pelican-placement-selection-change
pelican-cabinet-attribute-change      -> pelican-placement-attribute-change
pelican-deselect-cabinet              -> pelican-deselect-placement
pelican-wall-cabinet-placement-mode-change -> pelican-wall-placement-mode-change
pelican-wall-need-cabinet-placement-change -> pelican-wall-need-placement-change
```
