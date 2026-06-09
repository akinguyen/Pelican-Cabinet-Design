import type { PrimitiveBoxFrontOutlineEdge } from "../assemblyComponentTypes";
import type { PrimitiveGeometry } from "@/engine/primitive-geometry/primitiveGeometryTypes";
import type {
  RawAssemblyComponentDefinition,
  RawAssemblyConfigurationDefinition,
  RawExpression,
  RawNestedAssemblyComponentDefinition,
  RawPoint3DExpression,
  RawPrimitiveGeometryComponentDefinition,
  RawPrimitiveMaterialDefinition,
  RawRotationDegrees3DExpression,
  RawSize3DExpression,
} from "./rawAssemblyDefinitionTypes";
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
} from "./rawAssemblyDefinitionParserReader";
import {
  parseExpression,
  parseNumberExpression,
  parseOptionalCondition,
  parseOptionalExpression,
} from "./rawAssemblyDefinitionValueParsers";

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

  const meshId = readEnumValue(geometry.meshId, sourceLabel, `${path}.meshId`, [
    "l-shaped-prism",
    "rectangular-frustum",
  ] as const);

  if (meshId === "l-shaped-prism") {
    assertKnownKeys(geometry, sourceLabel, path, [
      "kind",
      "meshId",
      "cutoutWidthRatio",
      "cutoutDepthRatio",
      "cutoutCorner",
    ]);

    const cutoutWidthRatio = readNumber(geometry, sourceLabel, `${path}.cutoutWidthRatio`);
    const cutoutDepthRatio = readNumber(geometry, sourceLabel, `${path}.cutoutDepthRatio`);
    const cutoutCorner = readEnumValue(
      geometry.cutoutCorner,
      sourceLabel,
      `${path}.cutoutCorner`,
      ["front-left", "front-right"] as const,
    );

    validateCustomMeshRatio(cutoutWidthRatio, sourceLabel, `${path}.cutoutWidthRatio`);
    validateCustomMeshRatio(cutoutDepthRatio, sourceLabel, `${path}.cutoutDepthRatio`);

    return {
      kind,
      meshId,
      cutoutWidthRatio,
      cutoutDepthRatio,
      cutoutCorner,
    };
  }

  assertKnownKeys(geometry, sourceLabel, path, [
    "kind",
    "meshId",
    "topWidthRatio",
    "topDepthRatio",
  ]);

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

function parseAssemblyConfigurationDefinition(
  value: unknown,
  sourceLabel: string,
  path: string,
): RawAssemblyConfigurationDefinition {
  const configuration = readRecord(value, sourceLabel, path);
  assertKnownKeys(configuration, sourceLabel, path, ["sizeInches", "optionValues"]);

  return {
    sizeInches: parseSize3DExpression(
      configuration.sizeInches,
      sourceLabel,
      `${path}.sizeInches`,
    ),
    optionValues: parseOptionValueExpressions(
      configuration.optionValues,
      sourceLabel,
      `${path}.optionValues`,
    ),
  };
}

function parseOptionValueExpressions(
  value: unknown,
  sourceLabel: string,
  path: string,
): Readonly<Record<string, RawExpression>> {
  const optionValues = readRecord(value, sourceLabel, path);
  const parsedOptionValues: Record<string, RawExpression> = {};

  for (const [optionId, optionValue] of Object.entries(optionValues)) {
    parsedOptionValues[optionId] = parseExpression(
      optionValue,
      sourceLabel,
      `${path}.${optionId}`,
    );
  }

  return parsedOptionValues;
}

function parsePrimitiveMaterial(
  value: unknown,
  sourceLabel: string,
  path: string,
): RawPrimitiveMaterialDefinition {
  const material = readRecord(value, sourceLabel, path);
  assertKnownKeys(material, sourceLabel, path, [
    "colorHex",
    "colorOptionId",
    "opacity",
  ]);

  const colorHex = readOptionalString(material, sourceLabel, `${path}.colorHex`);
  const colorOptionId = readOptionalString(
    material,
    sourceLabel,
    `${path}.colorOptionId`,
  );
  const opacity = parseOptionalExpression(
    material.opacity,
    sourceLabel,
    `${path}.opacity`,
  );

  return {
    ...(colorHex === undefined ? {} : { colorHex }),
    ...(colorOptionId === undefined ? {} : { colorOptionId }),
    ...(opacity === undefined ? {} : { opacity }),
  };
}

function parsePoint3DExpression(
  value: unknown,
  sourceLabel: string,
  path: string,
): RawPoint3DExpression {
  const point = readRecord(value, sourceLabel, path);
  assertKnownKeys(point, sourceLabel, path, ["xInches", "yInches", "zInches"]);

  return {
    xInches: parseNumberExpression(point.xInches, sourceLabel, `${path}.xInches`),
    yInches: parseNumberExpression(point.yInches, sourceLabel, `${path}.yInches`),
    zInches: parseNumberExpression(point.zInches, sourceLabel, `${path}.zInches`),
  };
}

function parseSize3DExpression(
  value: unknown,
  sourceLabel: string,
  path: string,
): RawSize3DExpression {
  const size = readRecord(value, sourceLabel, path);
  assertKnownKeys(size, sourceLabel, path, [
    "widthInches",
    "depthInches",
    "heightInches",
  ]);

  return {
    widthInches: parseNumberExpression(
      size.widthInches,
      sourceLabel,
      `${path}.widthInches`,
    ),
    depthInches: parseNumberExpression(
      size.depthInches,
      sourceLabel,
      `${path}.depthInches`,
    ),
    heightInches: parseNumberExpression(
      size.heightInches,
      sourceLabel,
      `${path}.heightInches`,
    ),
  };
}

function parseOptionalRotationDegrees3DExpression(
  value: unknown,
  sourceLabel: string,
  path: string,
): RawRotationDegrees3DExpression | undefined {
  if (value === undefined) {
    return undefined;
  }

  const rotationDegrees = readRecord(value, sourceLabel, path);
  assertKnownKeys(rotationDegrees, sourceLabel, path, [
    "xDegrees",
    "yDegrees",
    "zDegrees",
  ]);

  const xDegrees = parseOptionalExpression(
    rotationDegrees.xDegrees,
    sourceLabel,
    `${path}.xDegrees`,
  );
  const yDegrees = parseOptionalExpression(
    rotationDegrees.yDegrees,
    sourceLabel,
    `${path}.yDegrees`,
  );
  const zDegrees = parseOptionalExpression(
    rotationDegrees.zDegrees,
    sourceLabel,
    `${path}.zDegrees`,
  );

  return {
    ...(xDegrees === undefined ? {} : { xDegrees }),
    ...(yDegrees === undefined ? {} : { yDegrees }),
    ...(zDegrees === undefined ? {} : { zDegrees }),
  };
}
