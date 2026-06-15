import type {
  AssemblyComponentOverride,
  AssemblyOptionValue,
} from "@/engine/assemblies/assemblyConfiguration";
import {
  DESIGN_SCENE_DOCUMENT_SCHEMA_VERSION,
  type AssemblyConfigurationDocument,
  type DesignSceneDocument,
  type PlacedAssemblyDocument,
  type PlacedWallGraphDocument,
  type PlacedWallNodeDocument,
  type PlacedWallSegmentDocument,
} from "./designSceneDocumentTypes";

export type ParseDesignSceneDocumentResult =
  | Readonly<{ ok: true; document: DesignSceneDocument }>
  | Readonly<{ ok: false; errors: readonly string[] }>;

type JsonRecord = Readonly<Record<string, unknown>>;

export function parseDesignSceneDocument(value: unknown): ParseDesignSceneDocumentResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      errors: ["Scene document must be a JSON object."],
    };
  }

  if (value.schemaVersion !== DESIGN_SCENE_DOCUMENT_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${DESIGN_SCENE_DOCUMENT_SCHEMA_VERSION}.`);
  }

  if (value.units !== "inches") {
    errors.push("units must be inches.");
  }

  validateCoordinateSystem(value.coordinateSystem, errors);
  const catalog = parseCatalog(value.catalog, errors);
  const scene = isRecord(value.scene) ? value.scene : null;

  if (scene === null) {
    errors.push("scene must be an object.");
  }

  const placedAssemblies = parsePlacedAssemblies(scene?.placedAssemblies, errors);
  const placedWallGraphs = parsePlacedWallGraphs(scene?.placedWallGraphs, errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    document: {
      schemaVersion: DESIGN_SCENE_DOCUMENT_SCHEMA_VERSION,
      units: "inches",
      coordinateSystem: {
        origin: "floor-plane",
        xAxis: "horizontal-left-right",
        yAxis: "horizontal-front-back",
        zAxis: "vertical-height",
        rotationUnit: "degrees",
        objectFrontAtZeroRotation: "+Y",
      },
      catalog,
      scene: {
        placedAssemblies,
        placedWallGraphs,
      },
    },
  };
}

function validateCoordinateSystem(value: unknown, errors: string[]) {
  if (!isRecord(value)) {
    errors.push("coordinateSystem must be an object.");
    return;
  }

  validateExactString(value.origin, "floor-plane", "coordinateSystem.origin", errors);
  validateExactString(value.xAxis, "horizontal-left-right", "coordinateSystem.xAxis", errors);
  validateExactString(value.yAxis, "horizontal-front-back", "coordinateSystem.yAxis", errors);
  validateExactString(value.zAxis, "vertical-height", "coordinateSystem.zAxis", errors);
  validateExactString(value.rotationUnit, "degrees", "coordinateSystem.rotationUnit", errors);
  validateExactString(value.objectFrontAtZeroRotation, "+Y", "coordinateSystem.objectFrontAtZeroRotation", errors);
}

function parseCatalog(value: unknown, errors: string[]): DesignSceneDocument["catalog"] {
  if (!isRecord(value)) {
    errors.push("catalog must be an object.");
    return {
      mode: "reference",
      requiredDefinitionIds: [],
    };
  }

  if (value.mode !== "reference") {
    errors.push("catalog.mode must be reference.");
  }

  return {
    mode: "reference",
    requiredDefinitionIds: parseStringArray(value.requiredDefinitionIds, "catalog.requiredDefinitionIds", errors),
  };
}

function parsePlacedAssemblies(
  value: unknown,
  errors: string[],
): readonly PlacedAssemblyDocument[] {
  if (!Array.isArray(value)) {
    errors.push("scene.placedAssemblies must be an array.");
    return [];
  }

  const ids = new Set<string>();

  return value.flatMap((item, index) => {
    const path = `scene.placedAssemblies[${index}]`;

    if (!isRecord(item)) {
      errors.push(`${path} must be an object.`);
      return [];
    }

    const id = parseString(item.id, `${path}.id`, errors);
    const definitionId = parseString(item.definitionId, `${path}.definitionId`, errors);
    const configuration = parseAssemblyConfiguration(item.configuration, `${path}.configuration`, errors);
    const worldPositionInches = parsePoint3DInches(item.worldPositionInches, `${path}.worldPositionInches`, errors);
    const rotationDegrees = isRecord(item.rotationDegrees) ? item.rotationDegrees : null;
    const zDegrees = rotationDegrees === null
      ? parseNumber(undefined, `${path}.rotationDegrees.zDegrees`, errors)
      : parseNumber(rotationDegrees.zDegrees, `${path}.rotationDegrees.zDegrees`, errors);

    if (id !== "" && ids.has(id)) {
      errors.push(`${path}.id is duplicated.`);
    }

    ids.add(id);

    return [{
      id,
      definitionId,
      configuration,
      worldPositionInches,
      rotationDegrees: { zDegrees },
    }];
  });
}

function parseAssemblyConfiguration(
  value: unknown,
  path: string,
  errors: string[],
): AssemblyConfigurationDocument {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return {
      sizeInches: { widthInches: 0, depthInches: 0, heightInches: 0 },
      optionValues: {},
      componentOverrides: [],
    };
  }

  return {
    sizeInches: parseSize3DInches(value.sizeInches, `${path}.sizeInches`, errors),
    optionValues: parseOptionValues(value.optionValues, `${path}.optionValues`, errors),
    componentOverrides: parseComponentOverrides(value.componentOverrides, `${path}.componentOverrides`, errors),
  };
}

function parsePlacedWallGraphs(
  value: unknown,
  errors: string[],
): readonly PlacedWallGraphDocument[] {
  if (!Array.isArray(value)) {
    errors.push("scene.placedWallGraphs must be an array.");
    return [];
  }

  const graphIds = new Set<string>();

  return value.flatMap((item, index) => {
    const path = `scene.placedWallGraphs[${index}]`;

    if (!isRecord(item)) {
      errors.push(`${path} must be an object.`);
      return [];
    }

    const id = parseString(item.id, `${path}.id`, errors);
    const name = parseString(item.name, `${path}.name`, errors);
    const nodes = parseWallNodes(item.nodes, `${path}.nodes`, errors);
    const segments = parseWallSegments(item.segments, `${path}.segments`, nodes, errors);

    if (id !== "" && graphIds.has(id)) {
      errors.push(`${path}.id is duplicated.`);
    }

    graphIds.add(id);

    return [{ id, name, nodes, segments }];
  });
}

function parseWallNodes(
  value: unknown,
  path: string,
  errors: string[],
): readonly PlacedWallNodeDocument[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return [];
  }

  const nodeIds = new Set<string>();

  return value.flatMap((item, index) => {
    const itemPath = `${path}[${index}]`;

    if (!isRecord(item)) {
      errors.push(`${itemPath} must be an object.`);
      return [];
    }

    const id = parseString(item.id, `${itemPath}.id`, errors);

    if (id !== "" && nodeIds.has(id)) {
      errors.push(`${itemPath}.id is duplicated.`);
    }

    nodeIds.add(id);

    return [{
      id,
      positionInches: parsePoint3DInches(item.positionInches, `${itemPath}.positionInches`, errors),
    }];
  });
}

function parseWallSegments(
  value: unknown,
  path: string,
  nodes: readonly PlacedWallNodeDocument[],
  errors: string[],
): readonly PlacedWallSegmentDocument[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return [];
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const segmentIds = new Set<string>();

  return value.flatMap((item, index) => {
    const itemPath = `${path}[${index}]`;

    if (!isRecord(item)) {
      errors.push(`${itemPath} must be an object.`);
      return [];
    }

    const id = parseString(item.id, `${itemPath}.id`, errors);
    const name = parseString(item.name, `${itemPath}.name`, errors);
    const startNodeId = parseString(item.startNodeId, `${itemPath}.startNodeId`, errors);
    const endNodeId = parseString(item.endNodeId, `${itemPath}.endNodeId`, errors);
    const thicknessInches = parsePositiveNumber(item.thicknessInches, `${itemPath}.thicknessInches`, errors);
    const heightInches = parsePositiveNumber(item.heightInches, `${itemPath}.heightInches`, errors);

    if (id !== "" && segmentIds.has(id)) {
      errors.push(`${itemPath}.id is duplicated.`);
    }

    segmentIds.add(id);

    if (startNodeId !== "" && !nodeIds.has(startNodeId)) {
      errors.push(`${itemPath}.startNodeId does not match a wall node.`);
    }

    if (endNodeId !== "" && !nodeIds.has(endNodeId)) {
      errors.push(`${itemPath}.endNodeId does not match a wall node.`);
    }

    if (startNodeId !== "" && startNodeId === endNodeId) {
      errors.push(`${itemPath}.startNodeId and endNodeId must be different.`);
    }

    return [{
      id,
      name,
      startNodeId,
      endNodeId,
      thicknessInches,
      heightInches,
    }];
  });
}

function parseSize3DInches(value: unknown, path: string, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return { widthInches: 0, depthInches: 0, heightInches: 0 };
  }

  return {
    widthInches: parsePositiveNumber(value.widthInches, `${path}.widthInches`, errors),
    depthInches: parsePositiveNumber(value.depthInches, `${path}.depthInches`, errors),
    heightInches: parsePositiveNumber(value.heightInches, `${path}.heightInches`, errors),
  };
}

function parsePoint3DInches(value: unknown, path: string, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return { xInches: 0, yInches: 0, zInches: 0 };
  }

  return {
    xInches: parseNumber(value.xInches, `${path}.xInches`, errors),
    yInches: parseNumber(value.yInches, `${path}.yInches`, errors),
    zInches: parseNumber(value.zInches, `${path}.zInches`, errors),
  };
}

function parseOptionValues(
  value: unknown,
  path: string,
  errors: string[],
): Readonly<Record<string, AssemblyOptionValue>> {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`);
    return {};
  }

  const optionValues: Record<string, AssemblyOptionValue> = {};

  for (const [key, optionValue] of Object.entries(value)) {
    if (typeof optionValue === "string" || typeof optionValue === "number" || typeof optionValue === "boolean") {
      optionValues[key] = optionValue;
      continue;
    }

    errors.push(`${path}.${key} must be a string, number, or boolean.`);
  }

  return optionValues;
}

