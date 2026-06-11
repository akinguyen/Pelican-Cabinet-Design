export type PrimitiveBoxGeometry = Readonly<{
  kind: "box";
}>;

export type PrimitiveCylinderGeometry = Readonly<{
  kind: "cylinder";
}>;

export type PrimitiveRectangularFrustumGeometry = Readonly<{
  kind: "rectangular-frustum";
  topWidthRatio: number;
  topDepthRatio: number;
}>;

export type PrimitiveLShapedPrismGeometry = Readonly<{
  kind: "l-shaped-prism";
  cutoutWidthRatio: number;
  cutoutDepthRatio: number;
  cutoutCorner: "front-left" | "front-right";
}>;

export type CountertopSlabOpening = Readonly<{
  clippedPolygonInches: readonly Readonly<{ xInches: number; yInches: number }>[];
}>;

export type PrimitiveCountertopSlabGeometry = Readonly<{
  kind: "custom-mesh";
  meshId: "countertop-slab";
  openingsInches: readonly CountertopSlabOpening[];
}>;

export type PrimitiveCustomMeshGeometry = PrimitiveCountertopSlabGeometry;

export type PrimitiveGeometry =
  | PrimitiveBoxGeometry
  | PrimitiveCylinderGeometry
  | PrimitiveRectangularFrustumGeometry
  | PrimitiveLShapedPrismGeometry
  | PrimitiveCustomMeshGeometry;
