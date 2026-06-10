export type PrimitiveBoxGeometry = Readonly<{
  kind: "box";
}>;

export type PrimitiveCylinderGeometry = Readonly<{
  kind: "cylinder";
}>;

export type PrimitiveRectangularFrustumGeometry = Readonly<{
  kind: "custom-mesh";
  meshId: "rectangular-frustum";
  topWidthRatio: number;
  topDepthRatio: number;
}>;

export type PrimitiveLShapedPrismGeometry = Readonly<{
  kind: "custom-mesh";
  meshId: "l-shaped-prism";
  cutoutWidthRatio: number;
  cutoutDepthRatio: number;
  cutoutCorner: "front-left" | "front-right";
}>;

export type CountertopSlabOpening = Readonly<{
  shape: "rectangle" | "rounded-rectangle";
  centerXInches: number;
  centerYInches: number;
  widthInches: number;
  depthInches: number;
  rotationDegrees: number;
  cornerRadiusInches: number;
}>;

export type PrimitiveCountertopSlabGeometry = Readonly<{
  kind: "custom-mesh";
  meshId: "countertop-slab";
  openingsInches: readonly CountertopSlabOpening[];
}>;

export type PrimitiveCustomMeshGeometry =
  | PrimitiveRectangularFrustumGeometry
  | PrimitiveLShapedPrismGeometry
  | PrimitiveCountertopSlabGeometry;

export type PrimitiveGeometry =
  | PrimitiveBoxGeometry
  | PrimitiveCylinderGeometry
  | PrimitiveCustomMeshGeometry;
