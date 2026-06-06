import type { AssemblyOptionValue } from "./assemblyConfiguration";
import type {
  AssemblyDimensionDefinition,
  AssemblyOptionGroup,
} from "./assemblyDefinitionTypes";
import type { PrimitiveGeometry } from "@/engine/primitive-geometry/primitiveGeometryTypes";

export type RawAssemblyDefinition = Readonly<{
  id: string;
  name: string;
  catalogCategoryId: string;
  defaultDistanceFromFloorInches?: number;
  dimensions: AssemblyDimensionDefinition;
  optionGroups: readonly AssemblyOptionGroup[];
  components: readonly RawAssemblyComponentDefinition[];
}>;

export type RawAssemblyComponentDefinition =
  | RawPrimitiveGeometryComponentDefinition
  | RawNestedAssemblyComponentDefinition;

export type RawPrimitiveGeometryComponentDefinition = Readonly<{
  kind: "primitive-geometry";
  id: string;
  label: string;
  geometry: PrimitiveGeometry;
  localPositionInches: RawPoint3DExpression;
  localRotationDegrees?: RawRotationDegrees3DExpression;
  sizeInches: RawSize3DExpression;
  material: RawPrimitiveMaterialDefinition;
  role?: string;
  includeWhen?: RawCondition;
}>;

export type RawNestedAssemblyComponentDefinition = Readonly<{
  kind: "nested-assembly";
  id: string;
  label: string;
  definitionId: string;
  localPositionInches: RawPoint3DExpression;
  localRotationDegrees?: RawRotationDegrees3DExpression;
  configuration: RawAssemblyConfigurationDefinition;
  role?: string;
  includeWhen?: RawCondition;
}>;

export type RawAssemblyConfigurationDefinition = Readonly<{
  sizeInches: RawSize3DExpression;
  optionValues: Readonly<Record<string, RawExpression>>;
}>;

export type RawPrimitiveMaterialDefinition = Readonly<{
  colorHex?: string;
  colorOptionId?: string;
  opacity?: RawNumberExpression;
}>;

export type RawPoint3DExpression = Readonly<{
  xInches: RawNumberExpression;
  yInches: RawNumberExpression;
  zInches: RawNumberExpression;
}>;

export type RawSize3DExpression = Readonly<{
  widthInches: RawNumberExpression;
  depthInches: RawNumberExpression;
  heightInches: RawNumberExpression;
}>;

export type RawRotationDegrees3DExpression = Readonly<{
  xDegrees?: RawNumberExpression;
  yDegrees?: RawNumberExpression;
  zDegrees?: RawNumberExpression;
}>;

export type RawExpression =
  | RawLiteralExpression
  | RawReferenceExpression
  | RawAddExpression
  | RawSubtractExpression
  | RawMultiplyExpression
  | RawDivideExpression
  | RawMinExpression
  | RawMaxExpression
  | RawClampExpression
  | RawNegateExpression;

export type RawNumberExpression = RawExpression;

export type RawLiteralExpression = Readonly<{
  value: AssemblyOptionValue;
}>;

export type RawReferenceExpression = Readonly<{
  ref: string;
}>;

export type RawAddExpression = Readonly<{
  op: "add";
  values: readonly RawNumberExpression[];
}>;

export type RawSubtractExpression = Readonly<{
  op: "subtract";
  left: RawNumberExpression;
  right: RawNumberExpression;
}>;

export type RawMultiplyExpression = Readonly<{
  op: "multiply";
  left: RawNumberExpression;
  right: RawNumberExpression;
}>;

export type RawDivideExpression = Readonly<{
  op: "divide";
  left: RawNumberExpression;
  right: RawNumberExpression;
}>;

export type RawMinExpression = Readonly<{
  op: "min";
  values: readonly RawNumberExpression[];
}>;

export type RawMaxExpression = Readonly<{
  op: "max";
  values: readonly RawNumberExpression[];
}>;

export type RawClampExpression = Readonly<{
  op: "clamp";
  value: RawNumberExpression;
  min: RawNumberExpression;
  max: RawNumberExpression;
}>;

export type RawNegateExpression = Readonly<{
  op: "negate";
  value: RawNumberExpression;
}>;

export type RawCondition =
  | RawEqualsCondition
  | RawAllCondition
  | RawAnyCondition
  | RawNotCondition;

export type RawEqualsCondition = Readonly<{
  ref: string;
  equals: AssemblyOptionValue;
}>;

export type RawAllCondition = Readonly<{
  all: readonly RawCondition[];
}>;

export type RawAnyCondition = Readonly<{
  any: readonly RawCondition[];
}>;

export type RawNotCondition = Readonly<{
  not: RawCondition;
}>;
