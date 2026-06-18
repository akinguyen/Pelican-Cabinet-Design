"use client";

import { memo } from "react";
import type { SceneEntityWallMeasurementGuide } from "@/engine/scene-entities/measurement/sceneEntityWallMeasurementGuides";
import { AssemblyWallMeasurementGuides } from "../assemblies/AssemblyWallMeasurementGuides";

export const SceneEntityWallMeasurementGuides = memo(function SceneEntityWallMeasurementGuides({
  measurementGuides,
}: Readonly<{
  measurementGuides: readonly SceneEntityWallMeasurementGuide[];
}>) {
  return <AssemblyWallMeasurementGuides measurementGuides={measurementGuides} />;
});
