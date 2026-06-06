import type { Size3DInches } from "@/core/geometry/sizeTypes";

export type AssemblyOptionValue = string | number | boolean;

export type AssemblyComponentOverride = Readonly<{
  targetComponentPath: readonly string[];
  materialColorHex?: string;
  isHidden?: boolean;
}>;

export type AssemblyConfiguration = Readonly<{
  sizeInches: Size3DInches;
  optionValues: Readonly<Record<string, AssemblyOptionValue>>;
  componentOverrides?: readonly AssemblyComponentOverride[];
}>;
