import type { AssemblyOptionValue } from "./assemblyConfiguration";
import type {
  AssemblyDimensionDefinition,
  AssemblyDimensionField,
  AssemblyDimensionOption,
  AssemblyOptionChoice,
  AssemblyOptionDefinition,
  AssemblyOptionGroup,
} from "./assemblyDefinitionTypes";
import type { PrimitiveBoxFrontOutlineEdge } from "./assemblyComponentTypes";
import type { PrimitiveGeometry } from "@/engine/primitive-geometry/primitiveGeometryTypes";
import type {
  RawAssemblyComponentDefinition,
  RawAssemblyConfigurationDefinition,
  RawAssemblyDefinition,
  RawCondition,
  RawExpression,
  RawNestedAssemblyComponentDefinition,
  RawNumberExpression,
  RawPoint3DExpression,
  RawPrimitiveGeometryComponentDefinition,
  RawPrimitiveMaterialDefinition,
  RawRotationDegrees3DExpression,
  RawSize3DExpression,
} from "./rawAssemblyDefinitionTypes";

const DIMENSION_FIELD_KEYS = [
  "label",
  "defaultValueInches",
  "control",
  "optionsInches",
  "allowCustomValue",
  "minValueInches",
  "maxValueInches",
  "stepInches",
] as const;

const OPTION_DEFINITION_KEYS = [
  "id",
  "label",
  "valueType",
  "control",
  "defaultValue",
  "choices",
  "minValue",
  "maxValue",
  "step",
] as const;

const FRONT_OUTLINE_EDGES = ["top", "right", "bottom", "left"] as const;

export function parseRawAssemblyDefinition(
  rawDefinitionData: unknown,
  sourceLabel: string,
): RawAssemblyDefinition {
  const rawDefinition = readRecord(rawDefinitionData, sourceLabel, "definition");
  assertKnownKeys(rawDefinition, sourceLabel, "definition", [
    "id",
    "name",
    "catalogCategoryId",
    "defaultDistanceFromFloorInches",
    "dimensions",
    "optionGroups",
    "components",
  ]);

  const defaultDistanceFromFloorInches = readOptionalNumber(
    rawDefinition,
    sourceLabel,
    "definition.defaultDistanceFromFloorInches",
  );

  return {
    id: readString(rawDefinition, sourceLabel, "definition.id"),
    name: readString(rawDefinition, sourceLabel, "definition.name"),
    catalogCategoryId: readString(
      rawDefinition,
      sourceLabel,
      "definition.catalogCategoryId",
    ),
    ...(defaultDistanceFromFloorInches === undefined
      ? {}
      : { defaultDistanceFromFloorInches }),
    dimensions: parseDimensions(
      rawDefinition.dimensions,
      sourceLabel,
      "definition.dimensions",
    ),
    optionGroups: parseOptionGroups(
      rawDefinition.optionGroups,
      sourceLabel,
      "definition.optionGroups",
    ),
    components: parseComponents(
      rawDefinition.components,
      sourceLabel,
      "definition.components",
    ),
  };
}

function parseDimensions(
  value: unknown,
  sourceLabel: string,
  path: string,
): AssemblyDimensionDefinition {
  const dimensions = readRecord(value, sourceLabel, path);
  assertKnownKeys(dimensions, sourceLabel, path, [
    "widthInches",
    "depthInches",
    "heightInches",
  ]);

  return {
    widthInches: parseDimensionField(
      dimensions.widthInches,
      sourceLabel,
      `${path}.widthInches`,
    ),
    depthInches: parseDimensionField(
      dimensions.depthInches,
      sourceLabel,
      `${path}.depthInches`,
    ),
    heightInches: parseDimensionField(
      dimensions.heightInches,
      sourceLabel,
      `${path}.heightInches`,
    ),
  };
}

