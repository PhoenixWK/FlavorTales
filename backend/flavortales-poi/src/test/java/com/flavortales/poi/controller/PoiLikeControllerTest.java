package com.flavortales.poi.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flavortales.common.exception.GlobalExceptionHandler;
import com.flavortales.common.exception.PoiNotFoundException;
import com.flavortales.poi.service.PoiService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller-layer integration (slice) tests for
 * {@link PoiController#likePoi(Integer, String)} and
 * {@link PoiController#unlikePoi(Integer, String)}.
 *
 * <p>Uses {@code @WebMvcTest} so only the Web MVC layer is loaded.
 * {@link GlobalExceptionHandler} is imported so domain exceptions are mapped to
 * the correct HTTP status codes (e.g. {@link PoiNotFoundException} → 404).
 *
 * <p>A slim {@link LikeSecurityConfig} is included to mirror the production rule that
 * {@code POST /api/poi/*&#47;like} and {@code DELETE /api/poi/*&#47;like} are public
 * (no JWT required) – matching {@code SecurityConfig#securityFilterChain} in
 * {@code flavortales-auth}.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>User Story  : US-007 – Tourist likes a POI</li>
 *   <li>Requirement : FR-LM-007 §popularity – like / unlike via X-Session-Id</li>
 *   <li>AC
 *     <ul>
 *       <li>SC-1 (Happy)    – 200 with success=true and updated count</li>
 *       <li>SC-2 (Negative) – missing or blank X-Session-Id → 400</li>
 *       <li>SC-3 (Negative) – unknown poiId → 404</li>
 *       <li>SC-4 (Access)   – anonymous user (no JWT) → 200 (public endpoint)</li>
 *     </ul>
 *   </li>
 * </ul>
 */
@WebMvcTest(PoiController.class)
@Import({ GlobalExceptionHandler.class, PoiLikeControllerTest.LikeSecurityConfig.class })
class PoiLikeControllerTest {

    // ── constants ──────────────────────────────────────────────────────────────
    private static final int    POI_ID     = 1;
    private static final String SESSION_ID = "session-tourist-001";

    // ── Slim security config ───────────────────────────────────────────────────

    /**
     * Replaces the full {@code SecurityFilterChain} for this test slice.
     *
     * <p>Permits POST and DELETE on the like/unlike paths (mirroring the
     * production {@code permitAll()} rule) while disabling CSRF so test
     * requests do not need `.with(csrf())`.
     */
    @TestConfiguration
    static class LikeSecurityConfig {
        @Bean
        public SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers(HttpMethod.POST, "/api/poi/*/like").permitAll()
                    .requestMatchers(HttpMethod.DELETE, "/api/poi/*/like").permitAll()
                    .anyRequest().authenticated()
                );
            return http.build();
        }
    }

    // ── Infrastructure ─────────────────────────────────────────────────────────
    @Autowired private MockMvc      mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean  private PoiService   poiService;

    // ══════════════════════════════════════════════════════════════════════════
    //  POST /{poiId}/like
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * TC-S07-I-001 [P1][Happy]
     * POST /api/poi/1/like with a valid X-Session-Id header → 200 OK,
     * success=true, data = updated likes count.
     */
    @Test
    @DisplayName("TC-S07-I-001 [P1][Happy] POST like with session header → 200, success=true, data=5")
    void tc_s07_i001_likePoi_validSession_returns200WithCount() throws Exception {
        when(poiService.likePoi(eq(POI_ID), eq(SESSION_ID))).thenReturn(5);

        mockMvc.perform(post("/api/poi/{id}/like", POI_ID)
                        .header("X-Session-Id", SESSION_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(5));
    }

    /**
     * TC-S07-I-002 [P1][Negative]
     * POST /api/poi/1/like without the X-Session-Id header → 400 Bad Request.
     */
    @Test
    @DisplayName("TC-S07-I-002 [P1][Negative] POST like without session header → 400")
    void tc_s07_i002_likePoi_missingSession_returns400() throws Exception {
        mockMvc.perform(post("/api/poi/{id}/like", POI_ID))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    /**
     * TC-S07-I-003 [P1][Negative]
     * POST /api/poi/1/like with a blank X-Session-Id header → 400 Bad Request.
     */
    @Test
    @DisplayName("TC-S07-I-003 [P1][Negative] POST like with blank session header → 400")
    void tc_s07_i003_likePoi_blankSession_returns400() throws Exception {
        mockMvc.perform(post("/api/poi/{id}/like", POI_ID)
                        .header("X-Session-Id", "   "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    /**
     * TC-S07-I-004 [P1][Negative]
     * POST /api/poi/999/like where POI does not exist → 404 Not Found
     * (PoiNotFoundException mapped by GlobalExceptionHandler).
     */
    @Test
    @DisplayName("TC-S07-I-004 [P1][Negative] POST like for non-existent POI → 404")
    void tc_s07_i004_likePoi_unknownPoi_returns404() throws Exception {
        int unknownPoiId = 999;
        when(poiService.likePoi(eq(unknownPoiId), anyString()))
                .thenThrow(new PoiNotFoundException("POI not found: " + unknownPoiId));

        mockMvc.perform(post("/api/poi/{id}/like", unknownPoiId)
                        .header("X-Session-Id", SESSION_ID))
                .andExpect(status().isNotFound());
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  DELETE /{poiId}/like
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * TC-S07-I-005 [P1][Happy]
     * DELETE /api/poi/1/like with a valid X-Session-Id header → 200 OK,
     * success=true, data = updated likes count.
     */
    @Test
    @DisplayName("TC-S07-I-005 [P1][Happy] DELETE unlike with session header → 200, success=true, data=4")
    void tc_s07_i005_unlikePoi_validSession_returns200WithCount() throws Exception {
        when(poiService.unlikePoi(eq(POI_ID), eq(SESSION_ID))).thenReturn(4);

        mockMvc.perform(delete("/api/poi/{id}/like", POI_ID)
                        .header("X-Session-Id", SESSION_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(4));
    }

    /**
     * TC-S07-I-006 [P1][Negative]
     * DELETE /api/poi/1/like without the X-Session-Id header → 400 Bad Request.
     */
    @Test
    @DisplayName("TC-S07-I-006 [P1][Negative] DELETE unlike without session header → 400")
    void tc_s07_i006_unlikePoi_missingSession_returns400() throws Exception {
        mockMvc.perform(delete("/api/poi/{id}/like", POI_ID))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    /**
     * TC-S07-I-007 [P2][Access]
     * Anonymous user (no JWT) can POST /api/poi/1/like and receives 200 OK.
     * Verifies that the endpoint is public (no JWT required) per the production
     * security rule: {@code .requestMatchers(HttpMethod.POST, "/api/poi/{id}/like").permitAll()}.
     */
    @Test
    @WithAnonymousUser
    @DisplayName("TC-S07-I-007 [P2][Access] Anonymous user POST like → 200 (public endpoint)")
    void tc_s07_i007_likePoi_anonymousUser_returns200() throws Exception {
        when(poiService.likePoi(eq(POI_ID), eq(SESSION_ID))).thenReturn(1);

        mockMvc.perform(post("/api/poi/{id}/like", POI_ID)
                        .header("X-Session-Id", SESSION_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
