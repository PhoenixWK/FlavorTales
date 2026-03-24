package com.flavortales.location.service;

import com.flavortales.location.document.TouristSession;
import com.flavortales.location.dto.CreateTouristSessionResponse;
import com.flavortales.location.dto.TouristSessionResponse;
import com.flavortales.location.dto.UpdateSessionRequest;
import com.flavortales.location.repository.TouristSessionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link TouristSessionService}.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>Requirement : FR-UM-011 – Anonymous Tourist Session</li>
 *   <li>Use Case    : UC-10 – Xác định vị trí người dùng trên bản đồ</li>
 *   <li>User Story  : US-010 – Tourist accesses the app without registration</li>
 * </ul>
 *
 * <p><b>Coverage matrix</b>
 * <pre>
 *  TC            Scenario                                         Priority  Type
 *  ─────────────────────────────────────────────────────────────────────────────
 *  TC-GS-U-001   createSession → valid UUID sessionId            P0        Happy
 *  TC-GS-U-002   createSession → expiresAt ≈ now + 24 h         P0        Happy
 *  TC-GS-U-003   createSession → default languagePreference "vi" P0        Happy
 *  TC-GS-U-004   createSession → initial cache lists are empty   P0        Happy
 *  TC-GS-U-005   createSession → consecutive calls produce       P1        Edge
 *                                unique sessionIds
 *  TC-GS-U-006   getSession    → valid session returns all fields P0       Happy
 *  TC-GS-U-007   getSession    → unknown ID → empty              P0        Negative
 *  TC-GS-U-008   getSession    → DB-resident but expired →        P0        Edge
 *                                empty (TTL drift guard)
 *  TC-GS-U-009   getSession    → near-expiry (2 s) → still valid P1        Boundary
 *  TC-GS-U-010   updateSession → language only → saved,          P0        Happy
 *                                other fields unchanged
 *  TC-GS-U-011   updateSession → viewedPoiIds list updated       P0        Happy
 *  TC-GS-U-012   updateSession → playedAudioIds list updated     P0        Happy
 *  TC-GS-U-013   updateSession → all-null request → no mutation  P1        Edge
 *  TC-GS-U-014   updateSession → expired session → empty,        P0        Negative
 *                                save never called
 *  TC-GS-U-015   updateSession → unknown ID → empty,             P0        Negative
 *                                save never called
 *  TC-GS-U-016   updateSession → partial: only non-null fields   P1        Edge
 *                                written
 *  TC-GS-U-017   privacy       → saved document has no PII       P0        Security
 * </pre>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("TouristSessionService | FR-UM-011 / UC-10 / US-010")
class TouristSessionServiceTest {

    @Mock
    private TouristSessionRepository sessionRepository;

    @InjectMocks
    private TouristSessionService sessionService;

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Returns a non-expired {@link TouristSession} with realistic test data.
     * Created 1 hour ago, expires in 23 hours (24 h TTL window).
     */
    private TouristSession buildActiveSession(String sessionId) {
        Instant now = Instant.now();
        return TouristSession.builder()
                .sessionId(sessionId)
                .languagePreference("vi")
                .viewedPoiIds(List.of(10, 20))
                .playedAudioIds(List.of(5))
                .createdAt(now.minus(1, ChronoUnit.HOURS))
                .expiresAt(now.plus(23, ChronoUnit.HOURS))
                .build();
    }

    // ── createSession ─────────────────────────────────────────────────────────

    @Nested
    @DisplayName("createSession()")
    class CreateSession {

