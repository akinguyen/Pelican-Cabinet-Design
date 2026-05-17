import test from "node:test";
import assert from "node:assert/strict";

import {
  formatDecimal,
  formatFeetInches,
  formatFeetInchesForInput,
  formatFeetInchesParts,
  formatMeasurementFromInches,
  inchesToPixels,
  parseFeetInchesToPixels,
  pixelsToInches,
  roundToQuarter,
} from "../components/editor/measurements.ts";

test("measurement helpers preserve current unit conversion and display formatting", () => {
  assert.equal(inchesToPixels(12), 28);
  assert.equal(pixelsToInches(28), 12);
  assert.equal(formatMeasurementFromInches(24), "2'");
  assert.equal(formatMeasurementFromInches(27), `2' 3"`);
  assert.equal(formatMeasurementFromInches(3), `3"`);
  assert.equal(formatMeasurementFromInches(0), `1"`);
  assert.equal(formatMeasurementFromInches(24, "inches"), `24"`);
  assert.equal(formatFeetInches(28), "1'");
  assert.equal(formatFeetInches(35), `1' 3"`);
  assert.equal(formatFeetInchesForInput(35), "1 3");
  assert.deepEqual(formatFeetInchesParts(35), { feet: "1", inches: "3" });
  assert.equal(roundToQuarter(2.13), 2.25);
  assert.equal(formatDecimal(2), "2");
  assert.equal(formatDecimal(2.125), "2.13");
});

test("measurement parser preserves current parsing and invalid-input behavior", () => {
  assert.equal(parseFeetInchesToPixels(`2'`), 56);
  assert.equal(parseFeetInchesToPixels(`2' 6"`), 70);
  assert.equal(parseFeetInchesToPixels("2 6"), 70);
  assert.equal(parseFeetInchesToPixels("2"), 56);
  assert.equal(parseFeetInchesToPixels(`0' 6"`), 14);
  assert.equal(parseFeetInchesToPixels(""), null);
  assert.equal(parseFeetInchesToPixels("   "), null);
  assert.equal(parseFeetInchesToPixels("abc"), null);
  assert.equal(parseFeetInchesToPixels("0"), null);
  assert.equal(parseFeetInchesToPixels(`0' 0"`), null);
  assert.equal(parseFeetInchesToPixels(`-1' 6"`), 42);
});
