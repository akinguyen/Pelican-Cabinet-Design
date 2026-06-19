import type { SceneEntitySelectionRef } from "@/engine/scene/sceneSelectionTypes";

export function SceneEntityMultiSelectionPanel({
  selectedSceneEntities,
}: Readonly<{
  selectedSceneEntities: readonly SceneEntitySelectionRef[];
}>) {
  const assemblyCount = selectedSceneEntities.filter((sceneEntity) => sceneEntity.entityKind === "placed-assembly").length;
  const designReservationZoneCount = selectedSceneEntities.filter((sceneEntity) => sceneEntity.entityKind === "design-reservation-zone").length;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Multiple scene entities selected</h2>
        <p className="mt-1 text-xs text-slate-500">
          Select one scene entity to edit its properties, or use the scene controls to move/delete the selected group.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <div className="flex items-center justify-between">
          <span>Total selected</span>
          <span className="font-semibold">{selectedSceneEntities.length}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span>Assemblies</span>
          <span className="font-semibold">{assemblyCount}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span>Reservation zones</span>
          <span className="font-semibold">{designReservationZoneCount}</span>
        </div>
      </div>
    </section>
  );
}
