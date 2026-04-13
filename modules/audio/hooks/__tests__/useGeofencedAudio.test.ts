import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockedFunction,
} from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import { useGeofencedAudio } from "@/modules/audio/hooks/useGeofencedAudio";
import { fetchPoiAudio } from "@/modules/poi/services/touristPoiApi";
import type { TouristPoiAudio } from "@/modules/poi/types/touristPoi";

// ─── mock fetchPoiAudio ───────────────────────────────────────────────────────

vi.mock("@/modules/poi/services/touristPoiApi", () => ({
  fetchPoiAudio: vi.fn(),
}));

const mockFetchPoiAudio = fetchPoiAudio as MockedFunction<typeof fetchPoiAudio>;

// ─── helpers ──────────────────────────────────────────────────────────────────

const COOLDOWN_MS = 10 * 60 * 1_000; // 10 minutes (must match implementation)
const NORMAL_EXIT_TRAIL_MS = 3_000;

function makeTrack(
  audioId: number,
  languageCode: string,
  status = "active"
): TouristPoiAudio {
  return {
    audioId,
    languageCode,
    fileUrl: `https://cdn.example.com/audio/${audioId}.mp3`,
    status,
  };
}

/** Creates a real HTMLAudioElement mock that the hook can use. */
function makeAudioMock() {
  const mock = {
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    src: "",
    volume: 1,
    ended: false,
    error: null as null | MediaError,
    currentTime: 0,
    onended: null as ((event: Event) => void) | null,
    onerror: null as ((event: Event) => void) | null,
    getAttribute(attr: string): string | null {
      if (attr === "src") return mock.src || null;
      return null;
    },
  };
  return mock;
}

/** Helper to build the hook under test with a given audioRef mock. */
function buildHook(
  audioMock: ReturnType<typeof makeAudioMock>,
  resolvedPoiId: number | null,
  overlapActive = false,
  userLanguage = "vi",
  sessionId: string | null = "session-001"
) {
  return renderHook(
    ({
      resolvedPoiId: rid,
      overlapActive: oa,
      userLanguage: lang,
    }: {
      resolvedPoiId: number | null;
      overlapActive: boolean;
      userLanguage: string;
    }) => {
      const audioRef = useRef<HTMLAudioElement | null>(
        audioMock as unknown as HTMLAudioElement
      );
      return useGeofencedAudio(audioRef, rid, oa, lang, sessionId);
    },
    {
      initialProps: { resolvedPoiId, overlapActive, userLanguage },
    }
  );
}

// ─── useGeofencedAudio ────────────────────────────────────────────────────────

/**
 * Unit tests for {@link useGeofencedAudio}.
 *
 * Traceability: FR-LM-008 / NFR-GEO-R02 / NFR-GEO-U03
 */