function parseDimensionField(
  value: unknown,
  sourceLabel: string,
  path: string,
): AssemblyDimensionField {
  const field = readRecord(value, sourceLabel, path);
  assertKnownKeys(field, sourceLabel, path, DIMENSION_FIELD_KEYS);

  const control = readEnumValue(
    field.control,
    sourceLabel,
    `${path}.control`,
    ["number", "select"] as const,
  );
  const optionsInches = parseOptionalArray(
    field.optionsInches,
    sourceLabel,
    `${path}.optionsInches`,
    parseDimensionOption,
  );
  const allowCustomValue = readOptionalBoolean(
    field,
    sourceLabel,
    `${path}.allowCustomValue`,
  );
  const minValueInches = readOptionalNumber(
    field,
    sourceLabel,
    `${path}.minValueInches`,
  );
  const maxValueInches = readOptionalNumber(
    field,
    sourceLabel,
    `${path}.maxValueInches`,
  );
  const stepInches = readOptionalNumber(
    field,
    sourceLabel,
    `${path}.stepInches`,
  );

  return {
    label: readString(field, sourceLabel, `${path}.label`),
    defaultValueInches: readNumber(
      field,
      sourceLabel,
      `${path}.defaultValueInches`,
    ),
    control,
    ...(optionsInches === undefined ? {} : { optionsInches }),
    ...(allowCustomValue === undefined ? {} : { allowCustomValue }),
    ...(minValueInches === undefined ? {} : { minValueInches }),
    ...(maxValueInches === undefined ? {} : { maxValueInches }),
    ...(stepInches === undefined ? {} : { stepInches }),
  };
}

function parseDimensionOption(
  value: unknown,
  sourceLabel: string,
  path: string,
): AssemblyDimensionOption {
  const option = readRecord(value, sourceLabel, path);
  assertKnownKeys(option, sourceLabel, path, ["valueInches", "label"]);

  return {
    valueInches: readNumber(option, sourceLabel, `${path}.valueInches`),
    label: readString(option, sourceLabel, `${path}.label`),
  };
}

function parseOptionGroups(
  value: unknown,
  sourceLabel: string,
  path: string,
): readonly AssemblyOptionGroup[] {
  return parseArray(value, sourceLabel, path, parseOptionGroup);
}

function parseOptionGroup(
  value: unknown,
  sourceLabel: string,
  path: string,
): AssemblyOptionGroup {
  const group = readRecord(value, sourceLabel, path);
  assertKnownKeys(group, sourceLabel, path, ["id", "label", "options"]);

  return {
    id: readString(group, sourceLabel, `${path}.id`),
    label: readString(group, sourceLabel, `${path}.label`),
    options: parseArray(group.options, sourceLabel, `${path}.options`, parseOption),
  };
}

function parseOption(
  value: unknown,
  sourceLabel: string,
  path: string,
): AssemblyOptionDefinition {
  const option = readRecord(value, sourceLabel, path);
  assertKnownKeys(option, sourceLabel, path, OPTION_DEFINITION_KEYS);

  const valueType = readEnumValue(
    option.valueType,
    sourceLabel,
    `${path}.valueType`,
    ["number", "boolean", "string"] as const,
  );
  const control = readEnumValue(
    option.control,
    sourceLabel,
    `${path}.control`,
    ["number", "checkbox", "select"] as const,
  );
  const choices = parseOptionalArray(
    option.choices,
    sourceLabel,
    `${path}.choices`,
    parseOptionChoice,
  );
  const minValue = readOptionalNumber(option, sourceLabel, `${path}.minValue`);
  const maxValue = readOptionalNumber(option, sourceLabel, `${path}.maxValue`);
  const step = readOptionalNumber(option, sourceLabel, `${path}.step`);

  return {
    id: readString(option, sourceLabel, `${path}.id`),
    label: readString(option, sourceLabel, `${path}.label`),
    valueType,
    control,
    defaultValue: parseAssemblyOptionValue(
      option.defaultValue,
      sourceLabel,
      `${path}.defaultValue`,
    ),
    ...(choices === undefined ? {} : { choices }),
    ...(minValue === undefined ? {} : { minValue }),
    ...(maxValue === undefined ? {} : { maxValue }),
    ...(step === undefined ? {} : { step }),
  };
}

function parseOptionChoice(
  value: unknown,
  sourceLabel: string,
  path: string,
): AssemblyOptionChoice {
  const choice = readRecord(value, sourceLabel, path);
  assertKnownKeys(choice, sourceLabel, path, ["value", "label"]);

  return {
    value: parseAssemblyOptionValue(choice.value, sourceLabel, `${path}.value`),
    label: readString(choice, sourceLabel, `${path}.label`),
  };
}

