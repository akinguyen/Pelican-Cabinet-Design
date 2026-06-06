import type { AssemblyDefinition } from "./assemblyDefinitionTypes";

export type AssemblyDefinitionRegistry = ReadonlyMap<string, AssemblyDefinition>;

export function createAssemblyDefinitionRegistry(
  definitions: readonly AssemblyDefinition[],
): AssemblyDefinitionRegistry {
  return new Map(definitions.map((definition) => [definition.id, definition]));
}

export function getAssemblyDefinition(
  registry: AssemblyDefinitionRegistry,
  definitionId: string,
): AssemblyDefinition {
  const definition = registry.get(definitionId);

  if (definition === undefined) {
    throw new Error(`Assembly definition not found: ${definitionId}`);
  }

  return definition;
}
