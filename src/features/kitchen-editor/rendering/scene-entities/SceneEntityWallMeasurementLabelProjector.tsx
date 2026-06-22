"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import type { SceneEntityWallMeasurementLabelScreenItem } from "@/engine/scene/designSceneStoreTypes";
import type { SceneEntityWallMeasurementGuide } from "@/engine/scene-entities/spatial-guides/sceneEntitySpatialGuideEngine";

const SCREEN_POSITION_PRECISION_PIXELS = 0.1;

export function SceneEntityWallMeasurementLabelProjector({
  enabled,
  measurementGuides,
}: Readonly<{
  enabled: boolean;
  measurementGuides: readonly SceneEntityWallMeasurementGuide[];
}>) {
  const { camera, size } = useThree();
  const lastItemsRef = useRef<readonly SceneEntityWallMeasurementLabelScreenItem[]>([]);
  const scratchVector = useMemo(() => new Vector3(), []);

  useEffect(() => {
    if (!enabled || measurementGuides.length === 0) {
      lastItemsRef.current = [];
      useDesignSceneStore.getState().setSceneEntityWallMeasurementLabelScreenItems([]);
    }
  }, [enabled, measurementGuides.length]);

  useEffect(() => () => {
    lastItemsRef.current = [];
    useDesignSceneStore.getState().setSceneEntityWallMeasurementLabelScreenItems([]);
  }, []);

  useFrame(() => {
    if (!enabled || measurementGuides.length === 0 || size.width <= 0 || size.height <= 0) {
      return;
    }

    const nextItems = measurementGuides.flatMap((measurementGuide) => {
      scratchVector.set(
        measurementGuide.labelPointInches.xInches,
        measurementGuide.labelPointInches.yInches,
        measurementGuide.labelPointInches.zInches,
      );
      scratchVector.project(camera);

      if (scratchVector.z < -1 || scratchVector.z > 1) {
        return [];
      }

      return [{
        id: measurementGuide.id,
        xPixels: roundScreenPixel((scratchVector.x * 0.5 + 0.5) * size.width),
        yPixels: roundScreenPixel((-scratchVector.y * 0.5 + 0.5) * size.height),
        lengthInches: measurementGuide.lengthInches,
        labelRotationDegrees: measurementGuide.labelRotationDegrees,
      }];
    });

    if (areScreenItemsEqual(lastItemsRef.current, nextItems)) {
      return;
    }

    lastItemsRef.current = nextItems;
    useDesignSceneStore.getState().setSceneEntityWallMeasurementLabelScreenItems(nextItems);
  });

  return null;
}

function roundScreenPixel(value: number): number {
  return Math.round(value / SCREEN_POSITION_PRECISION_PIXELS) * SCREEN_POSITION_PRECISION_PIXELS;
}

function areScreenItemsEqual(
  firstItems: readonly SceneEntityWallMeasurementLabelScreenItem[],
  secondItems: readonly SceneEntityWallMeasurementLabelScreenItem[],
): boolean {
  if (firstItems.length !== secondItems.length) {
    return false;
  }

  return firstItems.every((firstItem, index) => {
    const secondItem = secondItems[index];

    return secondItem !== undefined &&
      firstItem.id === secondItem.id &&
      firstItem.xPixels === secondItem.xPixels &&
      firstItem.yPixels === secondItem.yPixels &&
      firstItem.lengthInches === secondItem.lengthInches &&
      firstItem.labelRotationDegrees === secondItem.labelRotationDegrees;
  });
}
