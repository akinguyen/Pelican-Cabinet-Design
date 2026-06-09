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

export type PrimitiveCustomMeshGeometry =
  | PrimitiveRectangularFrustumGeometry
  | PrimitiveLShapedPrismGeometry;

export type PrimitiveGeometry =
  | PrimitiveBoxGeometry
  | PrimitiveCylinderGeometry
  | PrimitiveCustomMeshGeometry;
