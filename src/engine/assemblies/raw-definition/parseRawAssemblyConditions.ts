import type { RawCondition } from "@/engine/assemblies/rawAssemblyDefinitionTypes";
import { parseAssemblyOptionValue } from "./parseRawAssemblyExpressions";
import {
  assertKnownKeys,
  parseArray,
  readRecord,
  readString,
  throwInvalidRawAssemblyDefinition,
} from "./rawAssemblyReadHelpers";

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
