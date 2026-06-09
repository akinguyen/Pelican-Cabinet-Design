import type { Bounds3DInches } from "@/core/geometry/boxBounds";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import { measurePlacedAssemblyVisualBounds } from "@/engine/assemblies/assemblyBounds";
import { shouldShowPlacedAssemblyInElevationView } from "@/engine/assemblies/elevation/assemblyElevationProjection";
import type { AssemblyDefinitionRegistry } from "@/engine/assemblies/assemblyRegistry";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { PlacedWallElevationSide } from "./wallElevationGeometry";

export type ElevationViewFitBounds = Readonly<{
  minHorizontalInches: number;
  maxHorizontalInches: number;
  minZInches: number;
  maxZInches: number;
}>;

const MIN_ELEVATION_FIT_WIDTH_INCHES = 96;
const ELEVATION_FIT_PADDING_RATIO = 0.12;
const MIN_ELEVATION_FIT_PADDING_INCHES = 8;

export function measureElevationViewFitBounds(args: {
  activeElevationSide: PlacedWallElevationSide;
  placedAssemblies: readonly PlacedAssembly[];
  registry: AssemblyDefinitionRegistry;
}): ElevationViewFitBounds {
  const edgeDirectionInches = getElevationSideDirection(args.activeElevationSide);
  const wallBounds = createWallElevationFitBounds(args.activeElevationSide);
  const combinedBounds = args.placedAssemblies.reduce((fitBounds, placedAssembly) => {
    if (
      !shouldShowPlacedAssemblyInElevationView({
        placedAssembly,
        activeElevationSide: args.activeElevationSide,
      })
    ) {
      return fitBounds;
    }

    return mergeElevationViewFitBounds(
      fitBounds,
      projectAssemblyBoundsToElevationView({
        boundsInches: measurePlacedAssemblyVisualBounds(placedAssembly, args.registry),
        activeElevationSide: args.activeElevationSide,
        edgeDirectionInches,
      }),
    );
  }, wallBounds);

  return addElevationFitPadding(
    expandElevationFitBoundsToMinimumWidth(
      combinedBounds,
      MIN_ELEVATION_FIT_WIDTH_INCHES,
    ),
  );
}

export function getElevationViewFitBoundsCenter(
  bounds: ElevationViewFitBounds,
): Readonly<{ horizontalInches: number; zInches: number }> {
  return {
    horizontalInches: (bounds.minHorizontalInches + bounds.maxHorizontalInches) / 2,
    zInches: (bounds.minZInches + bounds.maxZInches) / 2,
  };
}

export function getElevationViewFitBoundsSize(
  bounds: ElevationViewFitBounds,
): Readonly<{ widthInches: number; heightInches: number }> {
  return {
    widthInches: Math.max(1, bounds.maxHorizontalInches - bounds.minHorizontalInches),
    heightInches: Math.max(1, bounds.maxZInches - bounds.minZInches),
  };
}

export function getElevationSideWorldPointAtHorizontal(
  activeElevationSide: PlacedWallElevationSide,
  horizontalInches: number,
): Point3DInches {
  const edgeDirectionInches = getElevationSideDirection(activeElevationSide);

  return {
    xInches: activeElevationSide.startPointInches.xInches + edgeDirectionInches.xInches * horizontalInches,
    yInches: activeElevationSide.startPointInches.yInches + edgeDirectionInches.yInches * horizontalInches,
    zInches: 0,
  };
}

function createWallElevationFitBounds(
  activeElevationSide: PlacedWallElevationSide,
): ElevationViewFitBounds {
  return {
    minHorizontalInches: 0,
    maxHorizontalInches: activeElevationSide.lengthInches,
    minZInches: 0,
    maxZInches: activeElevationSide.wallHeightInches,
  };
}

function projectAssemblyBoundsToElevationView(args: {
  boundsInches: Bounds3DInches;
  activeElevationSide: PlacedWallElevationSide;
  edgeDirectionInches: Readonly<{ xInches: number; yInches: number }>;
}): ElevationViewFitBounds {
  return getBoundsCornerPoints(args.boundsInches).reduce(
    (fitBounds, cornerPointInches) =>
      expandElevationFitBoundsToPoint(
        fitBounds,
        projectPointToElevationView({
          pointInches: cornerPointInches,
          activeElevationSide: args.activeElevationSide,
          edgeDirectionInches: args.edgeDirectionInches,
        }),
      ),
    createEmptyElevationFitBounds(),
  );
}

function projectPointToElevationView(args: {
  pointInches: Point3DInches;
  activeElevationSide: PlacedWallElevationSide;
  edgeDirectionInches: Readonly<{ xInches: number; yInches: number }>;
}): Readonly<{ horizontalInches: number; zInches: number }> {
  const offsetXInches = args.pointInches.xInches - args.activeElevationSide.startPointInches.xInches;
  const offsetYInches = args.pointInches.yInches - args.activeElevationSide.startPointInches.yInches;

  return {
    horizontalInches:
      offsetXInches * args.edgeDirectionInches.xInches +
      offsetYInches * args.edgeDirectionInches.yInches,
    zInches: args.pointInches.zInches,
  };
}

