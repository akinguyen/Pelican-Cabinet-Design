import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { RotationDegrees3D } from "@/core/geometry/rotationTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { PrimitiveGeometry } from "@/engine/primitive-geometry/primitiveGeometryTypes";
import type { PrimitiveMaterial } from "@/engine/primitive-geometry/primitiveMaterialTypes";
import type { AssemblyConfiguration } from "./assemblyConfiguration";

export type PrimitiveGeometryComponent = Readonly<{
  kind: "primitive-geometry";
  id: string;
  label: string;
  geometry: PrimitiveGeometry;
  localPositionInches: Point3DInches;
  localRotationDegrees?: RotationDegrees3D;
  sizeInches: Size3DInches;
  material: PrimitiveMaterial;
  role?: string;
}>;

export type NestedAssemblyComponent = Readonly<{
  kind: "nested-assembly";
  id: string;
  label: string;
  definitionId: string;
  localPositionInches: Point3DInches;
  localRotationDegrees?: RotationDegrees3D;
  configuration: AssemblyConfiguration;
  role?: string;
}>;

export type AssemblyComponent = PrimitiveGeometryComponent | NestedAssemblyComponent;
