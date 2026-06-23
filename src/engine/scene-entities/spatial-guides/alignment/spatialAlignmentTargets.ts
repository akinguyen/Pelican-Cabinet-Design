import type { SpatialSceneSnapshot } from "../spatialSceneSnapshot";
import type { SpatialGuideSubject } from "../spatialGuideTypes";

export function createSpatialAlignmentTargets(args: {
  snapshot: SpatialSceneSnapshot;
  excludedIds: ReadonlySet<string>;
}): readonly SpatialGuideSubject[] {
  return [
    ...createWallAlignmentTargetsFromSnapshot(args.snapshot),
    ...args.snapshot.sceneEntityRecords
      .filter((record) => !args.excludedIds.has(record.sceneEntity.id))
      .map((record) => record.subject),
  ];
}

function createWallAlignmentTargetsFromSnapshot(snapshot: SpatialSceneSnapshot): readonly SpatialGuideSubject[] {
  if (snapshot.frame.kind === "wall-face-plane") {
    return snapshot.elevationWallFace === null ? [] : [snapshot.elevationWallFace.subject];
  }

  return snapshot.planWallAlignmentRecords.map((record) => record.subject);
}
