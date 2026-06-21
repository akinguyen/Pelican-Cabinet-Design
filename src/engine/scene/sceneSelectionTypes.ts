import type { SceneEntityKind, SceneEntityRef } from "@/engine/scene-entities/sceneEntityTypes";
export type { SceneEntityKind, SceneEntityRef } from "@/engine/scene-entities/sceneEntityTypes";

export type SceneSelection =
  | Readonly<{ kind: "scene-entity"; sceneEntity: SceneEntityRef }>
  | Readonly<{ kind: "scene-entities"; sceneEntities: readonly SceneEntityRef[] }>
  | Readonly<{ kind: "placed-wall-segment"; wallGraphId: string; wallSegmentId: string }>;

export function createSceneEntitySelectionKey(sceneEntity: SceneEntityRef): string {
  return `${sceneEntity.entityKind}:${sceneEntity.entityId}`;
}

export function getSceneEntityRefsFromSelection(selection: SceneSelection | null): readonly SceneEntityRef[] {
  if (selection?.kind === "scene-entity") {
    return [selection.sceneEntity];
  }
  if (selection?.kind === "scene-entities") {
    return selection.sceneEntities;
  }
  return [];
}

export function createSceneSelectionFromSceneEntities(sceneEntities: readonly SceneEntityRef[]): SceneSelection | null {
  if (sceneEntities.length === 0) return null;
  if (sceneEntities.length === 1) return { kind: "scene-entity", sceneEntity: sceneEntities[0] };
  return { kind: "scene-entities", sceneEntities };
}

export function shouldKeepSceneEntitySelectionForDrag(
  selection: SceneSelection | null,
  sceneEntity: SceneEntityRef,
): boolean {
  return getSceneEntityRefsFromSelection(selection).some((selected) => createSceneEntitySelectionKey(selected) === createSceneEntitySelectionKey(sceneEntity));
}

export function areSceneEntitySelectionsEqual(first: SceneEntityRef, second: SceneEntityRef): boolean {
  return first.entityKind === second.entityKind && first.entityId === second.entityId;
}

export function isSceneEntitySelected(selection: SceneSelection | null, sceneEntity: SceneEntityRef): boolean {
  return getSceneEntityRefsFromSelection(selection).some((selected) => areSceneEntitySelectionsEqual(selected, sceneEntity));
}

