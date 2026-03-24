import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePositionBuffer } from "@/modules/location/hooks/usePositionBuffer";
import type { UserCoordinates } from "@/shared/hooks/useUserLocation";

// ─── helpers ──────────────────────────────────────────────────────────────────

function coord(
  latitude: number,
  longitude: number,
  accuracy: number,
  speed = 0
): UserCoordinates {
  return { latitude, longitude, accuracy, speed };
}

const GOOD = (n: number) => coord(21.028 + n * 0.0001, 105.854, 10); // accuracy 10 m ≤ 15
const WEAK = (n: number) => coord(21.028 + n * 0.0001, 105.854, 20); // accuracy 20 m > 15

// ─── usePositionBuffer ────────────────────────────────────────────────────────

/**
 * Unit tests for {@link usePositionBuffer}.
 *
 * Traceability:
 *   FR-LM-007 / NFR-GEO-A01 (reject updates with accuracy > 15 m)
 *   NFR-GEO-A03 (keep last 5 valid positions for heading)
 */
describe("usePositionBuffer", () => {
  /**
   * TC-S07-U-B01 [P1][Happy]
   * Initial state: buffer is empty, consecutiveWeakCount = 0.
   */
  it("TC-S07-U-B01 [P1][Happy] starts with an empty buffer and weakCount = 0", () => {
    const { result } = renderHook(() => usePositionBuffer(null));
    expect(result.current.buffer).toHaveLength(0);
    expect(result.current.consecutiveWeakCount).toBe(0);
  });

  /**
   * TC-S07-U-B02 [P1][Happy]
   * Accurate GPS update (accuracy ≤ 15 m) → added to buffer.
   */
  it("TC-S07-U-B02 [P1][Happy] adds accurate GPS update to the buffer", () => {
    const { result, rerender } = renderHook(
      ({ coords }) => usePositionBuffer(coords),
      { initialProps: { coords: null as UserCoordinates | null } }
    );
    act(() => { rerender({ coords: GOOD(1) }); });
    expect(result.current.buffer).toHaveLength(1);
    expect(result.current.consecutiveWeakCount).toBe(0);
  });

  /**
   * TC-S07-U-B03 [P1][Happy]
   * Inaccurate GPS (accuracy > 15 m) → rejected; consecutiveWeakCount increments.
   */
  it("TC-S07-U-B03 [P1][Happy] rejects inaccurate update and increments weakCount", () => {
    const { result, rerender } = renderHook(
      ({ coords }) => usePositionBuffer(coords),
      { initialProps: { coords: null as UserCoordinates | null } }
    );
    act(() => { rerender({ coords: WEAK(1) }); });
    expect(result.current.buffer).toHaveLength(0);
    expect(result.current.consecutiveWeakCount).toBe(1);
  });

  /**
   * TC-S07-U-B04 [P1][Happy]
   * Three consecutive weak updates → consecutiveWeakCount = 3.
   */
  it("TC-S07-U-B04 [P1][Happy] counts 3 consecutive weak updates correctly", () => {
    const { result, rerender } = renderHook(
      ({ coords }) => usePositionBuffer(coords),
      { initialProps: { coords: null as UserCoordinates | null } }
    );
    act(() => { rerender({ coords: WEAK(1) }); });
    act(() => { rerender({ coords: WEAK(2) }); });
    act(() => { rerender({ coords: WEAK(3) }); });
    expect(result.current.consecutiveWeakCount).toBe(3);
    expect(result.current.buffer).toHaveLength(0);
  });

  /**
   * TC-S07-U-B05 [P1][Happy]
   * Good GPS after 2 weak updates → consecutiveWeakCount resets to 0.
   */
  it("TC-S07-U-B05 [P1][Happy] resets weakCount to 0 after a good update", () => {
    const { result, rerender } = renderHook(
      ({ coords }) => usePositionBuffer(coords),
      { initialProps: { coords: null as UserCoordinates | null } }
    );
    act(() => { rerender({ coords: WEAK(1) }); });
    act(() => { rerender({ coords: WEAK(2) }); });
    act(() => { rerender({ coords: GOOD(3) }); });
    expect(result.current.consecutiveWeakCount).toBe(0);
    expect(result.current.buffer).toHaveLength(1);
  });

  /**
   * TC-S07-U-B06 [P1][Edge]
   * BUFFER_SIZE = 5: adding a 6th accurate update drops the oldest entry.
   */
  it("TC-S07-U-B06 [P2][Edge] caps buffer at 5 entries (BUFFER_SIZE)", () => {
    const { result, rerender } = renderHook(
      ({ coords }) => usePositionBuffer(coords),
      { initialProps: { coords: null as UserCoordinates | null } }
    );
    for (let i = 1; i <= 6; i++) {
      act(() => { rerender({ coords: GOOD(i) }); });
    }
    expect(result.current.buffer).toHaveLength(5);
    // Oldest entry (GOOD(1) at lat 21.0281) should have been evicted; newest is GOOD(6)
    expect(result.current.buffer[4].latitude).toBeCloseTo(21.028 + 6 * 0.0001, 6);
  });

  /**
   * TC-S07-U-B07 [P2][Edge]
   * Passing null coordinates → buffer and weakCount unchanged.
   */
  it("TC-S07-U-B07 [P2][Edge] ignores null coordinates without changing state", () => {
    const { result, rerender } = renderHook(
      ({ coords }) => usePositionBuffer(coords),
      { initialProps: { coords: null as UserCoordinates | null } }
    );
    act(() => { rerender({ coords: GOOD(1) }); });
    act(() => { rerender({ coords: null }); });
    expect(result.current.buffer).toHaveLength(1);
    expect(result.current.consecutiveWeakCount).toBe(0);
  });
});
