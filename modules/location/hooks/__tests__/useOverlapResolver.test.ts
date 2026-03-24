import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOverlapResolver } from "@/modules/location/hooks/useOverlapResolver";
import type { UserCoordinates } from "@/shared/hooks/useUserLocation";
import type { TouristPoi } from "@/modules/poi/types/touristPoi";

// Mock openStatusUtils so test results are predictable (shop always "closed")
vi.mock("@/modules/poi/utils/openStatusUtils", () => ({
  getOpenStatus: () => ({ open: false }),
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

const BASE_LAT = 21.028;
const BASE_LNG = 105.854;

function makePoi(
  poiId: number,
  latOffset: number,
  lngOffset: number,
  likesCount = 0,
  hasApprovedAudio: boolean | undefined = true
): TouristPoi {
  return {
    poiId,
    name: `POI-${poiId}`,
    latitude: BASE_LAT + latOffset,
    longitude: BASE_LNG + lngOffset,
    radius: 100,
    linkedShopId: null,
    linkedShopName: null,
    linkedShopAvatarUrl: null,
    hasApprovedAudio,
    likesCount,
  };
}

/** User coordinate at the base location, stationary. */
function userAt(latOffset = 0, lngOffset = 0, speed = 0): UserCoordinates {
  return {
    latitude: BASE_LAT + latOffset,
    longitude: BASE_LNG + lngOffset,
    accuracy: 5,
    speed,
  };
}

const COOLDOWN_MS = 5_000;

// ─── useOverlapResolver ───────────────────────────────────────────────────────

/**
 * Unit tests for {@link useOverlapResolver}.
 *
 * Traceability: FR-LM-007 §6 / NFR-GEO-P02
 */
describe("useOverlapResolver", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  /**
   * TC-S07-U-O01 [P1][Happy]
   * Only one POI in overlappingPois → not resolved (< 2), isResolving = false.
   */
  it("TC-S07-U-O01 [P1][Happy] single POI → isResolving=false, resolvedPoiId=null", () => {
    const POIS = [makePoi(1, 0, 0)];
    const { result } = renderHook(() =>
      useOverlapResolver([1], POIS, userAt(), [])
    );
    expect(result.current.isResolving).toBe(false);
    expect(result.current.resolvedPoiId).toBeNull();
  });

  /**
   * TC-S07-U-O02 [P1][Happy]
   * Two POIs in overlappingPois → isResolving = true immediately.
   */
  it("TC-S07-U-O02 [P1][Happy] 2 POIs → isResolving=true immediately", () => {
    const POIS = [makePoi(1, 0, 0), makePoi(2, 0.0002, 0)];
    const { result } = renderHook(() =>
      useOverlapResolver([1, 2], POIS, userAt(), [])
    );
    expect(result.current.isResolving).toBe(true);
    expect(result.current.resolvedPoiId).toBeNull();
  });

  /**
   * TC-S07-U-O03 [P1][Happy]
   * After COOLDOWN_MS (5 s) → resolvedPoiId is the closer POI.
   * POI-1 is closer to user (at base position), POI-2 is 200 m away.
   */
  it("TC-S07-U-O03 [P1][Happy] after 5 s cooldown → resolves to closer POI", () => {
    // POI-1 at exact user location, POI-2 200 m away
    const POIS = [makePoi(1, 0, 0), makePoi(2, 0.002, 0)];
    const { result } = renderHook(() =>
      useOverlapResolver([1, 2], POIS, userAt(), [])
    );
    act(() => { vi.advanceTimersByTime(COOLDOWN_MS + 100); });
    expect(result.current.resolvedPoiId).toBe(1);
    expect(result.current.isResolving).toBe(false);
  });

  /**
   * TC-S07-U-O04 [P1][Negative]
   * POI with hasApprovedAudio === false → excluded from candidates.
   * If only one valid candidate remains, it wins immediately.
   */
  it("TC-S07-U-O04 [P1][Negative] POI without audio is excluded as a candidate", () => {
    const POIS = [
      makePoi(1, 0, 0, 0, false),      // no audio → excluded
      makePoi(2, 0.001, 0, 0, true),   // has audio → winner
    ];
    const { result } = renderHook(() =>
      useOverlapResolver([1, 2], POIS, userAt(), [])
    );
    act(() => { vi.advanceTimersByTime(COOLDOWN_MS + 100); });
    expect(result.current.resolvedPoiId).toBe(2);
  });

  /**
   * TC-S07-U-O05 [P2][Edge]
   * Equal scores → tie-break by lowest poiId.
   * Place both POIs at same distance & same likes so scores are equal.
   */
  it("TC-S07-U-O05 [P2][Edge] equal scores → tie-break selects lowest poiId", () => {
    // Both POIs at the same distance (symmetric about user)
    const POIS = [
      makePoi(3, 0, 0.001, 0),  // east
      makePoi(2, 0, -0.001, 0), // west — same distance, lower id wins
    ];
    const { result } = renderHook(() =>
      useOverlapResolver([2, 3], POIS, userAt(), [])
    );
    act(() => { vi.advanceTimersByTime(COOLDOWN_MS + 100); });
    expect(result.current.resolvedPoiId).toBe(2);
  });

  /**
   * TC-S07-U-O06 [P2][Edge]
   * Same overlap group key (same sorted POI IDs) → cooldown is NOT restarted and
   * resolution result is unchanged.
   */
  it("TC-S07-U-O06 [P2][Edge] same overlap key does not restart cooldown", () => {
    const POIS = [makePoi(1, 0, 0), makePoi(2, 0.002, 0)];
    const { result, rerender } = renderHook(
      ({ overlapping }) =>
        useOverlapResolver(overlapping, POIS, userAt(), []),
      { initialProps: { overlapping: [1, 2] } }
    );
    // Resolve
    act(() => { vi.advanceTimersByTime(COOLDOWN_MS + 100); });
    const firstResolved = result.current.resolvedPoiId;

    // Re-render with same overlap (different array reference, same sorted IDs)
    act(() => { rerender({ overlapping: [2, 1] }); });
    // Cooldown should NOT restart — resolvedPoiId stays the same
    expect(result.current.resolvedPoiId).toBe(firstResolved);
    expect(result.current.isResolving).toBe(false);
  });
});
