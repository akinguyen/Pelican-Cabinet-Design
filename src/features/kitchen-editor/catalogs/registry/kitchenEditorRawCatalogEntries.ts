import type { KitchenEditorRawCatalogEntry } from "./kitchenEditorRawCatalogEntryTypes";
import { applianceRawCatalogEntries } from "./raw-entries/applianceRawCatalogEntries";
import { baseCabinetRawCatalogEntries } from "./raw-entries/baseCabinetRawCatalogEntries";
import { basicUnitRawCatalogEntries } from "./raw-entries/basicUnitRawCatalogEntries";
import { pantryCabinetRawCatalogEntries } from "./raw-entries/pantryCabinetRawCatalogEntries";
import { wallCabinetRawCatalogEntries } from "./raw-entries/wallCabinetRawCatalogEntries";

export const kitchenEditorRawCatalogEntries = [
  ...basicUnitRawCatalogEntries,
  ...baseCabinetRawCatalogEntries,
  ...wallCabinetRawCatalogEntries,
  ...pantryCabinetRawCatalogEntries,
  ...applianceRawCatalogEntries,
] as const satisfies readonly KitchenEditorRawCatalogEntry[];
