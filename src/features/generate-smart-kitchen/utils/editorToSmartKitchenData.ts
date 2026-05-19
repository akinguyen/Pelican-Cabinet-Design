import { createMockReviewData } from '../mockData';
import type { DimensionValue, MeasurementData, ReviewData } from '../types';

export interface EditorSmartKitchenDataInput {
  readonly projectName?: string;
  readonly customerName?: string;
  readonly roomName?: string;
  readonly widthInches?: number;
  readonly lengthInches?: number;
  readonly ceilingHeightInches?: number;
  readonly totalAreaSqFt?: number;
  readonly sourceFloorPlanJson?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readPositiveNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function toInches(value: number): DimensionValue {
  return { value, unit: 'in' };
}

function createSourceFloorPlanJson(source: unknown): Record<string, unknown> {
  if (isRecord(source)) {
    return {
      source: 'editor-export',
      ...source,
    };
  }

  return {
    source: 'editor-export',
    rawValueType: typeof source,
  };
}

function createMeasurementsFromEditorSource(
  baseMeasurements: MeasurementData,
  source: Record<string, unknown>,
): MeasurementData {
  const roomWidth = readPositiveNumber(source, 'widthInches');
  const roomLength = readPositiveNumber(source, 'lengthInches');
  const ceilingHeight = readPositiveNumber(source, 'ceilingHeightInches');
  const totalAreaSqFt = readPositiveNumber(source, 'totalAreaSqFt');

  return {
    ...baseMeasurements,
    roomWidth: roomWidth ? toInches(roomWidth) : baseMeasurements.roomWidth,
    roomLength: roomLength ? toInches(roomLength) : baseMeasurements.roomLength,
    ceilingHeight: ceilingHeight ? toInches(ceilingHeight) : baseMeasurements.ceilingHeight,
    totalAreaSqFt: totalAreaSqFt ?? baseMeasurements.totalAreaSqFt,
  };
}

export function editorToSmartKitchenData(
  editorData: unknown,
  overrides: Partial<ReviewData> = {},
): ReviewData {
  const baseReviewData = createMockReviewData();
  const sourceRecord = isRecord(editorData) ? editorData : {};
  const explicitSourceJson = isRecord(sourceRecord.sourceFloorPlanJson)
    ? sourceRecord.sourceFloorPlanJson
    : undefined;

  return {
    ...baseReviewData,
    projectName: readString(sourceRecord, 'projectName') ?? readString(sourceRecord, 'name') ?? baseReviewData.projectName,
    customerName: readString(sourceRecord, 'customerName') ?? baseReviewData.customerName,
    roomName: readString(sourceRecord, 'roomName') ?? baseReviewData.roomName,
    measurements: createMeasurementsFromEditorSource(baseReviewData.measurements, sourceRecord),
    sourceFloorPlanJson: explicitSourceJson ?? createSourceFloorPlanJson(editorData),
    ...overrides,
  };
}