function parseComponents(
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

function parseOptionalCondition(
  value: unknown,
  sourceLabel: string,
  path: string,
): RawCondition | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseCondition(value, sourceLabel, path);
}

function parseCondition(
  value: unknown,
  sourceLabel: string,
  path: string,
): RawCondition {
  const condition = readRecord(value, sourceLabel, path);

  if ("ref" in condition) {
    assertKnownKeys(condition, sourceLabel, path, ["ref", "equals"]);

    return {
      ref: readString(condition, sourceLabel, `${path}.ref`),
      equals: parseAssemblyOptionValue(condition.equals, sourceLabel, `${path}.equals`),
    };
  }

  if ("all" in condition) {
    assertKnownKeys(condition, sourceLabel, path, ["all"]);

    return {
      all: parseArray(condition.all, sourceLabel, `${path}.all`, parseCondition),
    };
  }

  if ("any" in condition) {
    assertKnownKeys(condition, sourceLabel, path, ["any"]);

    return {
      any: parseArray(condition.any, sourceLabel, `${path}.any`, parseCondition),
    };
  }

  if ("not" in condition) {
    assertKnownKeys(condition, sourceLabel, path, ["not"]);

    return {
      not: parseCondition(condition.not, sourceLabel, `${path}.not`),
    };
  }

  throwInvalidRawAssemblyDefinition(
    sourceLabel,
    path,
    'condition with "ref", "all", "any", or "not"',
  );
}

function parseNumberExpression(
  value: unknown,
  sourceLabel: string,
  path: string,
): RawNumberExpression {
  return parseExpression(value, sourceLabel, path);
}

function parseOptionalExpression(
  value: unknown,
  sourceLabel: string,
  path: string,
): RawExpression | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseExpression(value, sourceLabel, path);
}

function parseExpression(
  value: unknown,
  sourceLabel: string,
  path: string,
): RawExpression {
  const expression = readRecord(value, sourceLabel, path);

  if ("op" in expression) {
    const op = readEnumValue(expression.op, sourceLabel, `${path}.op`, [
      "add",
      "subtract",
      "multiply",
      "divide",
      "min",
      "max",
      "clamp",
      "negate",
    ] as const);

    switch (op) {
      case "add":
      case "min":
      case "max": {
        assertKnownKeys(expression, sourceLabel, path, ["op", "values"]);

        return {
          op,
          values: parseArray(
            expression.values,
            sourceLabel,
            `${path}.values`,
            parseNumberExpression,
          ),
        };
      }
      case "subtract":
      case "multiply":
      case "divide": {
        assertKnownKeys(expression, sourceLabel, path, ["op", "left", "right"]);

        return {
          op,
          left: parseNumberExpression(expression.left, sourceLabel, `${path}.left`),
          right: parseNumberExpression(expression.right, sourceLabel, `${path}.right`),
        };
      }
      case "clamp": {
        assertKnownKeys(expression, sourceLabel, path, [
          "op",
          "value",
          "min",
          "max",
        ]);

        return {
          op,
          value: parseNumberExpression(expression.value, sourceLabel, `${path}.value`),
          min: parseNumberExpression(expression.min, sourceLabel, `${path}.min`),
          max: parseNumberExpression(expression.max, sourceLabel, `${path}.max`),
        };
      }
      case "negate": {
        assertKnownKeys(expression, sourceLabel, path, ["op", "value"]);

        return {
          op,
          value: parseNumberExpression(expression.value, sourceLabel, `${path}.value`),
        };
      }
    }
  }

  if ("value" in expression) {
    assertKnownKeys(expression, sourceLabel, path, ["value"]);

    return {
      value: parseAssemblyOptionValue(expression.value, sourceLabel, `${path}.value`),
    };
  }

  if ("ref" in expression) {
    assertKnownKeys(expression, sourceLabel, path, ["ref"]);

    return {
      ref: readString(expression, sourceLabel, `${path}.ref`),
    };
  }

  throwInvalidRawAssemblyDefinition(
    sourceLabel,
    path,
    'expression with "value", "ref", or "op"',
  );
}

