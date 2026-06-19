import type { Point3DInches } from "@/core/geometry/pointTypes";
import { addPoint3DInches, rotatePointAroundZInches } from "@/core/geometry/pointTypes";
import type { Size3DInches } from "@/core/geometry/sizeTypes";
import type { PrimitiveBoxFrontOutlineEdge } from "./assemblyComponentTypes";
import type { PrimitiveGeometry } from "@/engine/primitive-geometry/primitiveGeometryTypes";
import type { PrimitiveMaterial } from "@/engine/primitive-geometry/primitiveGeometryTypes";
import type { AssemblyComponentOverride, AssemblyConfiguration } from "./assemblyConfiguration";
import type { AssemblyDefinition } from "./assemblyDefinitionTypes";
import type { AssemblyDefinitionRegistry } from "./assemblyRegistry";
import { getAssemblyDefinition } from "./assemblyRegistry";
import type { PlacedAssembly } from "./placedAssemblyTypes";

export type BuiltAssemblyTree = Readonly<{
  rootAssemblyId: string;
  definitionId: string;
  componentPath: readonly string[];
  definitionComponentPath: readonly string[];
  worldPositionInches: Point3DInches;
  rotationDegrees: Readonly<{
    zDegrees: number;
  }>;
  sizeInches: Size3DInches;
  primitiveGeometries: readonly BuiltPrimitiveGeometry[];
  childAssemblies: readonly BuiltAssemblyTree[];
}>;

export type BuiltPrimitiveGeometry = Readonly<{
  id: string;
  rootAssemblyId: string;
  componentPath: readonly string[];
  definitionComponentPath: readonly string[];
  geometry: PrimitiveGeometry;
  worldPositionInches: Point3DInches;
  worldRotationDegrees: Readonly<{
    xDegrees: number;
    yDegrees: number;
    zDegrees: number;
  }>;
  sizeInches: Size3DInches;
  material: PrimitiveMaterial;
  frontOutlineEdges?: readonly PrimitiveBoxFrontOutlineEdge[];
  role?: string;
}>;

export function buildAssemblyTree(
  placedAssembly: PlacedAssembly,
  registry: AssemblyDefinitionRegistry,
): BuiltAssemblyTree {
  const definition = getAssemblyDefinition(registry, placedAssembly.definitionId);

  return buildAssemblyTreeFromDefinition({
    rootAssemblyId: placedAssembly.id,
    definition,
    registry,
    configuration: placedAssembly.configuration,
    worldPositionInches: placedAssembly.worldPositionInches,
    zDegrees: placedAssembly.rotationDegrees.zDegrees,
    componentPath: [placedAssembly.id],
    definitionComponentPath: [],
    componentOverrides: placedAssembly.configuration.componentOverrides ?? [],
  });
}

type BuildAssemblyTreeArgs = Readonly<{
  rootAssemblyId: string;
  definition: AssemblyDefinition;
  registry: AssemblyDefinitionRegistry;
  configuration: AssemblyConfiguration;
  worldPositionInches: Point3DInches;
  zDegrees: number;
  componentPath: readonly string[];
  definitionComponentPath: readonly string[];
  componentOverrides: readonly AssemblyComponentOverride[];
}>;

function buildAssemblyTreeFromDefinition(args: BuildAssemblyTreeArgs): BuiltAssemblyTree {
  const components = args.definition.build({
    sizeInches: args.configuration.sizeInches,
    optionValues: args.configuration.optionValues,
  });

  const primitiveGeometries: BuiltPrimitiveGeometry[] = [];
  const childAssemblies: BuiltAssemblyTree[] = [];

  components.forEach((component) => {
    const componentPath = [...args.componentPath, component.id];
    const definitionComponentPath = [...args.definitionComponentPath, component.id];
    const componentOverride = findComponentOverride(
      args.componentOverrides,
      definitionComponentPath,
    );

    if (componentOverride?.isHidden === true) {
      return;
    }
    const componentWorldPositionInches = localPointToWorldPointInches(
      component.localPositionInches,
      args.worldPositionInches,
      args.zDegrees,
    );
    const componentXDegrees = component.localRotationDegrees?.xDegrees ?? 0;
    const componentYDegrees = component.localRotationDegrees?.yDegrees ?? 0;
    const componentZDegrees = args.zDegrees + (component.localRotationDegrees?.zDegrees ?? 0);

    if (component.kind === "primitive-geometry") {
      primitiveGeometries.push({
        id: component.id,
        rootAssemblyId: args.rootAssemblyId,
        componentPath,
        definitionComponentPath,
        geometry: component.geometry,
        worldPositionInches: componentWorldPositionInches,
        worldRotationDegrees: {
          xDegrees: componentXDegrees,
          yDegrees: componentYDegrees,
          zDegrees: componentZDegrees,
        },
        sizeInches: component.sizeInches,
        material: applyPrimitiveMaterialOverride(component.material, componentOverride),
        frontOutlineEdges: component.frontOutlineEdges,
        role: component.role,
      });
      return;
    }

    const childDefinition = getAssemblyDefinition(args.registry, component.definitionId);
    childAssemblies.push(
      buildAssemblyTreeFromDefinition({
        rootAssemblyId: args.rootAssemblyId,
        definition: childDefinition,
        registry: args.registry,
        configuration: component.configuration,
        worldPositionInches: componentWorldPositionInches,
        zDegrees: componentZDegrees,
        componentPath,
        definitionComponentPath,
        componentOverrides: args.componentOverrides,
      }),
    );
  });

  return {
    rootAssemblyId: args.rootAssemblyId,
    definitionId: args.definition.id,
    componentPath: args.componentPath,
    definitionComponentPath: args.definitionComponentPath,
    worldPositionInches: args.worldPositionInches,
    rotationDegrees: {
      zDegrees: args.zDegrees,
    },
    sizeInches: args.configuration.sizeInches,
    primitiveGeometries,
    childAssemblies,
  };
}

function findComponentOverride(
  componentOverrides: readonly AssemblyComponentOverride[],
  targetComponentPath: readonly string[],
): AssemblyComponentOverride | undefined {
  return componentOverrides.find((componentOverride) =>
    areComponentPathsEqual(componentOverride.targetComponentPath, targetComponentPath),
  );
}

function areComponentPathsEqual(
  firstComponentPath: readonly string[],
  secondComponentPath: readonly string[],
): boolean {
  return (
    firstComponentPath.length === secondComponentPath.length &&
    firstComponentPath.every((componentId, index) => componentId === secondComponentPath[index])
  );
}

function applyPrimitiveMaterialOverride(
  material: PrimitiveMaterial,
  componentOverride: AssemblyComponentOverride | undefined,
): PrimitiveMaterial {
  if (componentOverride?.materialColorHex === undefined) {
    return material;
  }

  return {
    ...material,
    colorHex: componentOverride.materialColorHex,
  };
}

function localPointToWorldPointInches(
  localPointInches: Point3DInches,
  parentWorldPositionInches: Point3DInches,
  parentZDegrees: number,
): Point3DInches {
  const rotatedLocalPointInches = rotatePointAroundZInches(localPointInches, parentZDegrees);
  return addPoint3DInches(parentWorldPositionInches, rotatedLocalPointInches);
}
