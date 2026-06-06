import type { RawCondition } from "./rawAssemblyDefinitionTypes";
import type { RawAssemblyExpressionContext } from "./rawAssemblyExpressionEvaluator";
import { evaluateRawExpression } from "./rawAssemblyExpressionEvaluator";

export function evaluateRawCondition(
  condition: RawCondition | undefined,
  context: RawAssemblyExpressionContext,
): boolean {
  if (condition === undefined) {
    return true;
  }

  if ("all" in condition) {
    return condition.all.every((childCondition) => evaluateRawCondition(childCondition, context));
  }

  if ("any" in condition) {
    return condition.any.some((childCondition) => evaluateRawCondition(childCondition, context));
  }

  if ("not" in condition) {
    return !evaluateRawCondition(condition.not, context);
  }

  return evaluateRawExpression({ ref: condition.ref }, context) === condition.equals;
}