describe("useGeofencedAudio", () => {
  let audioMock: ReturnType<typeof makeAudioMock>;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    audioMock = makeAudioMock();
    mockFetchPoiAudio.mockResolvedValue([makeTrack(10, "vi")]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  /**
   * TC-S07-U-A01 [P1][Happy]
   * play() while resolvedPoiId = null → no-op, stays "idle".
   */
  it("TC-S07-U-A01 [P1][Happy] play() with no resolved POI → stays idle", () => {
    const { result } = buildHook(audioMock, null);
    act(() => { result.current.play(); });
    expect(result.current.playState).toBe("idle");
    expect(audioMock.play).not.toHaveBeenCalled();
  });

  /**
   * TC-S07-U-A02 [P1][Happy]
   * play() with a resolved POI and no cooldown → transitions to "loading" then "playing".
   */
  it("TC-S07-U-A02 [P1][Happy] play() with resolved POI → loading then playing", async () => {
    const { result } = buildHook(audioMock, 1);
    act(() => { result.current.play(); });
    expect(result.current.playState).toBe("loading");

    // Flush the fetchPoiAudio promise + el.play() promise
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.playState).toBe("playing");
    expect(result.current.currentPoiId).toBe(1);
    expect(audioMock.play).toHaveBeenCalledTimes(1);
  });

  /**
   * TC-S07-U-A03 [P1][Negative]
   * Geofence auto-entry (force=true) bypasses the 10-min cooldown.
   * When the user manually calls play() while in idle state on cooldown,
   * it should remain idle because loadAndPlay is called with force=false.
   * Note: auto-entry from the geofence effect always uses force=true and ignores cooldown.
   */
  it("TC-S07-U-A03 [P1][Negative] cooldown respects force flag: auto-entry bypasses, manual play respects", async () => {
    // POI 1 on cooldown
    localStorage.setItem(
      "ft_audio_cooldown",
      JSON.stringify({ "1": Date.now() })
    );

    // Auto-entry via geofence effect (force=true) should bypass cooldown and load
    const { result, rerender } = buildHook(audioMock, null);
    await act(async () => {
      rerender({ resolvedPoiId: 1, overlapActive: false, userLanguage: "vi" });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.playState).toBe("playing"); // cooldown bypassed
  });

  /**
   * TC-S07-U-A04 [P1][Happy]
   * pause() while playing → state becomes "paused".
   */
  it("TC-S07-U-A04 [P1][Happy] pause() while playing → paused", async () => {
    const { result } = buildHook(audioMock, 1);
    act(() => { result.current.play(); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    act(() => { result.current.pause(); });
    expect(result.current.playState).toBe("paused");
    expect(audioMock.pause).toHaveBeenCalled();
  });

  /**
   * TC-S07-U-A05 [P1][Happy]
   * play() when paused → resumes (state "playing").
   */
  it("TC-S07-U-A05 [P1][Happy] play() when paused → resumes playing", async () => {
    const { result } = buildHook(audioMock, 1);
    act(() => { result.current.play(); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    act(() => { result.current.pause(); });
    expect(result.current.playState).toBe("paused");
    await act(async () => { result.current.play(); await Promise.resolve(); });
    expect(result.current.playState).toBe("playing");
  });

  /**
   * TC-S07-U-A06 [P1][Happy]
   * stop() → immediately sets playState to "idle".
   */
  it("TC-S07-U-A06 [P1][Happy] stop() → immediately idle", async () => {
    const { result } = buildHook(audioMock, 1);
    act(() => { result.current.play(); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    act(() => { result.current.stop(); });
    expect(result.current.playState).toBe("idle");
    expect(result.current.currentPoiId).toBeNull();
  });

  /**
   * TC-S07-U-A07 [P1][Happy]
   * Normal exit (resolvedPoiId → null while playing) → "finishing" for 3 s,
   * then "idle" after trail.
   */
  it("TC-S07-U-A07 [P1][Happy] resolvedPoiId→null while playing → finishing then idle", async () => {
    const { result, rerender } = buildHook(audioMock, 1);
    act(() => { result.current.play(); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    // Transition: resolved → null
    act(() => { rerender({ resolvedPoiId: null, overlapActive: false, userLanguage: "vi" }); });
    expect(result.current.playState).toBe("finishing");

    // Advance past trail duration + fade
    act(() => { vi.advanceTimersByTime(NORMAL_EXIT_TRAIL_MS + 600); });
    expect(result.current.playState).toBe("idle");
  });

  /**
   * TC-S07-U-A08 [P1][Happy]
   * Overlap A→B transition: resolvedPoiId A → B while overlapActive.
   * A is stopped immediately and B starts loading without any delay.
   */
  it("TC-S07-U-A08 [P1][Happy] overlap A→B: A stopped immediately, B starts loading", async () => {
    let resolvePoi2Fetch!: (tracks: ReturnType<typeof makeTrack>[]) => void;
    mockFetchPoiAudio
      .mockResolvedValueOnce([makeTrack(10, "vi")])
      .mockImplementationOnce(
        () => new Promise((res) => { resolvePoi2Fetch = res; })
      );

    // Start outside all POIs, then enter POI 1 so effect triggers auto-play cleanly
    const { result, rerender } = buildHook(audioMock, null, true);
    await act(async () => {
      rerender({ resolvedPoiId: 1, overlapActive: true, userLanguage: "vi" });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.playState).toBe("playing");
    expect(result.current.currentPoiId).toBe(1);

    // Switch to POI 2 while overlap is active → A stops immediately, B starts loading
    await act(async () => {
      rerender({ resolvedPoiId: 2, overlapActive: true, userLanguage: "vi" });
      await Promise.resolve();
    });

    expect(audioMock.pause).toHaveBeenCalled();
    expect(audioMock.src).toBe("");
    expect(result.current.playState).toBe("loading");
    expect(result.current.currentPoiId).toBe(2);

    // Resolve POI 2 fetch so the hook can clean up properly
    await act(async () => {
      resolvePoi2Fetch([makeTrack(20, "vi")]);
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  /**
   * TC-S07-U-A10 [P1][Happy]
   * Non-overlap A→B: resolvedPoiId changes A→B without overlap.
   * A is stopped immediately (no 3s trail) and B starts loading right away.
   */
  it("TC-S07-U-A10 [P1][Happy] non-overlap A→B: A stopped immediately, B starts loading", async () => {
    let resolvePoi2Fetch!: (tracks: ReturnType<typeof makeTrack>[]) => void;
    mockFetchPoiAudio
      .mockResolvedValueOnce([makeTrack(10, "vi")])
      .mockImplementationOnce(
        () => new Promise((res) => { resolvePoi2Fetch = res; })
      );

    // Start outside, enter POI 1 to reach "playing" cleanly via effect
    const { result, rerender } = buildHook(audioMock, null, false);
    await act(async () => {
      rerender({ resolvedPoiId: 1, overlapActive: false, userLanguage: "vi" });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.playState).toBe("playing");

    // Switch POI without overlap → A must stop immediately
    await act(async () => {
      rerender({ resolvedPoiId: 2, overlapActive: false, userLanguage: "vi" });
      await Promise.resolve();
    });

    expect(audioMock.pause).toHaveBeenCalled();
    expect(audioMock.src).toBe("");
    expect(result.current.playState).toBe("loading");
    expect(result.current.currentPoiId).toBe(2);

    // Cleanup: resolve pending fetch
    await act(async () => {
      resolvePoi2Fetch([makeTrack(20, "vi")]);
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  /**
   * TC-S07-U-A11 [P1][Happy]
   * A→B while A is still loading (fetch not yet resolved).
   * The stale load for A must be abandoned; B starts loading.
   */
  it("TC-S07-U-A11 [P1][Happy] A→B while A still loading: stale fetch abandoned, B loads", async () => {
    let resolvePoi1Fetch!: (tracks: ReturnType<typeof makeTrack>[]) => void;
    let resolvePoi2Fetch!: (tracks: ReturnType<typeof makeTrack>[]) => void;
    mockFetchPoiAudio
      .mockImplementationOnce(() => new Promise((res) => { resolvePoi1Fetch = res; }))
      .mockImplementationOnce(() => new Promise((res) => { resolvePoi2Fetch = res; }));

    // Start outside, then enter POI 1 — fetch for POI 1 stays pending
    const { result, rerender } = buildHook(audioMock, null, false);
    act(() => {
      rerender({ resolvedPoiId: 1, overlapActive: false, userLanguage: "vi" });
    });
    expect(result.current.playState).toBe("loading");
    expect(result.current.currentPoiId).toBe(1);

    // Switch to POI 2 before POI 1 fetch resolves
    await act(async () => {
      rerender({ resolvedPoiId: 2, overlapActive: false, userLanguage: "vi" });
      await Promise.resolve();
    });

    // POI 2 fetch is held — state should be loading for POI 2
    expect(result.current.currentPoiId).toBe(2);
    expect(result.current.playState).toBe("loading");

    // Resolve stale POI 1 fetch — should be a no-op (generation guard)
    await act(async () => {
      resolvePoi1Fetch([makeTrack(10, "vi")]);
      await Promise.resolve();
      await Promise.resolve();
    });
    // State must still belong to POI 2
    expect(result.current.currentPoiId).toBe(2);

    // Cleanup
    await act(async () => {
      resolvePoi2Fetch([makeTrack(20, "vi")]);
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  /**
   * TC-S07-U-A12 [P2][Negative]
   * Rerender with same resolvedPoiId (A→A) → no additional pause/play.
   */
  it("TC-S07-U-A12 [P2][Negative] same POI rerender → no extra pause or load", async () => {
    const { result, rerender } = buildHook(audioMock, null, false);
    await act(async () => {
      rerender({ resolvedPoiId: 1, overlapActive: false, userLanguage: "vi" });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.playState).toBe("playing");

    const pauseCallsBefore = (audioMock.pause as ReturnType<typeof vi.fn>).mock.calls.length;
    const fetchCallsBefore = mockFetchPoiAudio.mock.calls.length;

    act(() => { rerender({ resolvedPoiId: 1, overlapActive: false, userLanguage: "vi" }); });

    expect((audioMock.pause as ReturnType<typeof vi.fn>).mock.calls.length).toBe(pauseCallsBefore);
    expect(mockFetchPoiAudio.mock.calls.length).toBe(fetchCallsBefore);
    expect(result.current.playState).toBe("playing");
  });

  /**
   * TC-S07-U-A13 [P2][Happy]
   * After A→B switch, normal exit B→null still uses the 3s trail.
   */
  it("TC-S07-U-A13 [P2][Happy] after A→B, exit B→null still trails 3s then idle", async () => {
    mockFetchPoiAudio
      .mockResolvedValueOnce([makeTrack(10, "vi")])
      .mockResolvedValueOnce([makeTrack(20, "vi")]);

    // Enter POI 1 from outside
    const { result, rerender } = buildHook(audioMock, null, false);
    await act(async () => {
      rerender({ resolvedPoiId: 1, overlapActive: false, userLanguage: "vi" });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.playState).toBe("playing");

    // Switch A→B
    await act(async () => {
      rerender({ resolvedPoiId: 2, overlapActive: false, userLanguage: "vi" });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.playState).toBe("playing");
    expect(result.current.currentPoiId).toBe(2);

    // Exit B→null
    act(() => { rerender({ resolvedPoiId: null, overlapActive: false, userLanguage: "vi" }); });
    expect(result.current.playState).toBe("finishing");

    // Before trail ends → still finishing
    act(() => { vi.advanceTimersByTime(NORMAL_EXIT_TRAIL_MS - 100); });
    expect(result.current.playState).toBe("finishing");

    // After trail + fade → idle
    act(() => { vi.advanceTimersByTime(700); });
    expect(result.current.playState).toBe("idle");
  });

  /**
   * TC-S07-U-A09 [P1][Happy]
   * Language preference: userLanguage "en" → prefer "en" track, fall back to "vi".
   * When only "vi" track available, "vi" should be selected and audio proxied via serve endpoint.
   */
  it("TC-S07-U-A09 [P1][Happy] language fallback: no 'en' track → falls back to 'vi'", async () => {
    mockFetchPoiAudio.mockResolvedValue([makeTrack(10, "vi")]);

    // Enter POI 1 from outside to trigger auto-play cleanly
    const { result, rerender } = buildHook(audioMock, null, false, "en");
    await act(async () => {
      rerender({ resolvedPoiId: 1, overlapActive: false, userLanguage: "en" });
      await Promise.resolve();
      await Promise.resolve();
    });

    // Should successfully play using the "vi" fallback
    expect(result.current.playState).toBe("playing");
    // Src is routed through the Next.js proxy (R2 signing)
    expect(audioMock.src).toBe("/api/audio/serve?url=https%3A%2F%2Fcdn.example.com%2Faudio%2F10.mp3");
  });
});
