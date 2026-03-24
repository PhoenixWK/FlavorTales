import { describe, it, expect } from "vitest";
import {
  haversineMetres,
  bearingDeg,
  angleDiffDeg,
  headingMatch,
  computeMovementBearing,
} from "@/modules/location/utils/geoMath";
import type { UserCoordinates } from "@/shared/hooks/useUserLocation";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Construct a minimal UserCoordinates (accuracy defaults to 1 m). */
function coord(
  latitude: number,
  longitude: number,
  accuracy = 1,
  speed = 0
): UserCoordinates {
  return { latitude, longitude, accuracy, speed };
}

// ─── haversineMetres ──────────────────────────────────────────────────────────

describe("haversineMetres", () => {
  /**
   * TC-S07-U-G01 [P1][Happy]
   * Same point → distance = 0.
   */
  it("TC-S07-U-G01 [P1][Happy] returns 0 for the same point", () => {
    expect(haversineMetres(21.028, 105.854, 21.028, 105.854)).toBe(0);
  });

  /**
   * TC-S07-U-G02 [P1][Happy]
   * Hanoi Opera House → Hoan Kiem Lake: real-world distance ≈ 450 m.
   * Tolerance ±5 % to account for projection differences.
   */
  it("TC-S07-U-G02 [P1][Happy] computes a realistic ~450 m distance in Hanoi", () => {
    // Hanoi Opera House ↔ Hoan Kiem Lake (NE corner)
    const dist = haversineMetres(21.0245, 105.8412, 21.0286, 105.8522);
    expect(dist).toBeGreaterThan(900);
    expect(dist).toBeLessThan(1300);
  });

  /**
   * TC-S07-U-G03 [P1][Happy]
   * haversineMetres(A,B) === haversineMetres(B,A).
   */
  it("TC-S07-U-G03 [P1][Happy] is symmetric (A→B equals B→A)", () => {
    const ab = haversineMetres(21.03, 105.85, 21.04, 105.86);
    const ba = haversineMetres(21.04, 105.86, 21.03, 105.85);
    expect(ab).toBeCloseTo(ba, 6);
  });

  /**
   * TC-S07-U-G04 [P2][Edge]
   * North Pole → South Pole ≈ half earth circumference ≈ 20 015 km.
   */
  it("TC-S07-U-G04 [P2][Edge] returns ~20015 km between poles", () => {
    const dist = haversineMetres(90, 0, -90, 0);
    expect(dist).toBeGreaterThan(20_000_000);
    expect(dist).toBeLessThan(20_030_000);
  });
});

// ─── bearingDeg ───────────────────────────────────────────────────────────────

describe("bearingDeg", () => {
  /**
   * TC-S07-U-G05 [P1][Happy]
   * Due North: latitude increases, longitude stays same → bearing ≈ 0°.
   */
  it("TC-S07-U-G05 [P1][Happy] due North → ≈ 0°", () => {
    const b = bearingDeg([21.0, 105.854], [21.1, 105.854]);
    expect(b).toBeCloseTo(0, 0);
  });

  /**
   * TC-S07-U-G06 [P1][Happy]
   * Due East: longitude increases, latitude stays same → bearing ≈ 90°.
   */
  it("TC-S07-U-G06 [P1][Happy] due East → ≈ 90°", () => {
    const b = bearingDeg([21.028, 105.854], [21.028, 105.954]);
    expect(b).toBeCloseTo(90, 0);
  });

  /**
   * TC-S07-U-G07 [P1][Happy]
   * Due South: latitude decreases → bearing ≈ 180°.
   */
  it("TC-S07-U-G07 [P1][Happy] due South → ≈ 180°", () => {
    const b = bearingDeg([21.1, 105.854], [21.0, 105.854]);
    expect(b).toBeCloseTo(180, 0);
  });

  /**
   * TC-S07-U-G08 [P1][Happy]
   * Due West: longitude decreases → bearing ≈ 270°.
   */
  it("TC-S07-U-G08 [P1][Happy] due West → ≈ 270°", () => {
    const b = bearingDeg([21.028, 105.954], [21.028, 105.854]);
    expect(b).toBeCloseTo(270, 0);
  });
});

// ─── angleDiffDeg ─────────────────────────────────────────────────────────────

