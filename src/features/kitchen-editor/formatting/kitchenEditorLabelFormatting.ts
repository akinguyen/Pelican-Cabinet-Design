import type { DesignReservationZonePurpose } from "@/engine/design-zones/designReservationZoneTypes";

export function formatInchesLabel(valueInches: number): string {
  if (Number.isInteger(valueInches)) {
    return `${valueInches}\"`;
  }

  return `${valueInches.toFixed(1)}\"`;
}

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

export function formatDesignReservationZonePurposeLabel(purpose: DesignReservationZonePurpose): string {
  switch (purpose) {
    case "island":
      return "Island";
    case "peninsula":
      return "Peninsula";
    case "tall-pantry":
      return "Tall pantry";
  }
}