function parseAssemblyOptionValue(
  value: unknown,
  sourceLabel: string,
  path: string,
): AssemblyOptionValue {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  throwInvalidRawAssemblyDefinition(sourceLabel, path, "string, number, or boolean");
}

function parseArray<T>(
  value: unknown,
  sourceLabel: string,
  path: string,
  parseItem: (value: unknown, sourceLabel: string, path: string) => T,
): readonly T[] {
  if (!Array.isArray(value)) {
    throwInvalidRawAssemblyDefinition(sourceLabel, path, "array");
  }

  return value.map((item, index) => parseItem(item, sourceLabel, `${path}[${index}]`));
}

function parseOptionalArray<T>(
  value: unknown,
  sourceLabel: string,
  path: string,
  parseItem: (value: unknown, sourceLabel: string, path: string) => T,
): readonly T[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseArray(value, sourceLabel, path, parseItem);
}

function readRecord(
  value: unknown,
  sourceLabel: string,
  path: string,
): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throwInvalidRawAssemblyDefinition(sourceLabel, path, "object");
  }

  return value as Readonly<Record<string, unknown>>;
}

function readString(
  record: Readonly<Record<string, unknown>>,
  sourceLabel: string,
  path: string,
): string {
  const value = record[getLastPathSegment(path)];

  if (typeof value !== "string") {
    throwInvalidRawAssemblyDefinition(sourceLabel, path, "string");
  }

  return value;
}

function readOptionalString(
  record: Readonly<Record<string, unknown>>,
  sourceLabel: string,
  path: string,
): string | undefined {
  const value = record[getLastPathSegment(path)];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throwInvalidRawAssemblyDefinition(sourceLabel, path, "string");
  }

  return value;
}

function readNumber(
  record: Readonly<Record<string, unknown>>,
  sourceLabel: string,
  path: string,
): number {
  const value = record[getLastPathSegment(path)];

  if (typeof value !== "number") {
    throwInvalidRawAssemblyDefinition(sourceLabel, path, "number");
  }

  return value;
}

function readOptionalNumber(
  record: Readonly<Record<string, unknown>>,
  sourceLabel: string,
  path: string,
): number | undefined {
  const value = record[getLastPathSegment(path)];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number") {
    throwInvalidRawAssemblyDefinition(sourceLabel, path, "number");
  }

  return value;
}

function readOptionalBoolean(
  record: Readonly<Record<string, unknown>>,
  sourceLabel: string,
  path: string,
): boolean | undefined {
  const value = record[getLastPathSegment(path)];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throwInvalidRawAssemblyDefinition(sourceLabel, path, "boolean");
  }

  return value;
}

function readEnumValue<const T extends readonly string[]>(
  value: unknown,
  sourceLabel: string,
  path: string,
  allowedValues: T,
): T[number] {
  if (typeof value !== "string" || !(allowedValues as readonly string[]).includes(value)) {
    throwInvalidRawAssemblyDefinition(
      sourceLabel,
      path,
      allowedValues.map((allowedValue) => `"${allowedValue}"`).join(" or "),
    );
  }

  return value as T[number];
}

function assertKnownKeys(
  record: Readonly<Record<string, unknown>>,
  sourceLabel: string,
  path: string,
  allowedKeys: readonly string[],
): void {
  const unknownKeys = Object.keys(record).filter(
    (key) => !allowedKeys.includes(key),
  );

  if (unknownKeys.length > 0) {
    throwInvalidRawAssemblyDefinition(
      sourceLabel,
      `${path}.${unknownKeys[0]}`,
      `known key (${allowedKeys.join(", ")})`,
    );
  }
}

function getLastPathSegment(path: string): string {
  const lastDotIndex = path.lastIndexOf(".");

  return lastDotIndex === -1 ? path : path.slice(lastDotIndex + 1);
}

function throwInvalidRawAssemblyDefinition(
  sourceLabel: string,
  path: string,
  expectedValueDescription: string,
): never {
  throw new Error(
    `Invalid raw assembly definition "${sourceLabel}": ${path} must be ${expectedValueDescription}.`,
  );
}
