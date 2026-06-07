export function formatFeetInchesLabel(valueInches: number): string {
  const roundedInches = Math.round(Math.abs(valueInches));
  const feet = Math.floor(roundedInches / 12);
  const inches = roundedInches % 12;

  if (feet <= 0) {
    return `${inches}\"`;
  }

  if (inches === 0) {
    return `${feet}'`;
  }

  return `${feet}' ${inches}\"`;
}
