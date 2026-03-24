package com.flavortales.location.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flavortales.common.exception.GlobalExceptionHandler;
import com.flavortales.location.dto.CreateTouristSessionResponse;
import com.flavortales.location.dto.TouristSessionResponse;
import com.flavortales.location.dto.UpdateSessionRequest;
import com.flavortales.location.service.TouristSessionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.hasItems;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-layer integration tests for {@link TouristSessionController}.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>Requirement : FR-UM-011 – Anonymous Tourist Session</li>
 *   <li>Use Case    : UC-10 – Xác định vị trí người dùng trên bản đồ</li>
 *   <li>User Story  : US-010 – Tourist accesses the app without registration</li>
 *   <li>Acceptance  : AC-GS-01 … AC-GS-11 (all criteria below)</li>
 * </ul>
 *
 * <p><b>Scope</b> – {@link WebMvcTest} loads only the web layer (controller +
 * exception handler).  {@link TouristSessionService} is replaced by a Mockito
 * stub, keeping tests fast and fully isolated from MongoDB.
 *
 * <p><b>Coverage matrix</b>
 * <pre>
 *  TC            Scenario                                            Priority  Type
 *  ──────────────────────────────────────────────────────────────────────────────────
 *  TC-GS-I-001   POST → 201 + sessionId + expiresAt                 P0        Happy
 *  TC-GS-I-002   POST × 2 → service called twice (independent)      P1        Edge
 *  TC-GS-I-003   GET valid → 200 + all session fields               P0        Happy
 *  TC-GS-I-004   GET expired/unknown → 404 + Vietnamese message     P0        Negative
 *  TC-GS-I-005   PATCH language → 200 + updated languagePreference  P0        Happy
 *  TC-GS-I-006   PATCH cache lists → 200 + updated list fields      P0        Happy
 *  TC-GS-I-007   PATCH all-null → 200 (no-op accepted)              P1        Edge
 *  TC-GS-I-008   PATCH expired/unknown → 404 + message              P0        Negative
 *  TC-GS-I-009   POST no Authorization header → 201 (public)        P0        Security
 *  TC-GS-I-010   GET no Authorization header → not 401 (public)     P0        Security
 *  TC-GS-I-011   PATCH no Authorization header → not 401 (public)   P0        Security
 * </pre>
 */
