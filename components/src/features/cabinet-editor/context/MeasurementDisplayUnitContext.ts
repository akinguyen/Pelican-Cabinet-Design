import { createContext, useContext } from "react";
import type { MeasurementDisplayUnit } from "../types/editorTypes";

export const MeasurementDisplayUnitContext = createContext<MeasurementDisplayUnit>("feet-inches");

export function useMeasurementDisplayUnit() {
  return useContext(MeasurementDisplayUnitContext);
}