        /**
         * TC-GS-U-001 | P0 | Happy Path
         * Trace: FR-UM-011 §1 – "Tự động tạo session ID duy nhất khi Tourist truy cập lần đầu"
         *
         * <p>Precondition: repository.save() succeeds.
         * <p>Steps: call createSession().
         * <p>Expected: returned sessionId is a well-formed UUID (RFC 4122); expiresAt is non-null.
         */
        @Test
        @DisplayName("TC-GS-U-001 – returns a well-formed UUID sessionId and a non-null expiresAt")
        void tc_gs_u_001_returnsValidUuidSessionIdAndExpiry() {
            when(sessionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            CreateTouristSessionResponse response = sessionService.createSession();

            assertThat(response.sessionId()).isNotBlank();
            assertThatCode(() -> UUID.fromString(response.sessionId()))
                    .as("sessionId must be a valid RFC-4122 UUID")
                    .doesNotThrowAnyException();
            assertThat(response.expiresAt()).isNotNull();
        }

        /**
         * TC-GS-U-002 | P0 | Happy Path
         * Trace: FR-UM-011 §1 – "TTL: 24 giờ hoặc khi trình duyệt đóng"
         *
         * <p>Expected: expiresAt ≈ (call time) + 24 h.  A ±5 s tolerance
         * accommodates test-runner scheduling latency on slow CI agents.
         */
        @Test
        @DisplayName("TC-GS-U-002 – expiresAt is approximately 24 hours from the time of creation")
        void tc_gs_u_002_expiresAtIsApproximately24HoursFromNow() {
            when(sessionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            Instant before = Instant.now();
            CreateTouristSessionResponse response = sessionService.createSession();
            Instant after = Instant.now();

            assertThat(response.expiresAt())
                    .isAfterOrEqualTo(before.plus(24, ChronoUnit.HOURS))
                    .isBeforeOrEqualTo(after.plus(24, ChronoUnit.HOURS));
        }

        /**
         * TC-GS-U-003 | P0 | Happy Path
         * Trace: FR-UM-011 §2 – "Tùy chọn ngôn ngữ đã chọn" (default = Vietnamese)
         *
         * <p>Precondition: no language explicitly supplied at session creation.
         * <p>Expected: persisted document has languagePreference = "vi".
         */
        @Test
        @DisplayName("TC-GS-U-003 – default languagePreference saved as 'vi'")
        void tc_gs_u_003_defaultLanguagePreferenceIsVi() {
            ArgumentCaptor<TouristSession> captor = ArgumentCaptor.forClass(TouristSession.class);
            when(sessionRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

            sessionService.createSession();

            assertThat(captor.getValue().getLanguagePreference()).isEqualTo("vi");
        }

        /**
         * TC-GS-U-004 | P0 | Happy Path
         * Trace: FR-UM-011 §2 – "Danh sách POI đã xem", "Danh sách audio đã phát"
         *
         * <p>Expected: newly created session has empty viewedPoiIds and playedAudioIds.
         */
        @Test
        @DisplayName("TC-GS-U-004 – initial offline-cache lists are empty")
        void tc_gs_u_004_initialCacheListsAreEmpty() {
            ArgumentCaptor<TouristSession> captor = ArgumentCaptor.forClass(TouristSession.class);
            when(sessionRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

            sessionService.createSession();

            assertThat(captor.getValue().getViewedPoiIds()).isEmpty();
            assertThat(captor.getValue().getPlayedAudioIds()).isEmpty();
        }

        /**
         * TC-GS-U-005 | P1 | Edge Case
         * Trace: FR-UM-011 §3 – "Session ID ngẫu nhiên, không thể dự đoán"
         *
         * <p>Precondition: two consecutive calls (no shared state).
         * <p>Expected: each call returns a distinct, non-repeating sessionId.
         */
        @Test
        @DisplayName("TC-GS-U-005 – consecutive calls produce distinct sessionIds (no reuse)")
        void tc_gs_u_005_consecutiveCallsProduceUniqueSessionIds() {
            when(sessionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            String id1 = sessionService.createSession().sessionId();
            String id2 = sessionService.createSession().sessionId();

            assertThat(id1).isNotEqualTo(id2);
        }
    }

    // ── getSession ────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getSession()")
    class GetSession {

        /**
         * TC-GS-U-006 | P0 | Happy Path
         * Trace: FR-UM-011 §1, §2 – session retrieval and data hydration
         *
         * <p>Precondition: session exists in repository, expiresAt is in the future.
         * <p>Expected: Optional contains response with all fields correctly mapped.
         */
        @Test
        @DisplayName("TC-GS-U-006 – existing valid session returns response with all fields populated")
        void tc_gs_u_006_existingValidSession_returnsResponseWithAllFields() {
            String id = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
            TouristSession entity = buildActiveSession(id);
            when(sessionRepository.findById(id)).thenReturn(Optional.of(entity));

            Optional<TouristSessionResponse> result = sessionService.getSession(id);

            assertThat(result).isPresent();
            TouristSessionResponse resp = result.get();
            assertThat(resp.sessionId()).isEqualTo(id);
            assertThat(resp.languagePreference()).isEqualTo("vi");
            assertThat(resp.viewedPoiIds()).containsExactly(10, 20);
            assertThat(resp.playedAudioIds()).containsExactly(5);
            assertThat(resp.createdAt()).isNotNull();
            assertThat(resp.expiresAt()).isNotNull();
        }

        /**
         * TC-GS-U-007 | P0 | Negative
         * Trace: FR-UM-011 §1 – requesting an unknown sessionId
         *
         * <p>Precondition: repository has no record for the given ID.
         * <p>Expected: Optional.empty() — no exception, no data.
         */
        @Test
        @DisplayName("TC-GS-U-007 – unknown sessionId returns Optional.empty()")
        void tc_gs_u_007_unknownSessionId_returnsEmpty() {
            String id = UUID.randomUUID().toString();
            when(sessionRepository.findById(id)).thenReturn(Optional.empty());

            Optional<TouristSessionResponse> result = sessionService.getSession(id);

            assertThat(result).isEmpty();
        }

        /**
         * TC-GS-U-008 | P0 | Negative / Edge
         * Trace: FR-UM-011 §3 – "Tự động xóa sau khi hết hạn"
         *
         * <p>Simulates TTL index lag: document still exists in MongoDB but its
         * {@code expiresAt} is in the past.
         * <p>Precondition: session found in repository; expiresAt 1 hour ago.
         * <p>Expected: Optional.empty() — application-level TTL guard fires before
         * the storage-level TTL cleanup runs.
         */
        @Test
        @DisplayName("TC-GS-U-008 – session present in DB but past expiresAt → Empty (TTL drift guard)")
        void tc_gs_u_008_expiredSessionInDb_returnsEmpty() {
            String id = UUID.randomUUID().toString();
            TouristSession expired = TouristSession.builder()
                    .sessionId(id)
                    .languagePreference("vi")
                    .createdAt(Instant.now().minus(25, ChronoUnit.HOURS))
                    .expiresAt(Instant.now().minus(1, ChronoUnit.HOURS)) // expired 1 h ago
                    .build();
            when(sessionRepository.findById(id)).thenReturn(Optional.of(expired));

            Optional<TouristSessionResponse> result = sessionService.getSession(id);

            assertThat(result).isEmpty();
        }

        /**
         * TC-GS-U-009 | P1 | Boundary
         * Trace: FR-UM-011 §1 – "TTL: 24 giờ"
         *
         * <p>Precondition: session expires 2 seconds from now (still valid by 1 ms).
         * <p>Expected: session is returned — the expiry boundary is exclusive.
         */
        @Test
        @DisplayName("TC-GS-U-009 – session expiring in 2 s is still returned (boundary: expiresAt exclusive)")
        void tc_gs_u_009_sessionExpiringIn2Seconds_isStillReturned() {
            String id = UUID.randomUUID().toString();
            TouristSession nearExpiry = TouristSession.builder()
                    .sessionId(id)
                    .languagePreference("en")
                    .createdAt(Instant.now().minus(24, ChronoUnit.HOURS).plusSeconds(2))
                    .expiresAt(Instant.now().plusSeconds(2))
                    .build();
            when(sessionRepository.findById(id)).thenReturn(Optional.of(nearExpiry));

            Optional<TouristSessionResponse> result = sessionService.getSession(id);

            assertThat(result).isPresent();
        }
    }

    // ── updateSession ─────────────────────────────────────────────────────────

    @Nested
    @DisplayName("updateSession()")
    class UpdateSession {

        /**
         * TC-GS-U-010 | P0 | Happy Path
         * Trace: FR-UM-011 §2 – "Tùy chọn ngôn ngữ đã chọn"
         *
         * <p>Precondition: active session with languagePreference="vi".
         * <p>Steps: send UpdateSessionRequest(languagePreference="en", others null).
         * <p>Expected: saved document has languagePreference="en";
         * viewedPoiIds and playedAudioIds are unchanged.
         */
        @Test
        @DisplayName("TC-GS-U-010 – updating languagePreference only saves new value; other fields unchanged")
        void tc_gs_u_010_languageOnlyUpdate_savesNewLang_otherFieldsUnchanged() {
            String id = UUID.randomUUID().toString();
            TouristSession entity = buildActiveSession(id);
            when(sessionRepository.findById(id)).thenReturn(Optional.of(entity));
            ArgumentCaptor<TouristSession> captor = ArgumentCaptor.forClass(TouristSession.class);
            when(sessionRepository.save(captor.capture())).thenReturn(entity);

            Optional<TouristSessionResponse> result =
                    sessionService.updateSession(id, new UpdateSessionRequest("en", null, null));

            assertThat(result).isPresent();
            TouristSession saved = captor.getValue();
            assertThat(saved.getLanguagePreference()).isEqualTo("en");
            assertThat(saved.getViewedPoiIds()).containsExactly(10, 20);   // unchanged
            assertThat(saved.getPlayedAudioIds()).containsExactly(5);       // unchanged
        }

        /**
         * TC-GS-U-011 | P0 | Happy Path
         * Trace: FR-UM-011 §2 – "Danh sách POI đã xem (cho offline cache)"
         *
         * <p>Steps: send UpdateSessionRequest with viewedPoiIds=[1,2,3], others null.
         * <p>Expected: saved document has viewedPoiIds=[1,2,3]; languagePreference unchanged.
         */
        @Test
        @DisplayName("TC-GS-U-011 – updating viewedPoiIds replaces the list; languagePreference unchanged")
        void tc_gs_u_011_viewedPoiIdsUpdate_savedCorrectly() {
            String id = UUID.randomUUID().toString();
            TouristSession entity = buildActiveSession(id);
            when(sessionRepository.findById(id)).thenReturn(Optional.of(entity));
            ArgumentCaptor<TouristSession> captor = ArgumentCaptor.forClass(TouristSession.class);
            when(sessionRepository.save(captor.capture())).thenReturn(entity);

            sessionService.updateSession(id, new UpdateSessionRequest(null, List.of(1, 2, 3), null));

            assertThat(captor.getValue().getViewedPoiIds()).containsExactly(1, 2, 3);
            assertThat(captor.getValue().getLanguagePreference()).isEqualTo("vi");
        }

        /**
         * TC-GS-U-012 | P0 | Happy Path
         * Trace: FR-UM-011 §2 – "Danh sách audio đã phát (cho offline cache)"
         *
         * <p>Steps: send UpdateSessionRequest with playedAudioIds=[100,200], others null.
         * <p>Expected: saved document has playedAudioIds=[100,200].
         */
        @Test
        @DisplayName("TC-GS-U-012 – updating playedAudioIds replaces the list")
        void tc_gs_u_012_playedAudioIdsUpdate_savedCorrectly() {
            String id = UUID.randomUUID().toString();
            TouristSession entity = buildActiveSession(id);
            when(sessionRepository.findById(id)).thenReturn(Optional.of(entity));
            ArgumentCaptor<TouristSession> captor = ArgumentCaptor.forClass(TouristSession.class);
            when(sessionRepository.save(captor.capture())).thenReturn(entity);

            sessionService.updateSession(id, new UpdateSessionRequest(null, null, List.of(100, 200)));

            assertThat(captor.getValue().getPlayedAudioIds()).containsExactly(100, 200);
        }

        /**
         * TC-GS-U-013 | P1 | Edge Case
         * Trace: FR-UM-011 §2 – null field = no-op (partial-update contract)
         *
         * <p>Steps: send UpdateSessionRequest with all fields null.
         * <p>Expected: save() is still called (document dirty-checked); no fields mutated.
         */
        @Test
        @DisplayName("TC-GS-U-013 – all-null request leaves every field unchanged")
        void tc_gs_u_013_allNullRequest_noFieldsMutated() {
            String id = UUID.randomUUID().toString();
            TouristSession entity = buildActiveSession(id);
            when(sessionRepository.findById(id)).thenReturn(Optional.of(entity));
            ArgumentCaptor<TouristSession> captor = ArgumentCaptor.forClass(TouristSession.class);
            when(sessionRepository.save(captor.capture())).thenReturn(entity);

            Optional<TouristSessionResponse> result =
                    sessionService.updateSession(id, new UpdateSessionRequest(null, null, null));

            assertThat(result).isPresent();
            TouristSession saved = captor.getValue();
            assertThat(saved.getLanguagePreference()).isEqualTo("vi");
            assertThat(saved.getViewedPoiIds()).containsExactly(10, 20);
            assertThat(saved.getPlayedAudioIds()).containsExactly(5);
        }

        /**
         * TC-GS-U-014 | P0 | Negative
         * Trace: FR-UM-011 §3 – "Tự động xóa sau khi hết hạn"
         *
         * <p>Precondition: session found in DB but expired 1 hour ago.
         * <p>Expected: Optional.empty() returned; repository.save() never called.
         */
        @Test
        @DisplayName("TC-GS-U-014 – update on expired session returns empty; save() never called")
        void tc_gs_u_014_expiredSession_returnsEmpty_saveNeverCalled() {
            String id = UUID.randomUUID().toString();
            TouristSession expired = TouristSession.builder()
                    .sessionId(id)
                    .languagePreference("vi")
                    .createdAt(Instant.now().minus(25, ChronoUnit.HOURS))
                    .expiresAt(Instant.now().minus(1, ChronoUnit.HOURS))
                    .build();
            when(sessionRepository.findById(id)).thenReturn(Optional.of(expired));

            Optional<TouristSessionResponse> result =
                    sessionService.updateSession(id, new UpdateSessionRequest("en", null, null));

            assertThat(result).isEmpty();
            verify(sessionRepository, never()).save(any());
        }

        /**
         * TC-GS-U-015 | P0 | Negative
         * Trace: FR-UM-011 §1 – update on non-existent session
         *
         * <p>Precondition: sessionId not present in repository.
         * <p>Expected: Optional.empty(); save() never called.
         */
        @Test
        @DisplayName("TC-GS-U-015 – update on unknown sessionId returns empty; save() never called")
        void tc_gs_u_015_unknownSessionId_returnsEmpty_saveNeverCalled() {
            String id = UUID.randomUUID().toString();
            when(sessionRepository.findById(id)).thenReturn(Optional.empty());

            Optional<TouristSessionResponse> result =
                    sessionService.updateSession(id, new UpdateSessionRequest("en", null, null));

            assertThat(result).isEmpty();
            verify(sessionRepository, never()).save(any());
        }

        /**
         * TC-GS-U-016 | P1 | Edge Case
         * Trace: FR-UM-011 §2 – partial update: only non-null fields are applied
         *
         * <p>Steps: request sets languagePreference="en" and playedAudioIds=[99];
         * viewedPoiIds=null (should remain [10,20]).
         * <p>Expected: language and playedAudioIds updated; viewedPoiIds unchanged.
         */
        @Test
        @DisplayName("TC-GS-U-016 – partial update writes only non-null fields; null fields are skipped")
        void tc_gs_u_016_partialUpdate_onlyNonNullFieldsWritten() {
            String id = UUID.randomUUID().toString();
            TouristSession entity = buildActiveSession(id);
            when(sessionRepository.findById(id)).thenReturn(Optional.of(entity));
            ArgumentCaptor<TouristSession> captor = ArgumentCaptor.forClass(TouristSession.class);
            when(sessionRepository.save(captor.capture())).thenReturn(entity);

            sessionService.updateSession(id, new UpdateSessionRequest("en", null, List.of(99)));

            TouristSession saved = captor.getValue();
            assertThat(saved.getLanguagePreference()).isEqualTo("en");
            assertThat(saved.getPlayedAudioIds()).containsExactly(99);
            assertThat(saved.getViewedPoiIds()).containsExactly(10, 20); // null → unchanged
        }
    }

    // ── Privacy guarantees ────────────────────────────────────────────────────

    @Nested
    @DisplayName("Privacy guarantees (FR-UM-011 §3)")
    class Privacy {

        /**
         * TC-GS-U-017 | P0 | Security / Privacy
         * Trace: FR-UM-011 §3 – "Không lưu bất kỳ thông tin nhận dạng cá nhân"
         *
         * <p>Expected: the persisted {@link TouristSession} document must not
         * declare any PII-bearing fields (email, fullName, phone, username,
         * ipAddress, deviceId).  This guards against accidental future additions.
         */
        @Test
        @DisplayName("TC-GS-U-017 – TouristSession document declares no PII-bearing fields")
        void tc_gs_u_017_noPiiFieldsOnDocument() {
            ArgumentCaptor<TouristSession> captor = ArgumentCaptor.forClass(TouristSession.class);
            when(sessionRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

            sessionService.createSession();

            Set<String> declaredFieldNames = Arrays.stream(
                            captor.getValue().getClass().getDeclaredFields())
                    .map(Field::getName)
                    .collect(Collectors.toSet());

            assertThat(declaredFieldNames)
                    .as("TouristSession must not store PII")
                    .doesNotContain("email", "fullName", "phone", "username", "ipAddress", "deviceId");
        }
    }
}
