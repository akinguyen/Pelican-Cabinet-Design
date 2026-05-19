# Cabinet Editor Complete Refactor

This folder was generated from the uploaded 24,644-line `CabinetEditorBase.tsx` file. The goal is to make the editor easier to maintain without changing the original behavior intentionally.

## Usage

Copy `src/features/cabinet-editor` into your app, then import the editor through the barrel:

```ts
import CabinetEditorBase from "@/features/cabinet-editor";
```

## Structure

```txt
src/features/cabinet-editor/
  CabinetEditorBase.tsx
  components/
    placements/
    canvas/
    elevation/
    layout/
    openings/
    panels/
    shared/
    sidebar/
    walls/
  constants/
  context/
  data/
  engine/
  services/
  types/
  _legacy/
```

## Notes

- The old catch-all `CabinetElement` model was renamed at the shared-placement level: mixed placed objects now use `PlacementElement`, with `CabinetElement`, `ProductElement`, and `AccessoryElement` extending that neutral base.
- Shared generic names such as `CabinetCategory`, `CabinetImage`, `CabinetCatalogItem`, `CabinetSelectionDetail`, and `CABINET_CATALOG` were renamed to `PlacementCategory`, `PlacementImage`, `PlacementCatalogItem`, `PlacementSelectionDetail`, and `PLACEMENT_CATALOG`.
- Active generic state now uses `placements`, `selectedPlacement`, `placementPreview`, `placementsRef`, and `commitPlacementsChange`.
- Cabinet-specific names remain only where the rule is actually cabinet-specific, such as blind-cabinet helpers, oven-cabinet helpers, toe-kick constants, and real catalog item titles.
- External AI/export payload fields such as `cabinets` are preserved at the boundary because they belong to the existing contract.
- The original file is preserved in `_legacy/CabinetEditorBase.original.tsx` so you can diff or roll back quickly.
