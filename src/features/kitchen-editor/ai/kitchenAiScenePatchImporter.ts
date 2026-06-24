import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import { createDefaultAssemblyConfiguration } from "@/engine/assemblies/assemblyConfigurationFactory";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import type { DesignScene } from "@/engine/scene/designSceneTypes";
import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import { resolveKitchenAiTransform } from "./kitchenAiAttachmentTransforms";
import { validateKitchenAiOutputForInput } from "./kitchenAiOutputValidator";
import type { KitchenAiGeneratedSceneEntity, KitchenAiInput, KitchenAiOutput } from "./kitchenAiTypes";

export function importKitchenAiScenePatch(args: {
  designScene: DesignScene;
  aiInput: KitchenAiInput;
  aiOutput: KitchenAiOutput;
  assemblyDefinitions: readonly AssemblyDefinition[];
}): DesignScene {
  const validationResult = validateKitchenAiOutputForInput({
    aiInput: args.aiInput,
    aiOutput: args.aiOutput,
    existingSceneEntityIds: new Set(args.designScene.sceneEntities.map((sceneEntity) => sceneEntity.id)),
  });

  if (validationResult.output === null) {
    throw new Error(validationResult.errors.join("\n"));
  }

  const assemblyDefinitionsById = new Map(args.assemblyDefinitions.map((definition) => [definition.id, definition]));
  const addedSceneEntities = args.aiOutput.scenePatch.addSceneEntities.map((generatedEntity) =>
    createSceneEntityFromKitchenAiGeneratedEntity({
      generatedEntity,
      aiInput: args.aiInput,
      existingSceneEntities: args.designScene.sceneEntities,
      assemblyDefinitionsById,
    }),
  );

  return {
    ...args.designScene,
    sceneEntities: [
      ...args.designScene.sceneEntities,
      ...addedSceneEntities,
    ],
    activeSelection: null,
    activeSceneOperation: null,
  };
}

function createSceneEntityFromKitchenAiGeneratedEntity(args: {
  generatedEntity: KitchenAiGeneratedSceneEntity;
  aiInput: KitchenAiInput;
  existingSceneEntities: readonly SceneEntity[];
  assemblyDefinitionsById: ReadonlyMap<string, AssemblyDefinition>;
}): SceneEntity {
  const generatedEntity = args.generatedEntity;

  if (generatedEntity.entityKind === "placed-assembly") {
    return createPlacedAssemblyFromKitchenAiGeneratedEntity({
      generatedEntity,
      aiInput: args.aiInput,
      existingSceneEntities: args.existingSceneEntities,
      assemblyDefinitionsById: args.assemblyDefinitionsById,
    });
  }

  return createDesignReservationZoneFromKitchenAiGeneratedEntity({
    generatedEntity,
    aiInput: args.aiInput,
    existingSceneEntities: args.existingSceneEntities,
    assemblyDefinitionsById: args.assemblyDefinitionsById,
  });
}

function createPlacedAssemblyFromKitchenAiGeneratedEntity(args: {
  generatedEntity: Extract<KitchenAiGeneratedSceneEntity, { entityKind: "placed-assembly" }>;
  aiInput: KitchenAiInput;
  existingSceneEntities: readonly SceneEntity[];
  assemblyDefinitionsById: ReadonlyMap<string, AssemblyDefinition>;
}): PlacedAssembly {
  const definition = args.assemblyDefinitionsById.get(args.generatedEntity.definitionId);

  if (definition === undefined) {
    throw new Error(`Assembly definition not found: ${args.generatedEntity.definitionId}`);
  }

  const defaultConfiguration = createDefaultAssemblyConfiguration(definition);
  const configuration = {
    ...defaultConfiguration,
    sizeInches: args.generatedEntity.configuration.sizeInches,
    optionValues: {
      ...defaultConfiguration.optionValues,
      ...(args.generatedEntity.configuration.optionValues ?? {}),
    },
  };
  const transform = resolveKitchenAiTransform({
    aiInput: args.aiInput,
    attachmentKind: "placed-assembly",
    sizeInches: configuration.sizeInches,
    wallElevationAttachment: args.generatedEntity.wallElevationAttachment,
    zoneAttachment: args.generatedEntity.zoneAttachment,
    worldPositionInches: args.generatedEntity.worldPositionInches,
    rotationDegrees: args.generatedEntity.rotationDegrees,
    existingSceneEntities: args.existingSceneEntities,
  });

  return {
    id: args.generatedEntity.id,
    entityKind: "placed-assembly",
    definitionId: args.generatedEntity.definitionId,
    configuration,
    worldPositionInches: transform.worldPositionInches,
    rotationDegrees: transform.rotationDegrees,
  };
}

function createDesignReservationZoneFromKitchenAiGeneratedEntity(args: {
  generatedEntity: Extract<KitchenAiGeneratedSceneEntity, { entityKind: "design-reservation-zone" }>;
  aiInput: KitchenAiInput;
  existingSceneEntities: readonly SceneEntity[];
  assemblyDefinitionsById: ReadonlyMap<string, AssemblyDefinition>;
}): DesignReservationZone {
  const transform = resolveKitchenAiTransform({
    aiInput: args.aiInput,
    attachmentKind: "design-reservation-zone",
    sizeInches: args.generatedEntity.sizeInches,
    wallElevationAttachment: args.generatedEntity.wallElevationAttachment,
    cornerAttachment: args.generatedEntity.cornerAttachment,
    zoneAttachment: args.generatedEntity.zoneAttachment,
    worldPositionInches: args.generatedEntity.worldPositionInches,
    rotationDegrees: args.generatedEntity.rotationDegrees,
    existingSceneEntities: args.existingSceneEntities,
  });

  return {
    id: args.generatedEntity.id,
    entityKind: "design-reservation-zone",
    reservedFor: args.generatedEntity.reservedFor,
    sizeInches: args.generatedEntity.sizeInches,
    worldPositionInches: transform.worldPositionInches,
    rotationDegrees: transform.rotationDegrees,
  };
}
