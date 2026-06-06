import type { AssemblyConfiguration, AssemblyOptionValue } from "./assemblyConfiguration";
import type { AssemblyComponent } from "./assemblyComponentTypes";
import type { AssemblyBuildContext } from "./assemblyDefinitionTypes";
import type { RawAssemblyComponentDefinition, RawAssemblyDefinition, RawExpression, RawPrimitiveMaterialDefinition } from "./rawAssemblyDefinitionTypes";
import { evaluateRawCondition } from "./rawAssemblyConditionEvaluator";
import {
  evaluateRawExpression,
  evaluateRawNumberExpression,
  evaluateRawPoint3DExpression,
  evaluateRawRotationDegrees3DExpression,
  evaluateRawSize3DExpression,
  type RawAssemblyExpressionContext,
} from "./rawAssemblyExpressionEvaluator";
import type { PrimitiveMaterial } from "@/engine/primitive-geometry/primitiveMaterialTypes";

export function buildAssemblyFromRawDefinition(args: {
  rawDefinition: RawAssemblyDefinition;
  context: AssemblyBuildContext;
}): readonly AssemblyComponent[] {
  const expressionContext: RawAssemblyExpressionContext = {
    sizeInches: args.context.sizeInches,
    optionValues: args.context.optionValues,
  };

  return args.rawDefinition.components.flatMap((componentDefinition) =>
    buildRawAssemblyComponent(componentDefinition, expressionContext),
  );
}

function buildRawAssemblyComponent(
  componentDefinition: RawAssemblyComponentDefinition,
  context: RawAssemblyExpressionContext,
): readonly AssemblyComponent[] {
  if (!evaluateRawCondition(componentDefinition.includeWhen, context)) {
    return [];
  }

  const sizeInches =
    componentDefinition.kind === "primitive-geometry"
      ? evaluateRawSize3DExpression(componentDefinition.sizeInches, context)
      : evaluateRawSize3DExpression(componentDefinition.configuration.sizeInches, context);
  const componentContext: RawAssemblyExpressionContext = {
    ...context,
    componentSizeInches: sizeInches,
  };

  if (componentDefinition.kind === "primitive-geometry") {
    return [
      {
        kind: "primitive-geometry",
        id: componentDefinition.id,
        label: componentDefinition.label,
        geometry: componentDefinition.geometry,
        localPositionInches: evaluateRawPoint3DExpression(
          componentDefinition.localPositionInches,
          componentContext,
        ),
        localRotationDegrees: evaluateRawRotationDegrees3DExpression(
          componentDefinition.localRotationDegrees,
          componentContext,
        ),
        sizeInches,
        material: createPrimitiveMaterial(componentDefinition.material, componentContext),
        role: componentDefinition.role,
      },
    ];
  }

  return [
    {
      kind: "nested-assembly",
      id: componentDefinition.id,
      label: componentDefinition.label,
      definitionId: componentDefinition.definitionId,
      localPositionInches: evaluateRawPoint3DExpression(
        componentDefinition.localPositionInches,
        componentContext,
      ),
      localRotationDegrees: evaluateRawRotationDegrees3DExpression(
        componentDefinition.localRotationDegrees,
        componentContext,
      ),
      configuration: createNestedAssemblyConfiguration(componentDefinition.configuration.optionValues, sizeInches, componentContext),
      role: componentDefinition.role,
    },
  ];
}

function createNestedAssemblyConfiguration(
  rawOptionValues: Readonly<Record<string, RawExpression>>,
  sizeInches: AssemblyConfiguration["sizeInches"],
  context: RawAssemblyExpressionContext,
): AssemblyConfiguration {
  const optionValues: Record<string, AssemblyOptionValue> = {};

  Object.entries(rawOptionValues).forEach(([optionId, expression]) => {
    optionValues[optionId] = evaluateRawExpression(expression, context);
  });

  return {
    sizeInches,
    optionValues,
  };
}

const DEFAULT_PRIMITIVE_MATERIAL_COLOR_HEX = "#f8fafc";

function createPrimitiveMaterial(
  materialDefinition: RawPrimitiveMaterialDefinition,
  context: RawAssemblyExpressionContext,
): PrimitiveMaterial {
  return {
    colorHex: getPrimitiveMaterialColorHex(materialDefinition, context),
    opacity:
      materialDefinition.opacity === undefined
        ? undefined
        : evaluateRawNumberExpression(materialDefinition.opacity, context),
  };
}

function getPrimitiveMaterialColorHex(
  materialDefinition: RawPrimitiveMaterialDefinition,
  context: RawAssemblyExpressionContext,
): string {
  if (materialDefinition.colorHex !== undefined) {
    return materialDefinition.colorHex;
  }

  if (materialDefinition.colorOptionId === undefined) {
    return DEFAULT_PRIMITIVE_MATERIAL_COLOR_HEX;
  }

  const optionValue = context.optionValues[materialDefinition.colorOptionId];

  if (optionValue === undefined) {
    throw new Error(
      `Raw primitive material color option "${materialDefinition.colorOptionId}" is missing.`,
    );
  }

  return String(optionValue);
}
