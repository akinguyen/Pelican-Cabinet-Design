"use client";

import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import { getSceneEntityDistanceFromFloorInches } from "@/engine/scene-entities/sceneEntityTransforms";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { PropertyNumberField } from "../shared/PropertyNumberField";
import { PropertySection } from "../shared/PropertySection";

export function SceneEntityTransformSection({ sceneEntity }: Readonly<{ sceneEntity: SceneEntity }>) {
  return (
    <PropertySection title="Placement">
      <PropertyNumberField label="X" value={sceneEntity.worldPositionInches.xInches} onChange={(value) => useDesignSceneStore.getState().updateSelectedSceneEntityWorldPositionX(value)} />
      <PropertyNumberField label="Y" value={sceneEntity.worldPositionInches.yInches} onChange={(value) => useDesignSceneStore.getState().updateSelectedSceneEntityWorldPositionY(value)} />
      <PropertyNumberField label="Distance from floor" value={getSceneEntityDistanceFromFloorInches(sceneEntity)} onChange={(value) => useDesignSceneStore.getState().updateSelectedSceneEntityDistanceFromFloor(value)} />
      <PropertyNumberField label="Rotation" value={sceneEntity.rotationDegrees.zDegrees} onChange={(value) => useDesignSceneStore.getState().updateSelectedSceneEntityRotationZ(value)} />
    </PropertySection>
  );
}