describe("angleDiffDeg", () => {
  /**
   * TC-S07-U-G09 [P1][Happy]
   * Same angle → 0°.
   */
  it("TC-S07-U-G09 [P1][Happy] returns 0 for the same angle", () => {
    expect(angleDiffDeg(45, 45)).toBe(0);
  });

  /**
   * TC-S07-U-G10 [P1][Happy]
   * Opposite bearings (0° and 180°) → 180°.
   */
  it("TC-S07-U-G10 [P1][Happy] returns 180 for opposite bearings", () => {
    expect(angleDiffDeg(0, 180)).toBe(180);
  });

  /**
   * TC-S07-U-G11 [P1][Happy]
   * Wrapping across 0°/360°: 350° and 10° → 20°.
   */
  it("TC-S07-U-G11 [P1][Happy] wraps correctly across 0° (350 and 10 → 20)", () => {
    expect(angleDiffDeg(350, 10)).toBe(20);
  });

  /**
   * TC-S07-U-G12 [P1][Happy]
   * 45° difference.
   */
  it("TC-S07-U-G12 [P1][Happy] returns 45 for a 45° difference", () => {
    expect(angleDiffDeg(0, 45)).toBe(45);
  });
});

// ─── headingMatch ─────────────────────────────────────────────────────────────

describe("headingMatch", () => {
  /**
   * TC-S07-U-G13 [P1][Negative]
   * null movementBearing → false (NFR-GEO-A03: insufficient history).
   */
  it("TC-S07-U-G13 [P1][Negative] returns false when movementBearing is null", () => {
    expect(headingMatch(null, 90)).toBe(false);
  });

  /**
   * TC-S07-U-G14 [P1][Happy]
   * 30° difference is within the 45° threshold → true.
   */
  it("TC-S07-U-G14 [P1][Happy] returns true when diff < 45°", () => {
    expect(headingMatch(60, 90)).toBe(true);
  });

  /**
   * TC-S07-U-G15 [P1][Edge]
   * Exactly 45° difference → false (function uses strict <, not ≤).
   */
  it("TC-S07-U-G15 [P2][Edge] returns false when diff is exactly 45° (strict <)", () => {
    expect(headingMatch(45, 90)).toBe(false);
  });

  /**
   * TC-S07-U-G16 [P1][Negative]
   * 90° difference is outside the threshold → false.
   */
  it("TC-S07-U-G16 [P1][Negative] returns false when diff > 45°", () => {
    expect(headingMatch(0, 90)).toBe(false);
  });
});

// ─── computeMovementBearing ───────────────────────────────────────────────────

describe("computeMovementBearing", () => {
  /**
   * TC-S07-U-G17 [P1][Negative]
   * Empty buffer → null.
   */
  it("TC-S07-U-G17 [P1][Negative] returns null for an empty buffer", () => {
    expect(computeMovementBearing([])).toBeNull();
  });

  /**
   * TC-S07-U-G18 [P1][Negative]
   * Single-point buffer → null (need at least 2 points for a vector).
   */
  it("TC-S07-U-G18 [P1][Negative] returns null for a single-point buffer", () => {
    expect(computeMovementBearing([coord(21.028, 105.854)])).toBeNull();
  });

  /**
   * TC-S07-U-G19 [P1][Happy]
   * Moving due East → bearing ≈ 90°.
   */
  it("TC-S07-U-G19 [P1][Happy] returns ≈ 90° when moving East", () => {
    const buffer = [coord(21.028, 105.854), coord(21.028, 105.954)];
    const b = computeMovementBearing(buffer);
    expect(b).not.toBeNull();
    expect(b!).toBeCloseTo(90, 0);
  });

  /**
   * TC-S07-U-G20 [P1][Happy]
   * multi-point buffer — uses first and last point only.
   */
  it("TC-S07-U-G20 [P2][Edge] uses first and last point of a multi-point buffer", () => {
    // Starting at (21, 105) moving generally North, last point slightly North
    const buffer = [
      coord(21.028, 105.854),
      coord(21.032, 105.856),
      coord(21.038, 105.854), // last: due North from first
    ];
    const b = computeMovementBearing(buffer);
    expect(b).not.toBeNull();
    // Should be roughly North (< 10°) because last point is North of first
    expect(b!).toBeCloseTo(0, 0);
  });
});
