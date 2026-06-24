import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import { createDefaultAssemblyConfiguration } from "@/engine/assemblies/assemblyConfigurationFactory";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import type { DesignScene } from "@/engine/scene/designSceneTypes";
import type { SceneEntity } from "@/engine/scene-entities/sceneEntityTypes";
import { resolveKitchenAiDevelopmentTransform } from "./kitchenAiDevelopmentAttachmentTransforms";
import { validateKitchenAiPostDesignedForPreDesigned } from "./kitchenAiPostDesignedValidator";
import type {
  KitchenAiDevelopmentGeneratedSceneEntity,
  KitchenAiPostDesigned,
} from "./kitchenAiPostDesignedTypes";
import type { KitchenAiPreDesigned } from "./kitchenAiPreDesignedTypes";

export function importKitchenAiDevelopmentScenePatch(args: {
  designScene: DesignScene;
  preDesigned: KitchenAiPreDesigned;
  postDesigned: KitchenAiPostDesigned;
  assemblyDefinitions: readonly AssemblyDefinition[];
}): DesignScene {
  const validationResult = validateKitchenAiPostDesignedForPreDesigned({
    preDesigned: args.preDesigned,
    postDesigned: args.postDesigned,
    existingSceneEntityIds: new Set(args.designScene.sceneEntities.map((sceneEntity) => sceneEntity.id)),
  });

  if (validationResult.postDesigned === null) {
    throw new Error(validationResult.errors.join("\n"));
  }

  const assemblyDefinitionsById = new Map(args.assemblyDefinitions.map((definition) => [definition.id, definition]));
  const addedSceneEntities: SceneEntity[] = [];

  args.postDesigned.scenePatch.addSceneEntities.forEach((generatedEntity) => {
    const createdEntity = createSceneEntityFromKitchenAiDevelopmentGeneratedEntity({
      generatedEntity,
      preDesigned: args.preDesigned,
      sceneEntitiesForZoneLookup: [...args.designScene.sceneEntities, ...addedSceneEntities],
      assemblyDefinitionsById,
    });

    addedSceneEntities.push(createdEntity);
  });

  if (addedSceneEntities.length === 0) {
    return args.designScene;
  }

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

function createSceneEntityFromKitchenAiDevelopmentGeneratedEntity(args: {
  generatedEntity: KitchenAiDevelopmentGeneratedSceneEntity;
  preDesigned: KitchenAiPreDesigned;
  sceneEntitiesForZoneLookup: readonly SceneEntity[];
  assemblyDefinitionsById: ReadonlyMap<string, AssemblyDefinition>;
}): SceneEntity {
  const generatedEntity = args.generatedEntity;

  if (generatedEntity.entityKind === "placed-assembly") {
    return createPlacedAssemblyFromKitchenAiDevelopmentGeneratedEntity({
      generatedEntity,
      preDesigned: args.preDesigned,
      sceneEntitiesForZoneLookup: args.sceneEntitiesForZoneLookup,
      assemblyDefinitionsById: args.assemblyDefinitionsById,
    });
  }

  return createDesignReservationZoneFromKitchenAiDevelopmentGeneratedEntity({
    generatedEntity,
    preDesigned: args.preDesigned,
    sceneEntitiesForZoneLookup: args.sceneEntitiesForZoneLookup,
  });
}

function createPlacedAssemblyFromKitchenAiDevelopmentGeneratedEntity(args: {
  generatedEntity: Extract<KitchenAiDevelopmentGeneratedSceneEntity, { entityKind: "placed-assembly" }>;
  preDesigned: KitchenAiPreDesigned;
  sceneEntitiesForZoneLookup: readonly SceneEntity[];
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
  const transform = resolveKitchenAiDevelopmentTransform({
    preDesigned: args.preDesigned,
    attachmentKind: "placed-assembly",
    sizeInches: configuration.sizeInches,
    wallElevationAttachment: args.generatedEntity.wallElevationAttachment,
    zoneAttachment: args.generatedEntity.zoneAttachment,
    worldPositionInches: args.generatedEntity.worldPositionInches,
    rotationDegrees: args.generatedEntity.rotationDegrees,
    sceneEntitiesForZoneLookup: args.sceneEntitiesForZoneLookup,
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

function createDesignReservationZoneFromKitchenAiDevelopmentGeneratedEntity(args: {
  generatedEntity: Extract<KitchenAiDevelopmentGeneratedSceneEntity, { entityKind: "design-reservation-zone" }>;
  preDesigned: KitchenAiPreDesigned;
  sceneEntitiesForZoneLookup: readonly SceneEntity[];
}): DesignReservationZone {
  const transform = resolveKitchenAiDevelopmentTransform({
    preDesigned: args.preDesigned,
    attachmentKind: "design-reservation-zone",
    sizeInches: args.generatedEntity.sizeInches,
    wallElevationAttachment: args.generatedEntity.wallElevationAttachment,
    cornerAttachment: args.generatedEntity.cornerAttachment,
    zoneAttachment: args.generatedEntity.zoneAttachment,
    worldPositionInches: args.generatedEntity.worldPositionInches,
    rotationDegrees: args.generatedEntity.rotationDegrees,
    sceneEntitiesForZoneLookup: args.sceneEntitiesForZoneLookup,
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