function getElevationSideDirection(
  activeElevationSide: PlacedWallElevationSide,
): Readonly<{ xInches: number; yInches: number }> {
  return {
    xInches:
      (activeElevationSide.endPointInches.xInches - activeElevationSide.startPointInches.xInches) /
      activeElevationSide.lengthInches,
    yInches:
      (activeElevationSide.endPointInches.yInches - activeElevationSide.startPointInches.yInches) /
      activeElevationSide.lengthInches,
  };
}

function createEmptyElevationFitBounds(): ElevationViewFitBounds {
  return {
    minHorizontalInches: Number.POSITIVE_INFINITY,
    maxHorizontalInches: Number.NEGATIVE_INFINITY,
    minZInches: Number.POSITIVE_INFINITY,
    maxZInches: Number.NEGATIVE_INFINITY,
  };
}

function expandElevationFitBoundsToPoint(
  bounds: ElevationViewFitBounds,
  point: Readonly<{ horizontalInches: number; zInches: number }>,
): ElevationViewFitBounds {
  return {
    minHorizontalInches: Math.min(bounds.minHorizontalInches, point.horizontalInches),
    maxHorizontalInches: Math.max(bounds.maxHorizontalInches, point.horizontalInches),
    minZInches: Math.min(bounds.minZInches, point.zInches),
    maxZInches: Math.max(bounds.maxZInches, point.zInches),
  };
}

function mergeElevationViewFitBounds(
  firstBounds: ElevationViewFitBounds,
  secondBounds: ElevationViewFitBounds,
): ElevationViewFitBounds {
  return {
    minHorizontalInches: Math.min(firstBounds.minHorizontalInches, secondBounds.minHorizontalInches),
    maxHorizontalInches: Math.max(firstBounds.maxHorizontalInches, secondBounds.maxHorizontalInches),
    minZInches: Math.min(firstBounds.minZInches, secondBounds.minZInches),
    maxZInches: Math.max(firstBounds.maxZInches, secondBounds.maxZInches),
  };
}

function expandElevationFitBoundsToMinimumWidth(
  bounds: ElevationViewFitBounds,
  minimumWidthInches: number,
): ElevationViewFitBounds {
  const widthInches = bounds.maxHorizontalInches - bounds.minHorizontalInches;

  if (widthInches >= minimumWidthInches) {
    return bounds;
  }

  const widthDifferenceInches = minimumWidthInches - widthInches;

  return {
    ...bounds,
    minHorizontalInches: bounds.minHorizontalInches - widthDifferenceInches / 2,
    maxHorizontalInches: bounds.maxHorizontalInches + widthDifferenceInches / 2,
  };
}

function addElevationFitPadding(bounds: ElevationViewFitBounds): ElevationViewFitBounds {
  const widthInches = bounds.maxHorizontalInches - bounds.minHorizontalInches;
  const heightInches = bounds.maxZInches - bounds.minZInches;
  const horizontalPaddingInches = Math.max(
    MIN_ELEVATION_FIT_PADDING_INCHES,
    widthInches * ELEVATION_FIT_PADDING_RATIO,
  );
  const verticalPaddingInches = Math.max(
    MIN_ELEVATION_FIT_PADDING_INCHES,
    heightInches * ELEVATION_FIT_PADDING_RATIO,
  );

  return {
    minHorizontalInches: bounds.minHorizontalInches - horizontalPaddingInches,
    maxHorizontalInches: bounds.maxHorizontalInches + horizontalPaddingInches,
    minZInches: Math.min(0, bounds.minZInches - verticalPaddingInches),
    maxZInches: bounds.maxZInches + verticalPaddingInches,
  };
}

function getBoundsCornerPoints(boundsInches: Bounds3DInches): readonly Point3DInches[] {
  return [
    {
      xInches: boundsInches.minInches.xInches,
      yInches: boundsInches.minInches.yInches,
      zInches: boundsInches.minInches.zInches,
    },
    {
      xInches: boundsInches.maxInches.xInches,
      yInches: boundsInches.minInches.yInches,
      zInches: boundsInches.minInches.zInches,
    },
    {
      xInches: boundsInches.maxInches.xInches,
      yInches: boundsInches.maxInches.yInches,
      zInches: boundsInches.minInches.zInches,
    },
    {
      xInches: boundsInches.minInches.xInches,
      yInches: boundsInches.maxInches.yInches,
      zInches: boundsInches.minInches.zInches,
    },
    {
      xInches: boundsInches.minInches.xInches,
      yInches: boundsInches.minInches.yInches,
      zInches: boundsInches.maxInches.zInches,
    },
    {
      xInches: boundsInches.maxInches.xInches,
      yInches: boundsInches.minInches.yInches,
      zInches: boundsInches.maxInches.zInches,
    },
    {
      xInches: boundsInches.maxInches.xInches,
      yInches: boundsInches.maxInches.yInches,
      zInches: boundsInches.maxInches.zInches,
    },
    {
      xInches: boundsInches.minInches.xInches,
      yInches: boundsInches.maxInches.yInches,
      zInches: boundsInches.maxInches.zInches,
    },
  ];
}
