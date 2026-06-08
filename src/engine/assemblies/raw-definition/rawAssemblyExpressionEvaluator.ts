import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { RotationDegrees3D } from "@/core/geometry/rotationTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { AssemblyOptionValue } from "../assemblyConfiguration";
import type {
  RawExpression,
  RawNumberExpression,
  RawPoint3DExpression,
  RawRotationDegrees3DExpression,
  RawSize3DExpression,
} from "./rawAssemblyDefinitionTypes";

export type RawAssemblyExpressionContext = Readonly<{
  sizeInches: Size3DInches;
  optionValues: Readonly<Record<string, AssemblyOptionValue>>;
  componentSizeInches?: Size3DInches;
}>;

export function evaluateRawExpression(
  expression: RawExpression,
  context: RawAssemblyExpressionContext,
): AssemblyOptionValue {
  if ("op" in expression) {
    switch (expression.op) {
    case "add":
      return expression.values.reduce(
        (total, valueExpression) => total + evaluateRawNumberExpression(valueExpression, context),
        0,
      );
    case "subtract":
      return (
        evaluateRawNumberExpression(expression.left, context) -
        evaluateRawNumberExpression(expression.right, context)
      );
    case "multiply":
      return (
        evaluateRawNumberExpression(expression.left, context) *
        evaluateRawNumberExpression(expression.right, context)
      );
    case "divide": {
      const divisor = evaluateRawNumberExpression(expression.right, context);
      if (divisor === 0) {
        throw new Error("Raw divide expression cannot divide by zero.");
      }
      return evaluateRawNumberExpression(expression.left, context) / divisor;
    }
    case "min":
      return Math.min(
        ...expression.values.map((valueExpression) =>
          evaluateRawNumberExpression(valueExpression, context),
        ),
      );
    case "max":
      return Math.max(
        ...expression.values.map((valueExpression) =>
          evaluateRawNumberExpression(valueExpression, context),
        ),
      );
    case "clamp": {
      const value = evaluateRawNumberExpression(expression.value, context);
      const min = evaluateRawNumberExpression(expression.min, context);
      const max = evaluateRawNumberExpression(expression.max, context);
      return Math.min(Math.max(value, min), max);
    }
      case "negate":
        return -evaluateRawNumberExpression(expression.value, context);
    }
  }

  if ("ref" in expression) {
    return readRawReferenceValue(expression.ref, context);
  }

  return expression.value;
}

export function evaluateRawNumberExpression(
  expression: RawNumberExpression,
  context: RawAssemblyExpressionContext,
): number {
  const value = evaluateRawExpression(expression, context);

  if (typeof value !== "number") {
    throw new Error(`Raw expression did not evaluate to a number.`);
  }

  return value;
}

export function evaluateRawPoint3DExpression(
  pointExpression: RawPoint3DExpression,
  context: RawAssemblyExpressionContext,
): Point3DInches {
  return {
    xInches: evaluateRawNumberExpression(pointExpression.xInches, context),
    yInches: evaluateRawNumberExpression(pointExpression.yInches, context),
    zInches: evaluateRawNumberExpression(pointExpression.zInches, context),
  };
}

export function evaluateRawSize3DExpression(
  sizeExpression: RawSize3DExpression,
  context: RawAssemblyExpressionContext,
): Size3DInches {
  return {
    widthInches: evaluateRawNumberExpression(sizeExpression.widthInches, context),
    depthInches: evaluateRawNumberExpression(sizeExpression.depthInches, context),
    heightInches: evaluateRawNumberExpression(sizeExpression.heightInches, context),
  };
}

export function evaluateRawRotationDegrees3DExpression(
  rotationExpression: RawRotationDegrees3DExpression | undefined,
  context: RawAssemblyExpressionContext,
): RotationDegrees3D | undefined {
  if (rotationExpression === undefined) {
    return undefined;
  }

  return {
    xDegrees:
      rotationExpression.xDegrees === undefined
        ? undefined
        : evaluateRawNumberExpression(rotationExpression.xDegrees, context),
    yDegrees:
      rotationExpression.yDegrees === undefined
        ? undefined
        : evaluateRawNumberExpression(rotationExpression.yDegrees, context),
    zDegrees:
      rotationExpression.zDegrees === undefined
        ? undefined
        : evaluateRawNumberExpression(rotationExpression.zDegrees, context),
  };
}

function readRawReferenceValue(
  reference: string,
  context: RawAssemblyExpressionContext,
): AssemblyOptionValue {
  if (reference === "size.widthInches") {
    return context.sizeInches.widthInches;
  }

  if (reference === "size.depthInches") {
    return context.sizeInches.depthInches;
  }

  if (reference === "size.heightInches") {
    return context.sizeInches.heightInches;
  }

  if (reference.startsWith("component.size.")) {
    return readComponentSizeReferenceValue(reference, context);
  }

  if (reference.startsWith("option.")) {
    const optionId = reference.slice("option.".length);
    const optionValue = context.optionValues[optionId];

    if (optionValue === undefined) {
      throw new Error(`Raw assembly option "${optionId}" is missing.`);
    }

    return optionValue;
  }

  throw new Error(`Unknown raw assembly reference "${reference}".`);
}

function readComponentSizeReferenceValue(
  reference: string,
  context: RawAssemblyExpressionContext,
): number {
  if (context.componentSizeInches === undefined) {
    throw new Error(
      `Raw assembly reference "${reference}" requires component size context.`,
    );
  }

  if (reference === "component.size.widthInches") {
    return context.componentSizeInches.widthInches;
  }

  if (reference === "component.size.depthInches") {
    return context.componentSizeInches.depthInches;
  }

  if (reference === "component.size.heightInches") {
    return context.componentSizeInches.heightInches;
  }

  throw new Error(`Unknown raw assembly reference "${reference}".`);
}
