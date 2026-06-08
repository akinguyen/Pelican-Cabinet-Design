import type { KitchenEditorRawCatalogEntry } from "./kitchenEditorRawCatalogEntryTypes";
import { applianceRawCatalogEntries } from "./raw-catalog-entries/applianceRawCatalogEntries";
import { baseCabinetRawCatalogEntries } from "./raw-catalog-entries/baseCabinetRawCatalogEntries";
import { basicUnitRawCatalogEntries } from "./raw-catalog-entries/basicUnitRawCatalogEntries";
import { pantryCabinetRawCatalogEntries } from "./raw-catalog-entries/pantryCabinetRawCatalogEntries";
import { wallCabinetRawCatalogEntries } from "./raw-catalog-entries/wallCabinetRawCatalogEntries";

export const kitchenEditorRawCatalogEntries = [
  ...basicUnitRawCatalogEntries,
  ...baseCabinetRawCatalogEntries,
  ...wallCabinetRawCatalogEntries,
  ...pantryCabinetRawCatalogEntries,
  ...applianceRawCatalogEntries,
] as const satisfies readonly KitchenEditorRawCatalogEntry[];
