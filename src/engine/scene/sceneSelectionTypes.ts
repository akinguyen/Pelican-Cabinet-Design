export type SceneEntitySelectionKind = "placed-assembly" | "design-reservation-zone";

export type SceneEntitySelectionRef = Readonly<{
  entityKind: SceneEntitySelectionKind;
  entityId: string;
}>;

export type SceneSelection =
  | Readonly<{
      kind: "scene-entity";
      sceneEntity: SceneEntitySelectionRef;
    }>
  | Readonly<{
      kind: "scene-entities";
      sceneEntities: readonly SceneEntitySelectionRef[];
    }>
  | Readonly<{
      kind: "placed-wall-segment";
      wallGraphId: string;
      wallSegmentId: string;
    }>;

export function createSceneEntitySelectionKey(sceneEntity: SceneEntitySelectionRef): string {
  return `${sceneEntity.entityKind}:${sceneEntity.entityId}`;
}

export function areSceneEntitySelectionsEqual(
  first: SceneEntitySelectionRef,
  second: SceneEntitySelectionRef,
): boolean {
  return first.entityKind === second.entityKind && first.entityId === second.entityId;
}

export function getSceneEntityRefsFromSelection(
  selection: SceneSelection | null,
): readonly SceneEntitySelectionRef[] {
  if (selection?.kind === "scene-entity") {
    return [selection.sceneEntity];
  }

  if (selection?.kind === "scene-entities") {
    return selection.sceneEntities;
  }

  return [];
}



export function createSceneSelectionFromSceneEntities(
  sceneEntities: readonly SceneEntitySelectionRef[],
): SceneSelection | null {
  const uniqueSceneEntities = Array.from(
    new Map(sceneEntities.map((sceneEntity) => [createSceneEntitySelectionKey(sceneEntity), sceneEntity])).values(),
  );

  if (uniqueSceneEntities.length === 0) {
    return null;
  }

  if (uniqueSceneEntities.length === 1) {
    return {
      kind: "scene-entity",
      sceneEntity: uniqueSceneEntities[0],
    };
  }

  return {
    kind: "scene-entities",
    sceneEntities: uniqueSceneEntities,
  };
}

export function isSceneEntitySelected(
  selection: SceneSelection | null,
  sceneEntity: SceneEntitySelectionRef,
): boolean {
  return getSceneEntityRefsFromSelection(selection).some((candidate) => areSceneEntitySelectionsEqual(candidate, sceneEntity));
}

export function shouldKeepSceneEntitySelectionForDrag(
  selection: SceneSelection | null,
  sceneEntity: SceneEntitySelectionRef,
): boolean {
  return isSceneEntitySelected(selection, sceneEntity);
}
