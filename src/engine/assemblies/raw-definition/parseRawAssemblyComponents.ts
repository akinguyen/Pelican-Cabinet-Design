import type { PrimitiveBoxFrontOutlineEdge } from "@/engine/assemblies/assemblyComponentTypes";
import type { PrimitiveGeometry } from "@/engine/primitive-geometry/primitiveGeometryTypes";
import type {
  RawAssemblyComponentDefinition,
  RawNestedAssemblyComponentDefinition,
  RawPrimitiveGeometryComponentDefinition,
} from "@/engine/assemblies/rawAssemblyDefinitionTypes";
import { parseOptionalCondition } from "./parseRawAssemblyConditions";
import {
  parseAssemblyConfigurationDefinition,
  parseOptionalRotationDegrees3DExpression,
  parsePoint3DExpression,
  parsePrimitiveMaterial,
  parseSize3DExpression,
} from "./parseRawAssemblyExpressions";
import {
  assertKnownKeys,
  parseArray,
  parseOptionalArray,
  readEnumValue,
  readNumber,
  readOptionalString,
  readRecord,
  readString,
  throwInvalidRawAssemblyDefinition,
} from "./rawAssemblyReadHelpers";

const FRONT_OUTLINE_EDGES = ["top", "right", "bottom", "left"] as const;

export function parseComponents(
  value: unknown,
  sourceLabel: string,
  path: string,
): readonly RawAssemblyComponentDefinition[] {
  return parseArray(value, sourceLabel, path, parseComponent);
}

function parseComponent(
  value: unknown,
  sourceLabel: string,
  path: string,
): RawAssemblyComponentDefinition {
  const component = readRecord(value, sourceLabel, path);
  const kind = readEnumValue(component.kind, sourceLabel, `${path}.kind`, [
    "primitive-geometry",
    "nested-assembly",
  ] as const);

  if (kind === "primitive-geometry") {
    return parsePrimitiveGeometryComponent(component, sourceLabel, path);
  }

  return parseNestedAssemblyComponent(component, sourceLabel, path);
}

function parsePrimitiveGeometryComponent(
  component: Readonly<Record<string, unknown>>,
  sourceLabel: string,
  path: string,
): RawPrimitiveGeometryComponentDefinition {
  assertKnownKeys(component, sourceLabel, path, [
    "kind",
    "id",
    "label",
    "geometry",
    "localPositionInches",
    "localRotationDegrees",
    "sizeInches",
    "material",
    "frontOutlineEdges",
    "role",
    "includeWhen",
  ]);

  const localRotationDegrees = parseOptionalRotationDegrees3DExpression(
    component.localRotationDegrees,
    sourceLabel,
    `${path}.localRotationDegrees`,
  );
  const frontOutlineEdges = parseOptionalArray(
    component.frontOutlineEdges,
    sourceLabel,
    `${path}.frontOutlineEdges`,
    parsePrimitiveBoxFrontOutlineEdge,
  );
  const role = readOptionalString(component, sourceLabel, `${path}.role`);
  const includeWhen = parseOptionalCondition(
    component.includeWhen,
    sourceLabel,
    `${path}.includeWhen`,
  );

  return {
    kind: "primitive-geometry",
    id: readString(component, sourceLabel, `${path}.id`),
    label: readString(component, sourceLabel, `${path}.label`),
    geometry: parsePrimitiveGeometry(component.geometry, sourceLabel, `${path}.geometry`),
    localPositionInches: parsePoint3DExpression(
      component.localPositionInches,
      sourceLabel,
      `${path}.localPositionInches`,
    ),
    ...(localRotationDegrees === undefined ? {} : { localRotationDegrees }),
    sizeInches: parseSize3DExpression(
      component.sizeInches,
      sourceLabel,
      `${path}.sizeInches`,
    ),
    material: parsePrimitiveMaterial(component.material, sourceLabel, `${path}.material`),
    ...(frontOutlineEdges === undefined ? {} : { frontOutlineEdges }),
    ...(role === undefined ? {} : { role }),
    ...(includeWhen === undefined ? {} : { includeWhen }),
  };
}

function parseNestedAssemblyComponent(
  component: Readonly<Record<string, unknown>>,
  sourceLabel: string,
  path: string,
): RawNestedAssemblyComponentDefinition {
  assertKnownKeys(component, sourceLabel, path, [
    "kind",
    "id",
    "label",
    "definitionId",
    "localPositionInches",
    "localRotationDegrees",
    "configuration",
    "role",
    "includeWhen",
  ]);

  const localRotationDegrees = parseOptionalRotationDegrees3DExpression(
    component.localRotationDegrees,
    sourceLabel,
    `${path}.localRotationDegrees`,
  );
  const role = readOptionalString(component, sourceLabel, `${path}.role`);
  const includeWhen = parseOptionalCondition(
    component.includeWhen,
    sourceLabel,
    `${path}.includeWhen`,
  );

  return {
    kind: "nested-assembly",
    id: readString(component, sourceLabel, `${path}.id`),
    label: readString(component, sourceLabel, `${path}.label`),
    definitionId: readString(component, sourceLabel, `${path}.definitionId`),
    localPositionInches: parsePoint3DExpression(
      component.localPositionInches,
      sourceLabel,
      `${path}.localPositionInches`,
    ),
    ...(localRotationDegrees === undefined ? {} : { localRotationDegrees }),
    configuration: parseAssemblyConfigurationDefinition(
      component.configuration,
      sourceLabel,
      `${path}.configuration`,
    ),
    ...(role === undefined ? {} : { role }),
    ...(includeWhen === undefined ? {} : { includeWhen }),
  };
}

function parsePrimitiveGeometry(
  value: unknown,
  sourceLabel: string,
  path: string,
): PrimitiveGeometry {
  const geometry = readRecord(value, sourceLabel, path);
  const kind = readEnumValue(geometry.kind, sourceLabel, `${path}.kind`, [
    "box",
    "cylinder",
    "custom-mesh",
  ] as const);

  if (kind !== "custom-mesh") {
    assertKnownKeys(geometry, sourceLabel, path, ["kind"]);

    return { kind };
  }

  assertKnownKeys(geometry, sourceLabel, path, [
    "kind",
    "meshId",
    "topWidthRatio",
    "topDepthRatio",
  ]);

  const meshId = readEnumValue(geometry.meshId, sourceLabel, `${path}.meshId`, [
    "rectangular-frustum",
  ] as const);
  const topWidthRatio = readNumber(geometry, sourceLabel, `${path}.topWidthRatio`);
  const topDepthRatio = readNumber(geometry, sourceLabel, `${path}.topDepthRatio`);

  validateCustomMeshRatio(topWidthRatio, sourceLabel, `${path}.topWidthRatio`);
  validateCustomMeshRatio(topDepthRatio, sourceLabel, `${path}.topDepthRatio`);

  return {
    kind,
    meshId,
    topWidthRatio,
    topDepthRatio,
  };
}

function validateCustomMeshRatio(
  value: number,
  sourceLabel: string,
  path: string,
): void {
  if (value <= 0 || value > 1) {
    throwInvalidRawAssemblyDefinition(sourceLabel, path, "number greater than 0 and less than or equal to 1");
  }
}

function parsePrimitiveBoxFrontOutlineEdge(
  value: unknown,
  sourceLabel: string,
  path: string,
): PrimitiveBoxFrontOutlineEdge {
  return readEnumValue(value, sourceLabel, path, FRONT_OUTLINE_EDGES);
}
