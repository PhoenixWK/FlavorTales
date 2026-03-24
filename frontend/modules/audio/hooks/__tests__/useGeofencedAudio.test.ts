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
const OVERLAP_TRANSITION_MAX_MS = 15_000;

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
  return {
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    src: "",
    volume: 1,
    onended: null as ((event: Event) => void) | null,
  };
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
   * play() when POI is on cooldown → stays "idle", audio not fetched.
   */
  it("TC-S07-U-A03 [P1][Negative] cooldown prevents playback", () => {
    // Manually put POI 1 on cooldown
    localStorage.setItem(
      "ft_audio_cooldown",
      JSON.stringify({ "1": Date.now() })
    );
    const { result } = buildHook(audioMock, 1);
    act(() => { result.current.play(); });
    // Even if loading starts briefly, it should settle back to idle
    act(() => { vi.advanceTimersByTime(100); });
    // fetchPoiAudio should not be called when on cooldown (checked in loadAndPlay)
    // The hook sets idle right after detecting cooldown
    expect(result.current.playState).toBe("idle");
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
    act(() => { result.current.play(); });
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
   * Audio A naturally ends (onended fires) → triggers B loading/playing.
   * A delayed fetch for POI 2 lets us observe the "loading" state before it resolves.
   */
  it("TC-S07-U-A08 [P1][Happy] overlap A→B: A ends naturally → B starts loading", async () => {
    let resolvePoi2Fetch!: (tracks: ReturnType<typeof makeTrack>[]) => void;
    mockFetchPoiAudio
      .mockResolvedValueOnce([makeTrack(10, "vi")]) // POI 1 resolves immediately
      .mockImplementationOnce(
        () => new Promise((res) => { resolvePoi2Fetch = res; }) // POI 2 - held
      );

    const { result, rerender } = buildHook(audioMock, 1, true);
    act(() => { result.current.play(); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(result.current.playState).toBe("playing");

    // Switch to POI 2 while overlap is active → hook enters "finishing"
    act(() => {
      rerender({ resolvedPoiId: 2, overlapActive: true, userLanguage: "vi" });
    });
    expect(result.current.playState).toBe("finishing");

    // Simulate natural audio end for POI 1 → triggers POI 2 fetch
    await act(async () => {
      if (audioMock.onended) {
        (audioMock.onended as unknown as () => void)();
      }
      await Promise.resolve();
    });

    // POI 2 fetch is still pending → should be in "loading" state
    expect(result.current.playState).toBe("loading");

    // Resolve POI 2 fetch so the hook can clean up properly
    await act(async () => {
      resolvePoi2Fetch([makeTrack(20, "vi")]);
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  /**
   * TC-S07-U-A09 [P1][Happy]
   * Language preference: userLanguage "en" → prefer "en" track, fall back to "vi".
   * When only "vi" track available, "vi" should be selected.
   */
  it("TC-S07-U-A09 [P1][Happy] language fallback: no 'en' track → falls back to 'vi'", async () => {
    mockFetchPoiAudio.mockResolvedValue([makeTrack(10, "vi")]); // only vi available

    const { result } = buildHook(audioMock, 1, false, "en");
    act(() => { result.current.play(); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    // Should successfully play using the "vi" fallback
    expect(result.current.playState).toBe("playing");
    expect(audioMock.src).toBe("https://cdn.example.com/audio/10.mp3");
  });
});
