export type PrimitiveBoxGeometry = Readonly<{
  kind: "box";
}>;

export type PrimitiveCylinderGeometry = Readonly<{
  kind: "cylinder";
}>;

export type PrimitiveCustomMeshGeometry = Readonly<{
  kind: "custom-mesh";
  meshId: "rectangular-frustum";
  topWidthRatio: number;
  topDepthRatio: number;
}>;

export type PrimitiveGeometry =
  | PrimitiveBoxGeometry
  | PrimitiveCylinderGeometry
  | PrimitiveCustomMeshGeometry;
