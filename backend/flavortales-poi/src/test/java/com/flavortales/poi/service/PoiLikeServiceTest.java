package com.flavortales.poi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flavortales.common.exception.PoiNotFoundException;
import com.flavortales.notification.service.EmailService;
import com.flavortales.poi.mapper.PoiMapper;
import com.flavortales.poi.repository.PoiRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import org.mockito.ArgumentMatchers;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link PoiService#likePoi(Integer, String)} and
 * {@link PoiService#unlikePoi(Integer, String)}.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>User Story  : US-007 – Tourist likes a POI</li>
 *   <li>Requirement : FR-LM-007 §popularity – like / unlike counters</li>
 *   <li>AC
 *     <ul>
 *       <li>SC-1 (Happy)      – likes_count increments / decrements and cache is evicted</li>
 *       <li>SC-2 (Idempotent) – second like / first unlike is a no-op</li>
 *       <li>SC-3 (Negative)   – POI not found or inactive → PoiNotFoundException</li>
 *       <li>SC-4 (Edge)       – GREATEST prevents likes_count from going negative</li>
 *     </ul>
 *   </li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class PoiLikeServiceTest {

    // ── Constants ──────────────────────────────────────────────────────────────
    private static final Integer POI_ID     = 42;
    private static final String  SESSION_A  = "session-alice";
    private static final String  SESSION_B  = "session-bob";

    // ── Boundary config injected via @Value ────────────────────────────────────
    private static final double CENTER_LAT   = 21.028500;
    private static final double CENTER_LNG   = 105.854200;
    private static final double MAX_RADIUS_M = 5000.0;

    // ── Mocks ──────────────────────────────────────────────────────────────────
    @Mock private PoiRepository   poiRepository;
    @Mock private PoiCacheService  poiCacheService;
    @Mock private PoiMapper        poiMapper;
    @Mock private JdbcTemplate     jdbcTemplate;
    @Mock private EmailService     emailService;
    @Mock private ObjectMapper     objectMapper;

    @InjectMocks private PoiService poiService;

    @BeforeEach
    void injectConfig() {
        ReflectionTestUtils.setField(poiService, "boundaryCenterLat",  CENTER_LAT);
        ReflectionTestUtils.setField(poiService, "boundaryCenterLng",  CENTER_LNG);
        ReflectionTestUtils.setField(poiService, "boundaryMaxRadiusM", MAX_RADIUS_M);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /** Stubs the "POI exists and is active" check to return {@code exists}. */
    private void stubPoiExists(boolean exists) {
        doReturn(exists).when(jdbcTemplate).queryForObject(
                argThat(sql -> sql.contains("FROM poi WHERE")),
                eq(Boolean.class),
                eq(POI_ID));
    }

    /** Stubs the "session already liked this POI" check. */
    private void stubAlreadyLiked(boolean liked) {
        doReturn(liked).when(jdbcTemplate).queryForObject(
                argThat(sql -> sql.contains("FROM poi_likes WHERE")),
                eq(Boolean.class),
                eq(POI_ID), anyString());
    }

    /** Stubs the final SELECT likes_count query to return {@code count}. */
    private void stubLikesCount(int count) {
        doReturn(count).when(jdbcTemplate).queryForObject(
                argThat(sql -> sql.contains("likes_count FROM poi")),
                eq(Integer.class),
                eq(POI_ID));
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  likePoi
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * TC-S07-U-001 [P1][Happy]
     * First like by a session → INSERT into poi_likes, UPDATE likes_count + 1,
     * cache evicted, new count returned.
     */
    @Test
    @DisplayName("TC-S07-U-001 [P1][Happy] first like → INSERT, UPDATE, cache evict, returns new count")
    void likePoi_firstLike_insertsAndEvictsCacheAndReturnsCount() {
        stubPoiExists(true);
        stubAlreadyLiked(false);
        stubLikesCount(6);

        int result = poiService.likePoi(POI_ID, SESSION_A);

        assertThat(result).isEqualTo(6);
        verify(jdbcTemplate).update(
                ArgumentMatchers.<String>argThat(sql -> sql.contains("INSERT INTO poi_likes")),
                eq(POI_ID), eq(SESSION_A));
        verify(jdbcTemplate).update(
                ArgumentMatchers.<String>argThat(sql -> sql.contains("likes_count = likes_count + 1")),
                eq(POI_ID));
        verify(poiCacheService).evict(POI_ID);
        verify(poiCacheService).evictActivePoisList();
    }

    /**
     * TC-S07-U-002 [P1][Idempotent]
     * Session has already liked this POI → no INSERT/UPDATE, returns current count.
     */
    @Test
    @DisplayName("TC-S07-U-002 [P1][Idempotent] already liked → skip INSERT/UPDATE, return current count")
    void likePoi_alreadyLiked_skipsWriteAndReturnsCurrentCount() {
        stubPoiExists(true);
        stubAlreadyLiked(true);
        stubLikesCount(5);

        int result = poiService.likePoi(POI_ID, SESSION_A);

        assertThat(result).isEqualTo(5);
        verify(jdbcTemplate, never()).update(
                ArgumentMatchers.<String>argThat(sql -> sql.contains("INSERT INTO poi_likes")),
                any(), any());
        verify(jdbcTemplate, never()).update(
                ArgumentMatchers.<String>argThat(sql -> sql.contains("likes_count = likes_count + 1")),
                any(Object[].class));
        verify(poiCacheService, never()).evict(any());
    }

    /**
     * TC-S07-U-003 [P1][Negative]
     * POI does not exist or is inactive → throws PoiNotFoundException.
     */
    @Test
    @DisplayName("TC-S07-U-003 [P1][Negative] POI not found / inactive → PoiNotFoundException")
    void likePoi_poiNotFound_throwsPoiNotFoundException() {
        stubPoiExists(false);

        assertThatThrownBy(() -> poiService.likePoi(POI_ID, SESSION_A))
                .isInstanceOf(PoiNotFoundException.class)
                .hasMessageContaining(String.valueOf(POI_ID));

        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    /**
     * TC-S07-U-004 [P2][Edge]
     * Two different sessions can both like the same POI independently.
     */
    @Test
    @DisplayName("TC-S07-U-004 [P2][Edge] two distinct sessions each trigger an INSERT")
    void likePoi_twoDistinctSessions_eachInsertsIndependently() {
        stubPoiExists(true);
        // Neither session has liked yet
        doReturn(false).when(jdbcTemplate).queryForObject(
                argThat(sql -> sql.contains("FROM poi_likes WHERE")),
                eq(Boolean.class),
                eq(POI_ID), anyString());
        stubLikesCount(5);

        poiService.likePoi(POI_ID, SESSION_A);
        stubLikesCount(6);
        poiService.likePoi(POI_ID, SESSION_B);

        verify(jdbcTemplate, times(2)).update(
                argThat((String sql) -> sql.contains("INSERT INTO poi_likes")),
                any(Object[].class));
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  unlikePoi
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * TC-S07-U-005 [P1][Happy]
     * Session had liked the POI → DELETE from poi_likes, UPDATE with GREATEST,
     * cache evicted, updated count returned.
     */
    @Test
    @DisplayName("TC-S07-U-005 [P1][Happy] unlike → DELETE, UPDATE GREATEST, cache evict, returns new count")
    void unlikePoi_wasLiked_deletesAndEvictsCacheAndReturnsCount() {
        stubAlreadyLiked(true);
        stubLikesCount(4);

        int result = poiService.unlikePoi(POI_ID, SESSION_A);

        assertThat(result).isEqualTo(4);
        verify(jdbcTemplate).update(
                ArgumentMatchers.<String>argThat(sql -> sql.contains("DELETE FROM poi_likes")),
                eq(POI_ID), eq(SESSION_A));
        verify(jdbcTemplate).update(
                ArgumentMatchers.<String>argThat(sql -> sql.contains("GREATEST")),
                eq(POI_ID));
        verify(poiCacheService).evict(POI_ID);
        verify(poiCacheService).evictActivePoisList();
    }

    /**
     * TC-S07-U-006 [P1][Idempotent]
     * Session never liked the POI → no DELETE/UPDATE, returns current count.
     */
    @Test
    @DisplayName("TC-S07-U-006 [P1][Idempotent] never liked → skip DELETE/UPDATE, return current count")
    void unlikePoi_notLiked_skipsWriteAndReturnsCurrentCount() {
        stubAlreadyLiked(false);
        stubLikesCount(3);

        int result = poiService.unlikePoi(POI_ID, SESSION_A);

        assertThat(result).isEqualTo(3);
        verify(jdbcTemplate, never()).update(
                ArgumentMatchers.<String>argThat(sql -> sql.contains("DELETE FROM poi_likes")),
                any(), any());
        verify(poiCacheService, never()).evict(any());
    }

    /**
     * TC-S07-U-007 [P2][Edge]
     * likes_count is already 0 → GREATEST(likes_count - 1, 0) prevents it
     * from going negative (UPDATE is still issued but SQL guards the value).
     */
    @Test
    @DisplayName("TC-S07-U-007 [P2][Edge] likes_count = 0 → GREATEST prevents negative; UPDATE still issued")
    void unlikePoi_likesCountZero_usesGreatestToPreventNegative() {
        stubAlreadyLiked(true);
        stubLikesCount(0); // DB returns 0 after GREATEST(0-1,0)=0

        int result = poiService.unlikePoi(POI_ID, SESSION_A);

        assertThat(result).isEqualTo(0);
        // Verify GREATEST is in the UPDATE query
        verify(jdbcTemplate).update(
                ArgumentMatchers.<String>argThat(sql -> sql.contains("GREATEST")),
                eq(POI_ID));
    }
}
