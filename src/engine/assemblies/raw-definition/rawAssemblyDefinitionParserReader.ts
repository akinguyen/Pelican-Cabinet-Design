export function parseArray<T>(
  value: unknown,
  sourceLabel: string,
  path: string,
  parseItem: (value: unknown, sourceLabel: string, path: string) => T,
): readonly T[] {
  if (!Array.isArray(value)) {
    throwInvalidRawAssemblyDefinition(sourceLabel, path, "array");
  }

  return value.map((item, index) => parseItem(item, sourceLabel, `${path}[${index}]`));
}

export function parseOptionalArray<T>(
  value: unknown,
  sourceLabel: string,
  path: string,
  parseItem: (value: unknown, sourceLabel: string, path: string) => T,
): readonly T[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseArray(value, sourceLabel, path, parseItem);
}

export function readRecord(
  value: unknown,
  sourceLabel: string,
  path: string,
): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throwInvalidRawAssemblyDefinition(sourceLabel, path, "object");
  }

  return value as Readonly<Record<string, unknown>>;
}

export function readString(
  record: Readonly<Record<string, unknown>>,
  sourceLabel: string,
  path: string,
): string {
  const value = record[getLastPathSegment(path)];

  if (typeof value !== "string") {
    throwInvalidRawAssemblyDefinition(sourceLabel, path, "string");
  }

  return value;
}

export function readOptionalString(
  record: Readonly<Record<string, unknown>>,
  sourceLabel: string,
  path: string,
): string | undefined {
  const value = record[getLastPathSegment(path)];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throwInvalidRawAssemblyDefinition(sourceLabel, path, "string");
  }

  return value;
}

export function readNumber(
  record: Readonly<Record<string, unknown>>,
  sourceLabel: string,
  path: string,
): number {
  const value = record[getLastPathSegment(path)];

  if (typeof value !== "number") {
    throwInvalidRawAssemblyDefinition(sourceLabel, path, "number");
  }

  return value;
}

export function readOptionalNumber(
  record: Readonly<Record<string, unknown>>,
  sourceLabel: string,
  path: string,
): number | undefined {
  const value = record[getLastPathSegment(path)];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number") {
    throwInvalidRawAssemblyDefinition(sourceLabel, path, "number");
  }

  return value;
}

export function readOptionalBoolean(
  record: Readonly<Record<string, unknown>>,
  sourceLabel: string,
  path: string,
): boolean | undefined {
  const value = record[getLastPathSegment(path)];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throwInvalidRawAssemblyDefinition(sourceLabel, path, "boolean");
  }

  return value;
}

export function readEnumValue<const T extends readonly string[]>(
  value: unknown,
  sourceLabel: string,
  path: string,
  allowedValues: T,
): T[number] {
  if (typeof value !== "string" || !(allowedValues as readonly string[]).includes(value)) {
    throwInvalidRawAssemblyDefinition(
      sourceLabel,
      path,
      allowedValues.map((allowedValue) => `"${allowedValue}"`).join(" or "),
    );
  }

  return value as T[number];
}

export function assertKnownKeys(
  record: Readonly<Record<string, unknown>>,
  sourceLabel: string,
  path: string,
  allowedKeys: readonly string[],
): void {
  const unknownKeys = Object.keys(record).filter(
    (key) => !allowedKeys.includes(key),
  );

  if (unknownKeys.length > 0) {
    throwInvalidRawAssemblyDefinition(
      sourceLabel,
      `${path}.${unknownKeys[0]}`,
      `known key (${allowedKeys.join(", ")})`,
    );
  }
}

function getLastPathSegment(path: string): string {
  const lastDotIndex = path.lastIndexOf(".");

  return lastDotIndex === -1 ? path : path.slice(lastDotIndex + 1);
}

export function throwInvalidRawAssemblyDefinition(
  sourceLabel: string,
  path: string,
  expectedValueDescription: string,
): never {
  throw new Error(
    `Invalid raw assembly definition "${sourceLabel}": ${path} must be ${expectedValueDescription}.`,
  );
}
