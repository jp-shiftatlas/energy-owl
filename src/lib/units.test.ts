import { describe, it, expect } from "vitest";
import {
  mjPerM2ToKwhPerM2,
  secondsToHours,
  formatKwh,
  formatPercent,
  formatHours,
  formatKwhPerM2,
} from "./units";

describe("mjPerM2ToKwhPerM2", () => {
  it("converts 29.28 MJ/m² to ~8.13 kWh/m²", () => {
    expect(mjPerM2ToKwhPerM2(29.28)).toBeCloseTo(8.133, 3);
  });
  it("handles 0", () => {
    expect(mjPerM2ToKwhPerM2(0)).toBe(0);
  });
});

describe("secondsToHours", () => {
  it("converts 46800s to 13h", () => {
    expect(secondsToHours(46800)).toBe(13);
  });
  it("rounds to one decimal", () => {
    expect(secondsToHours(45000)).toBeCloseTo(12.5, 1);
  });
});

describe("formatters", () => {
  it("formatKwh groups thousands and drops decimals", () => {
    expect(formatKwh(175251)).toBe("175,251");
  });
  it("formatPercent renders with one decimal and % suffix", () => {
    expect(formatPercent(20)).toBe("20.0%");
  });
  it("formatHours renders one decimal with h suffix", () => {
    expect(formatHours(13)).toBe("13.0 h");
  });
  it("formatKwhPerM2 renders two decimals", () => {
    expect(formatKwhPerM2(8.133)).toBe("8.13 kWh/m²");
  });
});
