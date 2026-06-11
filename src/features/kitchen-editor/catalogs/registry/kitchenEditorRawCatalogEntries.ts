import type { KitchenEditorRawCatalogEntry } from "./kitchenEditorRawCatalogEntryTypes";
import { builtInCabinetRawCatalogEntries } from "./raw-catalog-entries/builtInCabinetRawCatalogEntries";
import { applianceRawCatalogEntries } from "./raw-catalog-entries/applianceRawCatalogEntries";
import { baseCabinetRawCatalogEntries } from "./raw-catalog-entries/baseCabinetRawCatalogEntries";
import { basicUnitRawCatalogEntries } from "./raw-catalog-entries/basicUnitRawCatalogEntries";
import { pantryCabinetRawCatalogEntries } from "./raw-catalog-entries/pantryCabinetRawCatalogEntries";
import { wallCabinetRawCatalogEntries } from "./raw-catalog-entries/wallCabinetRawCatalogEntries";
import { fixtureRawCatalogEntries } from "./raw-catalog-entries/fixtureRawCatalogEntries";
import { surfaceRawCatalogEntries } from "./raw-catalog-entries/surfaceRawCatalogEntries";
import { openingRawCatalogEntries } from "./raw-catalog-entries/openingRawCatalogEntries";

export const kitchenEditorRawCatalogEntries = [
  ...basicUnitRawCatalogEntries,
  ...baseCabinetRawCatalogEntries,
  ...wallCabinetRawCatalogEntries,
  ...pantryCabinetRawCatalogEntries,
  ...builtInCabinetRawCatalogEntries,
  ...applianceRawCatalogEntries,
  ...fixtureRawCatalogEntries,
  ...surfaceRawCatalogEntries,
  ...openingRawCatalogEntries,
] as const satisfies readonly KitchenEditorRawCatalogEntry[];
