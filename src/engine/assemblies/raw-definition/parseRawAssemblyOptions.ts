import type {
  AssemblyDimensionDefinition,
  AssemblyDimensionField,
  AssemblyDimensionOption,
  AssemblyOptionChoice,
  AssemblyOptionDefinition,
  AssemblyOptionGroup,
} from "@/engine/assemblies/assemblyDefinitionTypes";
import { parseAssemblyOptionValue } from "./parseRawAssemblyExpressions";
import {
  assertKnownKeys,
  parseArray,
  parseOptionalArray,
  readEnumValue,
  readNumber,
  readOptionalBoolean,
  readOptionalNumber,
  readRecord,
  readString,
} from "./rawAssemblyReadHelpers";

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

export function parseDimensions(
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

export function parseOptionGroups(
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
