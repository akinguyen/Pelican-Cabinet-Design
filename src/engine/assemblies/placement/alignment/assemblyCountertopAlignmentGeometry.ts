import type { Point2DInches, Point3DInches } from "@/core/geometry/pointTypes";
import { degreesToUserFacingZRadians } from "@/core/geometry/rotationTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";

export function createCountertopWorldPoint(args: {
  hostCountertop: PlacedAssembly;
  localPointInches: Point2DInches;
  zInches: number;
}): Point3DInches {
  const radians = degreesToUserFacingZRadians(args.hostCountertop.rotationDegrees.zDegrees ?? 0);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    xInches:
      args.hostCountertop.worldPositionInches.xInches +
      args.localPointInches.xInches * cos -
      args.localPointInches.yInches * sin,
    yInches:
      args.hostCountertop.worldPositionInches.yInches +
      args.localPointInches.xInches * sin +
      args.localPointInches.yInches * cos,
    zInches: args.zInches,
  };
}
