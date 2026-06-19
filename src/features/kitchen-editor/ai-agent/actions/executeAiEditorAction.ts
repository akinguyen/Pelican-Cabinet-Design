import { createId } from "@/core/ids/createId";
import type { AssemblyDefinitionRegistry } from "@/engine/assemblies/assemblyRegistry";
import { createDefaultAssemblyConfiguration } from "@/engine/assemblies/assemblyConfigurationFactory";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { DesignScene } from "@/engine/scene/designSceneTypes";
import { buildSelectedWallAiContext } from "../context/buildSelectedWallAiContext";
import { createWallFacePlacedAssemblyPosition } from "../geometry/wallFacePlacementGeometry";
import type {
  AiEditorAction,
  AiEditorActionBatchExecutionResult,
  AiEditorActionExecutionResult,
} from "./aiEditorActionTypes";
import { validateAiEditorAction } from "./validateAiEditorAction";

export function executeAiEditorActions(args: {
  actions: readonly AiEditorAction[];
  designScene: DesignScene;
  registry: AssemblyDefinitionRegistry;
}): Readonly<{
  designScene: DesignScene;
  result: AiEditorActionBatchExecutionResult;
}> {
  let nextDesignScene = args.designScene;
  const results: AiEditorActionExecutionResult[] = [];

  args.actions.forEach((action) => {
    const execution = executeAiEditorAction({
      action,
      designScene: nextDesignScene,
      registry: args.registry,
    });

    results.push(execution.result);

    if (execution.result.applied) {
      nextDesignScene = execution.designScene;
    }
  });

  const appliedCount = results.filter((result) => result.applied).length;

  return {
    designScene: nextDesignScene,
    result: {
      designSceneChanged: appliedCount > 0,
      designSceneMessage: appliedCount === 0
        ? "No AI editor actions were applied."
        : `${appliedCount} AI editor action${appliedCount === 1 ? "" : "s"} applied.`,
      results,
    },
  };
}

function executeAiEditorAction(args: {
  action: AiEditorAction;
  designScene: DesignScene;
  registry: AssemblyDefinitionRegistry;
}): Readonly<{
  designScene: DesignScene;
  result: AiEditorActionExecutionResult;
}> {
  const validation = validateAiEditorAction(args);

  if (!validation.valid) {
    return {
      designScene: args.designScene,
      result: {
        applied: false,
        message: validation.errors.map((error) => error.message).join("\n"),
        errors: validation.errors,
      },
    };
  }

  switch (args.action.type) {
    case "placeAssemblyOnSelectedWallFace":
      return executePlaceAssemblyOnSelectedWallFace(args as {
        action: Extract<AiEditorAction, { type: "placeAssemblyOnSelectedWallFace" }>;
        designScene: DesignScene;
        registry: AssemblyDefinitionRegistry;
      });
    default:
      return {
        designScene: args.designScene,
        result: {
          applied: false,
          message: "This AI editor action is not supported yet.",
          errors: [
            {
              code: "UNSUPPORTED_ACTION",
              message: "This AI editor action is not supported yet.",
            },
          ],
        },
      };
  }
}

function executePlaceAssemblyOnSelectedWallFace(args: {
  action: Extract<AiEditorAction, { type: "placeAssemblyOnSelectedWallFace" }>;
  designScene: DesignScene;
  registry: AssemblyDefinitionRegistry;
}): Readonly<{
  designScene: DesignScene;
  result: AiEditorActionExecutionResult;
}> {
  const definition = args.registry.get(args.action.definitionId);
  const selectedWallContextResult = buildSelectedWallAiContext(args.designScene);

  if (definition === undefined || !selectedWallContextResult.ok) {
    const validation = validateAiEditorAction(args);

    return {
      designScene: args.designScene,
      result: validation.valid
        ? {
            applied: false,
            message: "The action could not be executed.",
            errors: [{ code: "UNSUPPORTED_ACTION", message: "The action could not be executed." }],
          }
        : {
            applied: false,
            message: validation.errors.map((error) => error.message).join("\n"),
            errors: validation.errors,
          },
    };
  }

  const configuration = createDefaultAssemblyConfiguration(definition);
  const placedAssemblyId = createId();
  const sizeInches = {
    ...configuration.sizeInches,
    widthInches: args.action.widthInches,
  };
  const placement = createWallFacePlacedAssemblyPosition({
    selectedWallContext: selectedWallContextResult.context,
    widthInches: sizeInches.widthInches,
    depthInches: sizeInches.depthInches,
    heightInches: sizeInches.heightInches,
    defaultDistanceFromFloorInches: definition.defaultDistanceFromFloorInches ?? 0,
    uStartInches: args.action.uStartInches,
  });
  const placedAssembly: PlacedAssembly = {
    id: placedAssemblyId,
    definitionId: definition.id,
    configuration: {
      ...configuration,
      sizeInches,
    },
    worldPositionInches: placement.worldPositionInches,
    rotationDegrees: placement.rotationDegrees,
  };
  const nextDesignScene: DesignScene = {
    ...args.designScene,
    placedAssemblies: [...args.designScene.placedAssemblies, placedAssembly],
    activeSelection: {
      kind: "placed-assembly",
      placedAssemblyId,
    },
    activeSceneOperation: null,
  };

  return {
    designScene: nextDesignScene,
    result: {
      applied: true,
      placedAssemblyId,
      message: `Placed a ${formatInches(sizeInches.widthInches)} ${definition.name} ${formatPlacementDescription(args.action)} on ${selectedWallContextResult.context.wallName}.`,
    },
  };
}

function formatPlacementDescription(
  action: Extract<AiEditorAction, { type: "placeAssemblyOnSelectedWallFace" }>,
): string {
  return action.placementDescription === undefined
    ? `starting at ${formatInches(action.uStartInches)}`
    : action.placementDescription;
}

function formatInches(valueInches: number): string {
  return `${Number(valueInches.toFixed(2))}"`;
}
