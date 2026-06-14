import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";

export type AssemblyPlacementEdge = Readonly<{
  index: number;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  midpointInches: Point3DInches;
  lengthInches: number;
}>;

export type AssemblyPlacementFootprint = Readonly<{
  centerPointInches: Point3DInches;
  cornerPointsInches: readonly Point3DInches[];
  edges: readonly AssemblyPlacementEdge[];
}>;

export type AssemblyPlacementMovementSource = "perspective" | "floor-plan" | "elevation";

export type AssemblyPlacementElevationFrame = Readonly<{
  faceDirectionInches: Point3DInches;
  outwardDirectionInches: Point3DInches;
  planeOriginInches: Point3DInches;
}>;

export type AssemblyPlacementSnapContext = Readonly<{
  movementSource: AssemblyPlacementMovementSource;
  elevationMoveFrame?: AssemblyPlacementElevationFrame;
}>;

export type AssemblyPlacementSnapTarget =
  | Readonly<{
      kind: "wall-edge";
      placedWallId: string;
      edgeIndex: number;
      snappedPointInches: Point3DInches;
      distanceInches: number;
    }>
  | Readonly<{
      kind: "wall-corner";
      placedWallId: string;
      cornerIndex: number;
      snappedPointInches: Point3DInches;
      distanceInches: number;
    }>
  | Readonly<{
      kind: "object-alignment";
      alignmentKind: "edge-line" | "center-line" | "corner";
      targetAssemblyId: string;
      distanceInches: number;
    }>;


export type AssemblyObjectAlignmentGuide = Readonly<{
  id: string;
  guideKind: "edge-line" | "center-line" | "corner";
  guidePlane: "plan" | "elevation";
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  labelPointInches?: Point3DInches;
}>;

export type AssemblyPlacementInvalidReason = "overlaps-wall";

export type AssemblyWallMeasurementGuide = Readonly<{
  id: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
  lengthInches: number;
  labelPointInches: Point3DInches;
  labelRotationDegrees: number;
}>;

export type AssemblyWallAttachmentHighlight = Readonly<{
  id: string;
  startPointInches: Point3DInches;
  endPointInches: Point3DInches;
}>;

export type AssemblyPlacementFeedback = Readonly<{
  placedAssembly: PlacedAssembly;
  footprint: AssemblyPlacementFootprint;
  isValid: boolean;
  invalidReason: AssemblyPlacementInvalidReason | null;
  snapTarget: AssemblyPlacementSnapTarget | null;
  wallMeasurementGuides: readonly AssemblyWallMeasurementGuide[];
  wallAttachmentHighlights: readonly AssemblyWallAttachmentHighlight[];
  objectAlignmentGuides: readonly AssemblyObjectAlignmentGuide[];
}>;

export type AssemblyPlacementResult = Readonly<{
  placedAssembly: PlacedAssembly;
  feedback: AssemblyPlacementFeedback;
}>;