function parseComponentOverrides(
  value: unknown,
  path: string,
  errors: string[],
): readonly AssemblyComponentOverride[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return [];
  }

  return value.flatMap((item, index) => {
    const itemPath = `${path}[${index}]`;

    if (!isRecord(item)) {
      errors.push(`${itemPath} must be an object.`);
      return [];
    }

    const targetComponentPath = parseStringArray(item.targetComponentPath, `${itemPath}.targetComponentPath`, errors);
    const materialColorHex = item.materialColorHex === undefined
      ? undefined
      : parseString(item.materialColorHex, `${itemPath}.materialColorHex`, errors);
    const isHidden = item.isHidden === undefined
      ? undefined
      : parseBoolean(item.isHidden, `${itemPath}.isHidden`, errors);

    return [{ targetComponentPath, materialColorHex, isHidden }];
  });
}

function parseStringArray(value: unknown, path: string, errors: string[]): readonly string[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return [];
  }

  return value.flatMap((item, index) => {
    if (typeof item !== "string") {
      errors.push(`${path}[${index}] must be a string.`);
      return [];
    }

    return [item];
  });
}

function parseString(value: unknown, path: string, errors: string[]): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} must be a non-empty string.`);
    return "";
  }

  return value;
}

function parseBoolean(value: unknown, path: string, errors: string[]): boolean {
  if (typeof value !== "boolean") {
    errors.push(`${path} must be a boolean.`);
    return false;
  }

  return value;
}

function parseNumber(value: unknown, path: string, errors: string[]): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${path} must be a finite number.`);
    return 0;
  }

  return value;
}

function parsePositiveNumber(value: unknown, path: string, errors: string[]): number {
  const parsedNumber = parseNumber(value, path, errors);

  if (parsedNumber <= 0) {
    errors.push(`${path} must be greater than 0.`);
  }

  return parsedNumber;
}

function validateExactString(
  value: unknown,
  expectedValue: string,
  path: string,
  errors: string[],
) {
  if (value !== expectedValue) {
    errors.push(`${path} must be ${expectedValue}.`);
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
