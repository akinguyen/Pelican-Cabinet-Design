type MeasurementDisplayUnit = "feet-inches" | "inches";

const GRID_SIZE = 28;

export function inchesToPixels(inches: number) {
  return (inches / 12) * GRID_SIZE;
}

export function formatFeetInchesForInput(pixelLength: number) {
  const totalInches = pixelsToInches(pixelLength);
  const feet = Math.floor(totalInches / 12);
  const inches = roundToQuarter(totalInches - feet * 12);

  return `${feet} ${formatDecimal(inches)}`;
}

export function formatFeetInchesParts(pixelLength: number) {
  const totalInches = pixelsToInches(pixelLength);
  const feet = Math.floor(totalInches / 12);
  const inches = roundToQuarter(totalInches - feet * 12);

  return {
    feet: `${feet}`,
    inches: formatDecimal(inches),
  };
}

export function parseFeetInchesToPixels(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return null;

  const normalized = trimmed
    .toLowerCase()
    .replace(/[″”]/g, '"')
    .replace(/[′’]/g, "'")
    .replace(/feet|foot|ft\.?/g, "'")
    .replace(/inches|inch|in\.?/g, '"')
    .replace(/-/g, " ");

  let feet = 0;
  let inches = 0;

  const feetMatch = normalized.match(/(-?\d+(?:\.\d+)?)\s*'/);
  const inchMatch = normalized.match(/(-?\d+(?:\.\d+)?)\s*"/);

  if (feetMatch || inchMatch) {
    feet = feetMatch ? Number(feetMatch[1]) : 0;
    inches = inchMatch ? Number(inchMatch[1]) : 0;
  } else {
    const parts = normalized.match(/-?\d+(?:\.\d+)?/g) ?? [];

    if (parts.length >= 2) {
      feet = Number(parts[0]);
      inches = Number(parts[1]);
    } else if (parts.length === 1) {
      feet = Number(parts[0]);
    } else {
      return null;
    }
  }

  if (!Number.isFinite(feet) || !Number.isFinite(inches)) return null;

  const totalInches = feet * 12 + inches;

  if (totalInches <= 0) return null;

  return (totalInches / 12) * GRID_SIZE;
}

export function pixelsToInches(pixelLength: number) {
  return (pixelLength / GRID_SIZE) * 12;
}

export function roundToQuarter(value: number) {
  return Math.round(value * 4) / 4;
}

export function formatDecimal(value: number) {
  return Number.isInteger(value) ? `${value}` : `${Number(value.toFixed(2))}`;
}

export function formatMeasurementFromInches(
  totalInchesValue: number,
  unit: MeasurementDisplayUnit = "feet-inches"
) {
  const totalInches = Math.max(1, Math.round(totalInchesValue));
  if (unit === "inches") return `${totalInches}"`;
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;

  if (feet === 0) return `${inches}"`;
  if (inches === 0) return `${feet}'`;

  return `${feet}' ${inches}"`;
}

export function formatFeetInches(
  pixelLength: number,
  unit: MeasurementDisplayUnit = "feet-inches"
) {
  const inchesPerGrid = 12;
  const totalInches = Math.max(
    1,
    Math.round((pixelLength / GRID_SIZE) * inchesPerGrid)
  );

  return formatMeasurementFromInches(totalInches, unit);
}
