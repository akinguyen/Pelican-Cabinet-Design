import { createAssemblyDefinitionRegistry } from "@/engine/assemblies/assemblyRegistry";
import { kitchenEditorDefinitions } from "./loadKitchenEditorRawDefinitions";

export { kitchenEditorAssemblyCatalogEntries, kitchenEditorDefinitions } from "./loadKitchenEditorRawDefinitions";

export const kitchenEditorCatalogRegistry = createAssemblyDefinitionRegistry(kitchenEditorDefinitions);
