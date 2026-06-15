import type { Point2DInches, Point3DInches } from "@/core/geometry/pointTypes";
import { rotatePointAroundZInches } from "@/core/geometry/pointTypes";
import { degreesToUserFacingZRadians } from "@/core/geometry/rotationTypes";
import type { AssemblyCountertopCutoutBehavior } from "@/engine/assemblies/assemblyCutoutBehaviorTypes";
import { getAssemblyDefinition, type AssemblyDefinitionRegistry } from "@/engine/assemblies/assemblyRegistry";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import {
  clipPolygonAgainstCountertopBounds,
  createCountertopBounds,
  getPolygonAreaInches,
} from "./countertopOpeningGeometry";
import { COUNTERTOP_DEFINITION_ID } from "./countertopDefinitionIds";
import type { DerivedCountertopOpening } from "./countertopOpeningTypes";

const COUNTERTOP_VERTICAL_CUT_TOLERANCE_INCHES = 2;
const MIN_DERIVED_COUNTERTOP_OPENING_SIZE_INCHES = 0.5;

type CountertopCutoutSource = Readonly<{
  sourceAssembly: PlacedAssembly;
  cutoutBehavior: AssemblyCountertopCutoutBehavior;
}>;

export function deriveCountertopOpeningsFromAssemblies(args: {
  placedAssemblies: readonly PlacedAssembly[];
  registry: AssemblyDefinitionRegistry;
}): readonly DerivedCountertopOpening[] {
  const countertopHosts = args.placedAssemblies.filter(isCountertopHostAssembly);
  const countertopCutters = getCountertopCutoutSources(args.placedAssemblies, args.registry);

  if (countertopHosts.length === 0 || countertopCutters.length === 0) {
    return [];
  }

  return countertopHosts.flatMap((hostCountertop) => (
    countertopCutters.flatMap(({ sourceAssembly, cutoutBehavior }) => {
      if (
        sourceAssembly.id === hostCountertop.id ||
        !doesAssemblyIntersectCountertopHeight(sourceAssembly, hostCountertop)
      ) {
        return [];
      }

      const opening = createDerivedCountertopOpening({
        hostCountertop,
        sourceAssembly,
        cutoutBehavior,
      });

      return opening === null ? [] : [opening];
    })
  ));
}

function getCountertopCutoutSources(
  placedAssemblies: readonly PlacedAssembly[],
  registry: AssemblyDefinitionRegistry,
): readonly CountertopCutoutSource[] {
  const countertopCutoutSources: CountertopCutoutSource[] = [];

  for (const placedAssembly of placedAssemblies) {
    const cutoutBehavior = getAssemblyDefinition(
      registry,
      placedAssembly.definitionId,
    ).cutoutBehavior?.countertop;

    if (cutoutBehavior !== undefined) {
      countertopCutoutSources.push({ sourceAssembly: placedAssembly, cutoutBehavior });
    }
  }

  return countertopCutoutSources;
}

function isCountertopHostAssembly(placedAssembly: PlacedAssembly): boolean {
  return placedAssembly.definitionId === COUNTERTOP_DEFINITION_ID;
}

function doesAssemblyIntersectCountertopHeight(
  sourceAssembly: PlacedAssembly,
  hostCountertop: PlacedAssembly,
): boolean {
  const sourceBottomInches = sourceAssembly.worldPositionInches.zInches -
    sourceAssembly.configuration.sizeInches.heightInches / 2;
  const sourceTopInches = sourceAssembly.worldPositionInches.zInches +
    sourceAssembly.configuration.sizeInches.heightInches / 2;
  const countertopBottomInches = hostCountertop.worldPositionInches.zInches -
    hostCountertop.configuration.sizeInches.heightInches / 2;
  const countertopTopInches = hostCountertop.worldPositionInches.zInches +
    hostCountertop.configuration.sizeInches.heightInches / 2;

  return (
    sourceTopInches >= countertopBottomInches - COUNTERTOP_VERTICAL_CUT_TOLERANCE_INCHES &&
    sourceBottomInches <= countertopTopInches + COUNTERTOP_VERTICAL_CUT_TOLERANCE_INCHES
  );
}