@WebMvcTest(TouristSessionController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
@DisplayName("TouristSessionController | FR-UM-011 / UC-10 / US-010")
class TouristSessionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TouristSessionService sessionService;

    // ── Shared test data ──────────────────────────────────────────────────────

    private static final String SESSION_ID = "550e8400-e29b-41d4-a716-446655440000";
    private static final Instant CREATED_AT = Instant.parse("2026-03-24T08:00:00Z");
    private static final Instant EXPIRES_AT  = CREATED_AT.plus(24, ChronoUnit.HOURS);

    private CreateTouristSessionResponse createStub() {
        return new CreateTouristSessionResponse(SESSION_ID, EXPIRES_AT);
    }

    private TouristSessionResponse fullSessionStub(String language) {
        return new TouristSessionResponse(
                SESSION_ID, language,
                List.of(10, 20), List.of(5),
                CREATED_AT, EXPIRES_AT);
    }

    // ── POST /api/tourist/sessions ────────────────────────────────────────────

    @Nested
    @DisplayName("POST /api/tourist/sessions")
    class CreateSession {

        /**
         * TC-GS-I-001 | P0 | Happy Path
         * Trace: FR-UM-011 §1 – "Tự động tạo session ID duy nhất khi Tourist truy cập lần đầu"
         * AC-GS-01: System responds with 201, a non-null sessionId, and a non-null expiresAt.
         *
         * <p>Precondition: service returns a valid {@link CreateTouristSessionResponse}.
         * <p>Steps: POST /api/tourist/sessions (no body, no auth header).
         * <p>Expected: HTTP 201, success=true, message in Vietnamese, sessionId and expiresAt present.
         */
        @Test
        @DisplayName("TC-GS-I-001 – POST creates session → 201 with sessionId and expiresAt")
        void tc_gs_i_001_postCreatesSession_returns201WithSessionIdAndExpiry() throws Exception {
            when(sessionService.createSession()).thenReturn(createStub());

            mockMvc.perform(post("/api/tourist/sessions"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Phiên ẩn danh đã được tạo"))
                    .andExpect(jsonPath("$.data.sessionId").value(SESSION_ID))
                    .andExpect(jsonPath("$.data.expiresAt").isNotEmpty());
        }

        /**
         * TC-GS-I-002 | P1 | Edge Case
         * Trace: FR-UM-011 §3 – "Session ID ngẫu nhiên, không thể dự đoán"
         * AC-GS-02: Each POST request triggers an independent session creation.
         *
         * <p>Steps: POST twice; service is expected to be called once per request.
         * <p>Expected: service.createSession() invoked exactly 2 times.
         */
        @Test
        @DisplayName("TC-GS-I-002 – two POST calls each delegate to service independently")
        void tc_gs_i_002_twoPostCalls_delegateToServiceTwice() throws Exception {
            when(sessionService.createSession())
                    .thenReturn(new CreateTouristSessionResponse(UUID.randomUUID().toString(), EXPIRES_AT))
                    .thenReturn(new CreateTouristSessionResponse(UUID.randomUUID().toString(), EXPIRES_AT));

            mockMvc.perform(post("/api/tourist/sessions")).andExpect(status().isCreated());
            mockMvc.perform(post("/api/tourist/sessions")).andExpect(status().isCreated());

            verify(sessionService, times(2)).createSession();
        }
    }

    // ── GET /api/tourist/sessions/{sessionId} ─────────────────────────────────

    @Nested
    @DisplayName("GET /api/tourist/sessions/{sessionId}")
    class GetSession {

        /**
         * TC-GS-I-003 | P0 | Happy Path
         * Trace: FR-UM-011 §2 – full session data returned to the client
         * AC-GS-03: Valid, non-expired session returns 200 with all cache fields.
         *
         * <p>Precondition: service returns a valid {@link TouristSessionResponse}.
         * <p>Expected: HTTP 200, success=true, all data fields in response.
         */
        @Test
        @DisplayName("TC-GS-I-003 – GET valid session → 200 with all session fields")
        void tc_gs_i_003_getValidSession_returns200WithAllFields() throws Exception {
            when(sessionService.getSession(SESSION_ID))
                    .thenReturn(Optional.of(fullSessionStub("vi")));

            mockMvc.perform(get("/api/tourist/sessions/{id}", SESSION_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Phiên hợp lệ"))
                    .andExpect(jsonPath("$.data.sessionId").value(SESSION_ID))
                    .andExpect(jsonPath("$.data.languagePreference").value("vi"))
                    .andExpect(jsonPath("$.data.viewedPoiIds", hasItems(10, 20)))
                    .andExpect(jsonPath("$.data.playedAudioIds", hasItems(5)))
                    .andExpect(jsonPath("$.data.createdAt").isNotEmpty())
                    .andExpect(jsonPath("$.data.expiresAt").isNotEmpty());
        }

        /**
         * TC-GS-I-004 | P0 | Negative
         * Trace: FR-UM-011 §3 – "Tự động xóa sau khi hết hạn"
         * AC-GS-04: Expired or unknown session returns 404 with Vietnamese error message.
         *
         * <p>Precondition: service returns Optional.empty() (session not found or expired).
         * <p>Expected: HTTP 404, success=false, error message in Vietnamese.
         */
        @Test
        @DisplayName("TC-GS-I-004 – GET expired or unknown session → 404 with Vietnamese error message")
        void tc_gs_i_004_getExpiredOrUnknownSession_returns404WithMessage() throws Exception {
            when(sessionService.getSession(SESSION_ID)).thenReturn(Optional.empty());

            mockMvc.perform(get("/api/tourist/sessions/{id}", SESSION_ID))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Phiên không tồn tại hoặc đã hết hạn"));
        }
    }

    // ── PATCH /api/tourist/sessions/{sessionId} ───────────────────────────────

    @Nested
    @DisplayName("PATCH /api/tourist/sessions/{sessionId}")
    class UpdateSession {

        /**
         * TC-GS-I-005 | P0 | Happy Path
         * Trace: FR-UM-011 §2 – "Tùy chọn ngôn ngữ đã chọn"
         * AC-GS-05: PATCH with languagePreference updates the field and returns 200.
         *
         * <p>Steps: PATCH with body {"languagePreference": "en"}.
         * <p>Expected: HTTP 200, success=true, data.languagePreference="en".
         */
        @Test
        @DisplayName("TC-GS-I-005 – PATCH languagePreference → 200 with updated language in response")
        void tc_gs_i_005_patchLanguage_returns200WithUpdatedLanguage() throws Exception {
            when(sessionService.updateSession(eq(SESSION_ID), any(UpdateSessionRequest.class)))
                    .thenReturn(Optional.of(fullSessionStub("en")));

            String body = objectMapper.writeValueAsString(
                    new UpdateSessionRequest("en", null, null));

            mockMvc.perform(patch("/api/tourist/sessions/{id}", SESSION_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Phiên đã cập nhật"))
                    .andExpect(jsonPath("$.data.languagePreference").value("en"));
        }

        /**
         * TC-GS-I-006 | P0 | Happy Path
         * Trace: FR-UM-011 §2 – "Danh sách POI đã xem", "Danh sách audio đã phát"
         * AC-GS-06: PATCH with cache lists updates both fields and returns 200.
         *
         * <p>Steps: PATCH with viewedPoiIds=[1,2,3] and playedAudioIds=[10].
         * <p>Expected: HTTP 200, data.viewedPoiIds and data.playedAudioIds reflected.
         */
        @Test
        @DisplayName("TC-GS-I-006 – PATCH cache lists → 200 with updated viewedPoiIds and playedAudioIds")
        void tc_gs_i_006_patchCacheLists_returns200WithUpdatedLists() throws Exception {
            TouristSessionResponse updated = new TouristSessionResponse(
                    SESSION_ID, "vi",
                    List.of(1, 2, 3), List.of(10),
                    CREATED_AT, EXPIRES_AT);
            when(sessionService.updateSession(eq(SESSION_ID), any(UpdateSessionRequest.class)))
                    .thenReturn(Optional.of(updated));

            String body = objectMapper.writeValueAsString(
                    new UpdateSessionRequest(null, List.of(1, 2, 3), List.of(10)));

            mockMvc.perform(patch("/api/tourist/sessions/{id}", SESSION_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.viewedPoiIds", hasItems(1, 2, 3)))
                    .andExpect(jsonPath("$.data.playedAudioIds", hasItems(10)));
        }

        /**
         * TC-GS-I-007 | P1 | Edge Case
         * Trace: FR-UM-011 §2 – null = no-op (partial-update contract)
         * AC-GS-07: Server accepts a body with all-null fields without error.
         *
         * <p>Steps: PATCH with {"languagePreference":null,"viewedPoiIds":null,"playedAudioIds":null}.
         * <p>Expected: HTTP 200, success=true (no-op is a valid operation).
         */
        @Test
        @DisplayName("TC-GS-I-007 – PATCH with all-null body → 200 (no-op accepted by server)")
        void tc_gs_i_007_patchAllNull_returns200() throws Exception {
            when(sessionService.updateSession(eq(SESSION_ID), any(UpdateSessionRequest.class)))
                    .thenReturn(Optional.of(fullSessionStub("vi")));

            String body = objectMapper.writeValueAsString(
                    new UpdateSessionRequest(null, null, null));

            mockMvc.perform(patch("/api/tourist/sessions/{id}", SESSION_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        /**
         * TC-GS-I-008 | P0 | Negative
         * Trace: FR-UM-011 §3 – "Tự động xóa sau khi hết hạn"
         * AC-GS-08: PATCH on expired or unknown session returns 404.
         *
         * <p>Precondition: service returns Optional.empty().
         * <p>Expected: HTTP 404, success=false, Vietnamese error message.
         */
        @Test
        @DisplayName("TC-GS-I-008 – PATCH expired or unknown session → 404 with Vietnamese error message")
        void tc_gs_i_008_patchExpiredOrUnknownSession_returns404() throws Exception {
            when(sessionService.updateSession(eq(SESSION_ID), any(UpdateSessionRequest.class)))
                    .thenReturn(Optional.empty());

            String body = objectMapper.writeValueAsString(
                    new UpdateSessionRequest("en", null, null));

            mockMvc.perform(patch("/api/tourist/sessions/{id}", SESSION_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Phiên không tồn tại hoặc đã hết hạn"));
        }
    }

    // ── Public access – no JWT required ──────────────────────────────────────

    @Nested
    @DisplayName("Public access – no JWT required (FR-UM-011 §3 + SecurityConfig permitAll)")
    class PublicAccess {

        /**
         * TC-GS-I-009 | P0 | Security
         * Trace: FR-UM-011 §3 – "Không theo dõi Tourist giữa các phiên khác nhau"
         *        SecurityConfig – "/api/tourist/**" permitAll()
         * AC-GS-09: POST without Authorization header must not return 401.
         *
         * <p>Note: Spring Security filter is disabled in {@code @WebMvcTest} slices.
         * This test verifies the controller layer does not itself require authentication.
         */
        @Test
        @DisplayName("TC-GS-I-009 – POST without Authorization header → 201 (public endpoint)")
        void tc_gs_i_009_postWithoutAuthHeader_succeeds() throws Exception {
            when(sessionService.createSession()).thenReturn(createStub());

            mockMvc.perform(post("/api/tourist/sessions")
                            /* no Authorization header */)
                    .andExpect(status().isCreated());
        }

        /**
         * TC-GS-I-010 | P0 | Security
         * Trace: SecurityConfig – "/api/tourist/**" permitAll()
         * AC-GS-10: GET without Authorization header must not return 401.
         *
         * <p>Expected: response is 404 (session not found), not 401 (unauthorized).
         */
        @Test
        @DisplayName("TC-GS-I-010 – GET without Authorization header → 404 not 401 (public endpoint)")
        void tc_gs_i_010_getWithoutAuthHeader_notRejectedWith401() throws Exception {
            when(sessionService.getSession(SESSION_ID)).thenReturn(Optional.empty());

            mockMvc.perform(get("/api/tourist/sessions/{id}", SESSION_ID)
                            /* no Authorization header */)
                    .andExpect(status().isNotFound()); // 404, not 401
        }

        /**
         * TC-GS-I-011 | P0 | Security
         * Trace: SecurityConfig – "/api/tourist/**" permitAll()
         * AC-GS-11: PATCH without Authorization header must not return 401.
         *
         * <p>Expected: response is 404 (session not found), not 401 (unauthorized).
         */
        @Test
        @DisplayName("TC-GS-I-011 – PATCH without Authorization header → 404 not 401 (public endpoint)")
        void tc_gs_i_011_patchWithoutAuthHeader_notRejectedWith401() throws Exception {
            when(sessionService.updateSession(eq(SESSION_ID), any()))
                    .thenReturn(Optional.empty());

            mockMvc.perform(patch("/api/tourist/sessions/{id}", SESSION_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"languagePreference\":null}")
                            /* no Authorization header */)
                    .andExpect(status().isNotFound()); // 404, not 401
        }
    }
}
