import type {
  AssemblyDimensionDefinition,
  AssemblyDimensionField,
  AssemblyDimensionOption,
  AssemblyOptionChoice,
  AssemblyOptionDefinition,
  AssemblyOptionGroup,
} from "../assemblyDefinitionTypes";
import type { AssemblyCutoutBehavior } from "../assemblyCutoutBehaviorTypes";
import type { RawAssemblyDefinition } from "./rawAssemblyDefinitionTypes";
import { parseComponents } from "./rawAssemblyDefinitionComponentParsers";
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
} from "./rawAssemblyDefinitionParserReader";
import { parseAssemblyOptionValue } from "./rawAssemblyDefinitionValueParsers";

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
    "cutoutBehavior",
    "dimensions",
    "optionGroups",
    "components",
  ]);

  const defaultDistanceFromFloorInches = readOptionalNumber(
    rawDefinition,
    sourceLabel,
    "definition.defaultDistanceFromFloorInches",
  );
  const cutoutBehavior = rawDefinition.cutoutBehavior === undefined
    ? undefined
    : parseCutoutBehavior(rawDefinition.cutoutBehavior, sourceLabel, "definition.cutoutBehavior");

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
    ...(cutoutBehavior === undefined ? {} : { cutoutBehavior }),
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


function parseCutoutBehavior(
  value: unknown,
  sourceLabel: string,
  path: string,
): AssemblyCutoutBehavior {
  const cutoutBehavior = readRecord(value, sourceLabel, path);
  assertKnownKeys(cutoutBehavior, sourceLabel, path, ["countertop", "wall"]);

  return {
    ...(cutoutBehavior.countertop === undefined
      ? {}
      : {
          countertop: parseCountertopCutoutBehavior(
            cutoutBehavior.countertop,
            sourceLabel,
            `${path}.countertop`,
          ),
        }),
    ...(cutoutBehavior.wall === undefined
      ? {}
      : {
          wall: parseWallCutoutBehavior(
            cutoutBehavior.wall,
            sourceLabel,
            `${path}.wall`,
          ),
        }),
  };
}

function parseCountertopCutoutBehavior(
  value: unknown,
  sourceLabel: string,
  path: string,
): NonNullable<AssemblyCutoutBehavior["countertop"]> {
  const countertopBehavior = readRecord(value, sourceLabel, path);
  assertKnownKeys(countertopBehavior, sourceLabel, path, [
    "source",
    "widthInches",
    "depthInches",
    "localOffsetInches",
  ]);
  const localOffsetInches = countertopBehavior.localOffsetInches === undefined
    ? undefined
    : parseCountertopCutoutLocalOffsetInches(
        countertopBehavior.localOffsetInches,
        sourceLabel,
        `${path}.localOffsetInches`,
      );

  return {
    source: readEnumValue(
      countertopBehavior.source,
      sourceLabel,
      `${path}.source`,
      ["cutout-body-rectangle"] as const,
    ),
    widthInches: readNumber(countertopBehavior, sourceLabel, `${path}.widthInches`),
    depthInches: readNumber(countertopBehavior, sourceLabel, `${path}.depthInches`),
    ...(localOffsetInches === undefined ? {} : { localOffsetInches }),
  };
}

function parseCountertopCutoutLocalOffsetInches(
  value: unknown,
  sourceLabel: string,
  path: string,
): NonNullable<NonNullable<AssemblyCutoutBehavior["countertop"]>["localOffsetInches"]> {
  const localOffsetInches = readRecord(value, sourceLabel, path);
  assertKnownKeys(localOffsetInches, sourceLabel, path, ["xInches", "yInches"]);

  return {
    xInches: readNumber(localOffsetInches, sourceLabel, `${path}.xInches`),
    yInches: readNumber(localOffsetInches, sourceLabel, `${path}.yInches`),
  };
}

function parseWallCutoutBehavior(
  value: unknown,
  sourceLabel: string,
  path: string,
): NonNullable<AssemblyCutoutBehavior["wall"]> {
  const wallBehavior = readRecord(value, sourceLabel, path);
  assertKnownKeys(wallBehavior, sourceLabel, path, ["source", "insetInches"]);
  const insetInches = readOptionalNumber(wallBehavior, sourceLabel, `${path}.insetInches`);

  return {
    source: readEnumValue(
      wallBehavior.source,
      sourceLabel,
      `${path}.source`,
      ["elevation-projection"] as const,
    ),
    ...(insetInches === undefined ? {} : { insetInches }),
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
