import type { AssemblyDefinitionRegistry } from "@/engine/assemblies/assemblyRegistry";
import type { AssemblyDimensionField } from "@/engine/assemblies/assemblyDefinitionTypes";
import type { DesignScene } from "@/engine/scene/designSceneTypes";
import { buildSelectedWallAiContext } from "../context/buildSelectedWallAiContext";
import type {
  AiEditorAction,
  AiEditorActionValidationError,
  AiEditorActionValidationResult,
} from "./aiEditorActionTypes";

const EPSILON_INCHES = 0.0001;

export function validateAiEditorAction(args: {
  action: AiEditorAction;
  designScene: DesignScene;
  registry: AssemblyDefinitionRegistry;
}): AiEditorActionValidationResult {
  switch (args.action.type) {
    case "placeAssemblyOnSelectedWallFace":
      return validatePlaceAssemblyOnSelectedWallFace(args);
    default:
      return {
        valid: false,
        errors: [
          {
            code: "UNSUPPORTED_ACTION",
            message: "This AI editor action is not supported yet.",
          },
        ],
      };
  }
}

function validatePlaceAssemblyOnSelectedWallFace(args: {
  action: Extract<AiEditorAction, { type: "placeAssemblyOnSelectedWallFace" }>;
  designScene: DesignScene;
  registry: AssemblyDefinitionRegistry;
}): AiEditorActionValidationResult {
  const errors: AiEditorActionValidationError[] = [];
  const selectedWallContextResult = buildSelectedWallAiContext(args.designScene);

  if (!selectedWallContextResult.ok) {
    errors.push({
      code: selectedWallContextResult.reason,
      message: selectedWallContextResult.message,
    });
  }

  const definition = args.registry.get(args.action.definitionId);

  if (definition === undefined) {
    errors.push({
      code: "UNKNOWN_DEFINITION",
      message: `Assembly definition not found: ${args.action.definitionId}`,
    });
  } else if (!isDimensionValueAllowed(definition.dimensions.widthInches, args.action.widthInches)) {
    errors.push({
      code: "WIDTH_NOT_ALLOWED",
      message: buildWidthNotAllowedMessage(definition.name, definition.dimensions.widthInches, args.action.widthInches),
    });
  }

  if (selectedWallContextResult.ok) {
    if (args.action.uStartInches < -EPSILON_INCHES) {
      errors.push({
        code: "OUTSIDE_WALL_RANGE",
        message: `The cabinet starts before the elevation-left start side of the selected wall face. uStartInches must be 0 or greater.`,
      });
    }

    const uEndInches = args.action.uStartInches + args.action.widthInches;

    if (uEndInches > selectedWallContextResult.context.lengthInches + EPSILON_INCHES) {
      errors.push({
        code: "OUTSIDE_WALL_RANGE",
        message: `The ${args.action.widthInches}" cabinet would end at ${formatInches(uEndInches)} from the elevation-left start side, but the selected wall face is only ${formatInches(selectedWallContextResult.context.lengthInches)} long.`,
      });
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  return { valid: true };
}

function isDimensionValueAllowed(
  dimensionField: AssemblyDimensionField,
  valueInches: number,
): boolean {
  if (!Number.isFinite(valueInches) || valueInches <= 0) {
    return false;
  }

  if (dimensionField.optionsInches?.some((option) => Math.abs(option.valueInches - valueInches) <= EPSILON_INCHES) === true) {
    return true;
  }

  if (!dimensionField.allowCustomValue) {
    return false;
  }

  if (dimensionField.minValueInches !== undefined && valueInches < dimensionField.minValueInches - EPSILON_INCHES) {
    return false;
  }

  if (dimensionField.maxValueInches !== undefined && valueInches > dimensionField.maxValueInches + EPSILON_INCHES) {
    return false;
  }

  if (dimensionField.stepInches !== undefined && dimensionField.minValueInches !== undefined) {
    const stepOffset = (valueInches - dimensionField.minValueInches) / dimensionField.stepInches;
    return Math.abs(stepOffset - Math.round(stepOffset)) <= EPSILON_INCHES;
  }

  return true;
}

function buildWidthNotAllowedMessage(
  definitionName: string,
  dimensionField: AssemblyDimensionField,
  requestedWidthInches: number,
): string {
  const allowedOptions = dimensionField.optionsInches
    ?.map((option) => formatInches(option.valueInches))
    .join(", ");
  const customRange = dimensionField.allowCustomValue && dimensionField.minValueInches !== undefined && dimensionField.maxValueInches !== undefined
    ? ` Custom widths must be between ${formatInches(dimensionField.minValueInches)} and ${formatInches(dimensionField.maxValueInches)}.`
    : "";

  return `${formatInches(requestedWidthInches)} is not a valid width for ${definitionName}.${allowedOptions === undefined ? "" : ` Allowed catalog widths: ${allowedOptions}.`}${customRange}`;
}

function formatInches(valueInches: number): string {
  return `${Number(valueInches.toFixed(2))}"`;
}
