import type { KitchenAiPreDesigned } from "./kitchenAiPreDesignedTypes";

export function summarizeKitchenAiPreDesigned(preDesigned: KitchenAiPreDesigned): string {
  const totalRequirements =
    preDesigned.userRequirements.cabinets.length +
    preDesigned.userRequirements.surfaces.length +
    preDesigned.userRequirements.appliances.length +
    preDesigned.userRequirements.fixtures.length;

  return [
    "preDesigned.json ready:",
    `${preDesigned.wallFaces.length} wall faces`,
    `${preDesigned.wallCorners.length} wall corners`,
    `${preDesigned.existingSceneEntities.length} existing entities`,
    `${preDesigned.userReservationZones.length} reservation zones`,
    `${totalRequirements} structured requirements`,
    `${preDesigned.catalog.length} catalog items`,
  ].join("\n");
}
