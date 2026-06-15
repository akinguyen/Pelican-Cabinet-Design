import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { AssemblyComponent } from "./assemblyComponentTypes";
import type { AssemblyOptionValue } from "./assemblyConfiguration";
import type { AssemblyCutoutBehavior } from "./assemblyCutoutBehaviorTypes";

export type AssemblyBuildContext = Readonly<{
  sizeInches: Size3DInches;
  optionValues: Readonly<Record<string, AssemblyOptionValue>>;
}>;

export type AssemblyDefinition = Readonly<{
  id: string;
  name: string;
  catalogCategoryId: string;
  defaultDistanceFromFloorInches?: number;
  cutoutBehavior?: AssemblyCutoutBehavior;
  dimensions: AssemblyDimensionDefinition;
  optionGroups: readonly AssemblyOptionGroup[];
  build: (context: AssemblyBuildContext) => readonly AssemblyComponent[];
}>;

export type AssemblyDimensionDefinition = Readonly<{
  widthInches: AssemblyDimensionField;
  depthInches: AssemblyDimensionField;
  heightInches: AssemblyDimensionField;
}>;

export type AssemblyDimensionField = Readonly<{
  label: string;
  defaultValueInches: number;
  control: "number" | "select";
  optionsInches?: readonly AssemblyDimensionOption[];
  allowCustomValue?: boolean;
  minValueInches?: number;
  maxValueInches?: number;
  stepInches?: number;
}>;

export type AssemblyDimensionOption = Readonly<{
  valueInches: number;
  label: string;
}>;

export type AssemblyOptionGroup = Readonly<{
  id: string;
  label: string;
  options: readonly AssemblyOptionDefinition[];
}>;

export type AssemblyOptionDefinition = Readonly<{
  id: string;
  label: string;
  valueType: "number" | "boolean" | "string";
  control: "number" | "checkbox" | "select";
  defaultValue: AssemblyOptionValue;
  choices?: readonly AssemblyOptionChoice[];
  minValue?: number;
  maxValue?: number;
  step?: number;
}>;

export type AssemblyOptionChoice = Readonly<{
  value: AssemblyOptionValue;
  label: string;
}>;
