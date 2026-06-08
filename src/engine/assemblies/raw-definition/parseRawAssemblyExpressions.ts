import type { AssemblyOptionValue } from "@/engine/assemblies/assemblyConfiguration";
import type {
  RawAssemblyConfigurationDefinition,
  RawExpression,
  RawNumberExpression,
  RawPoint3DExpression,
  RawPrimitiveMaterialDefinition,
  RawRotationDegrees3DExpression,
  RawSize3DExpression,
} from "@/engine/assemblies/rawAssemblyDefinitionTypes";
import {
  assertKnownKeys,
  parseArray,
  readEnumValue,
  readOptionalString,
  readRecord,
  readString,
  throwInvalidRawAssemblyDefinition,
} from "./rawAssemblyReadHelpers";

export function parseAssemblyConfigurationDefinition(
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

export function parseOptionValueExpressions(
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

export function parsePrimitiveMaterial(
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

export function parsePoint3DExpression(
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

export function parseSize3DExpression(
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

export function parseOptionalRotationDegrees3DExpression(
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

export function parseAssemblyOptionValue(
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
