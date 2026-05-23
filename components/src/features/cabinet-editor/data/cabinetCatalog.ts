import { PLACEMENT_CATALOG } from './placementCatalog';

export function getCatalogVisualId(catalogId: string): string | null {
  const catalogItem = PLACEMENT_CATALOG.find((item) => item.id === catalogId);
  return catalogItem?.image ?? null;
}
