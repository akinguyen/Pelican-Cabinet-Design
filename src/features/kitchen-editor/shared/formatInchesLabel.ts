export function formatInchesLabel(valueInches: number): string {
  if (Number.isInteger(valueInches)) {
    return `${valueInches}\"`;
  }

  return `${valueInches.toFixed(1)}\"`;
}