function createDerivedCountertopOpening(args: {
  hostCountertop: PlacedAssembly;
  sourceAssembly: PlacedAssembly;
  cutoutBehavior: AssemblyCountertopCutoutBehavior;
}): DerivedCountertopOpening | null {
  const cutoutBody = createCountertopCutoutBodyRectangle({
    sourceAssembly: args.sourceAssembly,
    cutoutBehavior: args.cutoutBehavior,
  });

  if (
    cutoutBody.widthInches < MIN_DERIVED_COUNTERTOP_OPENING_SIZE_INCHES ||
    cutoutBody.depthInches < MIN_DERIVED_COUNTERTOP_OPENING_SIZE_INCHES
  ) {
    return null;
  }

  const localPolygonInches = cutoutBody.worldCornerPointsInches.map((cornerPointInches) =>
    createCountertopLocalPointFromWorld(args.hostCountertop, cornerPointInches),
  );

  if (!doesCutoutBodyOverlapCountertop(args.hostCountertop, localPolygonInches)) {
    return null;
  }

  return {
    id: `derived-countertop-opening:${args.hostCountertop.id}:${args.sourceAssembly.id}`,
    hostCountertopId: args.hostCountertop.id,
    localCenterInches: createCountertopLocalPointFromWorld(
      args.hostCountertop,
      cutoutBody.worldCenterInches,
    ),
    localRotationDegrees:
      (args.sourceAssembly.rotationDegrees.zDegrees ?? 0) -
      (args.hostCountertop.rotationDegrees.zDegrees ?? 0),
    shape: {
      kind: "rectangle",
      widthInches: cutoutBody.widthInches,
      depthInches: cutoutBody.depthInches,
    },
  };
}

type CountertopCutoutBodyRectangle = Readonly<{
  widthInches: number;
  depthInches: number;
  worldCenterInches: Point3DInches;
  worldCornerPointsInches: readonly Point3DInches[];
}>;

function createCountertopCutoutBodyRectangle(args: {
  sourceAssembly: PlacedAssembly;
  cutoutBehavior: AssemblyCountertopCutoutBehavior;
}): CountertopCutoutBodyRectangle {
  const localOffsetInches = args.cutoutBehavior.localOffsetInches ?? { xInches: 0, yInches: 0 };
  const widthInches = Math.max(
    MIN_DERIVED_COUNTERTOP_OPENING_SIZE_INCHES,
    args.cutoutBehavior.widthInches,
  );
  const depthInches = Math.max(
    MIN_DERIVED_COUNTERTOP_OPENING_SIZE_INCHES,
    args.cutoutBehavior.depthInches,
  );
  const localCenterInches: Point3DInches = {
    xInches: localOffsetInches.xInches,
    yInches: localOffsetInches.yInches,
    zInches: 0,
  };
  const rotatedCenterInches = rotatePointAroundZInches(
    localCenterInches,
    args.sourceAssembly.rotationDegrees.zDegrees ?? 0,
  );
  const worldCenterInches: Point3DInches = {
    xInches: args.sourceAssembly.worldPositionInches.xInches + rotatedCenterInches.xInches,
    yInches: args.sourceAssembly.worldPositionInches.yInches + rotatedCenterInches.yInches,
    zInches: args.sourceAssembly.worldPositionInches.zInches,
  };
  const halfWidthInches = widthInches / 2;
  const halfDepthInches = depthInches / 2;
  const localCornerPointsInches: readonly Point3DInches[] = [
    { xInches: localOffsetInches.xInches - halfWidthInches, yInches: localOffsetInches.yInches - halfDepthInches, zInches: 0 },
    { xInches: localOffsetInches.xInches + halfWidthInches, yInches: localOffsetInches.yInches - halfDepthInches, zInches: 0 },
    { xInches: localOffsetInches.xInches + halfWidthInches, yInches: localOffsetInches.yInches + halfDepthInches, zInches: 0 },
    { xInches: localOffsetInches.xInches - halfWidthInches, yInches: localOffsetInches.yInches + halfDepthInches, zInches: 0 },
  ];
  const worldCornerPointsInches = localCornerPointsInches.map((localCornerPointInches) => {
    const rotatedCornerPointInches = rotatePointAroundZInches(
      localCornerPointInches,
      args.sourceAssembly.rotationDegrees.zDegrees ?? 0,
    );

    return {
      xInches: args.sourceAssembly.worldPositionInches.xInches + rotatedCornerPointInches.xInches,
      yInches: args.sourceAssembly.worldPositionInches.yInches + rotatedCornerPointInches.yInches,
      zInches: args.sourceAssembly.worldPositionInches.zInches,
    };
  });

  return {
    widthInches,
    depthInches,
    worldCenterInches,
    worldCornerPointsInches,
  };
}

function doesCutoutBodyOverlapCountertop(
  hostCountertop: PlacedAssembly,
  localPolygonInches: readonly Point2DInches[],
): boolean {
  const clippedPolygonInches = clipPolygonAgainstCountertopBounds(
    localPolygonInches,
    createCountertopBounds(hostCountertop.configuration.sizeInches),
  );

  return getPolygonAreaInches(clippedPolygonInches) >= MIN_DERIVED_COUNTERTOP_OPENING_SIZE_INCHES;
}

function createCountertopLocalPointFromWorld(
  countertop: PlacedAssembly,
  worldPointInches: Point3DInches,
): Point2DInches {
  const deltaXInches = worldPointInches.xInches - countertop.worldPositionInches.xInches;
  const deltaYInches = worldPointInches.yInches - countertop.worldPositionInches.yInches;
  const radians = -degreesToUserFacingZRadians(countertop.rotationDegrees.zDegrees ?? 0);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    xInches: deltaXInches * cos - deltaYInches * sin,
    yInches: deltaXInches * sin + deltaYInches * cos,
  };
}
