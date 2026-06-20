import type { Point3DInches } from "@/core/geometry/pointTypes";
import { addPoint3DInches, rotatePointAroundZInches } from "@/core/geometry/pointTypes";
import type { RotationDegrees3D } from "@/core/geometry/rotationTypes";
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
  localPositionInches: Point3DInches;
  localRotationDegrees: Required<RotationDegrees3D>;
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
  localPositionInches: Point3DInches;
  localRotationDegrees: Required<RotationDegrees3D>;
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
    localPositionInches: createZeroPoint3DInches(),
    localRotationDegrees: createCompleteRotationDegrees(),
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
  localPositionInches: Point3DInches;
  localRotationDegrees: Required<RotationDegrees3D>;
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
    const componentLocalRotationDegrees = createCompleteRotationDegrees(component.localRotationDegrees);
    const componentZDegrees = args.zDegrees + componentLocalRotationDegrees.zDegrees;

    if (component.kind === "primitive-geometry") {
      primitiveGeometries.push({
        id: component.id,
        rootAssemblyId: args.rootAssemblyId,
        componentPath,
        definitionComponentPath,
        geometry: component.geometry,
        localPositionInches: component.localPositionInches,
        localRotationDegrees: componentLocalRotationDegrees,
        worldPositionInches: componentWorldPositionInches,
        worldRotationDegrees: {
          xDegrees: componentLocalRotationDegrees.xDegrees,
          yDegrees: componentLocalRotationDegrees.yDegrees,
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
        localPositionInches: component.localPositionInches,
        localRotationDegrees: componentLocalRotationDegrees,
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
    localPositionInches: args.localPositionInches,
    localRotationDegrees: args.localRotationDegrees,
    rotationDegrees: {
      zDegrees: args.zDegrees,
    },
    sizeInches: args.configuration.sizeInches,
    primitiveGeometries,
    childAssemblies,
  };
}

function createZeroPoint3DInches(): Point3DInches {
  return { xInches: 0, yInches: 0, zInches: 0 };
}

function createCompleteRotationDegrees(
  rotationDegrees: RotationDegrees3D | undefined = undefined,
): Required<RotationDegrees3D> {
  return {
    xDegrees: rotationDegrees?.xDegrees ?? 0,
    yDegrees: rotationDegrees?.yDegrees ?? 0,
    zDegrees: rotationDegrees?.zDegrees ?? 0,
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
