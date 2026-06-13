import type { AssemblyOptionValue } from "../assemblyConfiguration";
import type {
  RawCondition,
  RawExpression,
  RawNumberExpression,
} from "./rawAssemblyDefinitionTypes";
import {
  assertKnownKeys,
  parseArray,
  readEnumValue,
  readRecord,
  readString,
  throwInvalidRawAssemblyDefinition,
} from "./rawAssemblyDefinitionParserReader";

export function parseOptionalCondition(
  value: unknown,
  sourceLabel: string,
  path: string,
): RawCondition | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseCondition(value, sourceLabel, path);
}

export function parseCondition(
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

export function parseNumberExpression(
  value: unknown,
  sourceLabel: string,
  path: string,
): RawNumberExpression {
  return parseExpression(value, sourceLabel, path);
}

export function parseOptionalExpression(
  value: unknown,
  sourceLabel: string,
  path: string,
): RawExpression | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseExpression(value, sourceLabel, path);
}

export function parseExpression(
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
