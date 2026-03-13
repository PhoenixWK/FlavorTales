package com.flavortales.poi.service;

import com.flavortales.common.exception.PoiNotFoundException;
import com.flavortales.common.exception.UserNotFoundException;
import com.flavortales.notification.service.EmailService;
import com.flavortales.poi.entity.Poi;
import com.flavortales.poi.entity.PoiStatus;
import com.flavortales.poi.mapper.PoiMapper;
import com.flavortales.poi.repository.PoiRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link PoiService#deletePoi(Integer, String, boolean)}.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>User Story  : US-021 – Vendor xóa POI</li>
 *   <li>Use Case    : UC-021 – Delete POI</li>
 *   <li>Requirement : FR-PM-DEL – Delete POI (soft and hard)</li>
 *   <li>SRS         : SRS-POI-003 – Vendor có thể xóa POI do mình sở hữu</li>
 *   <li>AC          : AC-021
 *     <ul>
 *       <li>Scenario 1 (Basic Flow)      – xóa thành công và POI không còn trên bản đồ</li>
 *       <li>Scenario 2 (A1)             – vendor hủy thao tác → không có thay đổi</li>
 *       <li>Scenario 3 (E1)             – lỗi hệ thống → trạng thái POI không thay đổi</li>
 *     </ul>
 *   </li>
 * </ul>
 *
 * <p><b>Test categories covered</b>: happy path, negative, edge case.
 */
@ExtendWith(MockitoExtension.class)
class PoiDeleteServiceTest {

    // ── Boundary config – mirrors backend/flavortales-app/src/main/resources/poi.yml ──
    private static final double CENTER_LAT   = 21.028500;
    private static final double CENTER_LNG   = 105.854200;
    private static final double MAX_RADIUS_M = 5_000.0;

    // ── Shared test data ──────────────────────────────────────────────────────
    private static final String  VENDOR_EMAIL  = "vendor@flavortales.vn";
    private static final int     VENDOR_ID     = 1;
    private static final int     OTHER_VENDOR  = 99;
    private static final int     POI_ID        = 7;

    // ── Mocks ─────────────────────────────────────────────────────────────────
    @Mock private PoiRepository   poiRepository;
    @Mock private PoiCacheService poiCacheService;
    @Mock private PoiMapper       poiMapper;
    @Mock private JdbcTemplate    jdbcTemplate;
    @Mock private EmailService    emailService;

    @InjectMocks private PoiService poiService;

    @BeforeEach
    void injectBoundaryConfig() {
        ReflectionTestUtils.setField(poiService, "boundaryCenterLat", CENTER_LAT);
        ReflectionTestUtils.setField(poiService, "boundaryCenterLng", CENTER_LNG);
        ReflectionTestUtils.setField(poiService, "boundaryMaxRadiusM", MAX_RADIUS_M);
    }

    // ── Test-data helpers ─────────────────────────────────────────────────────

    /** Returns a {@link Poi} owned by {@link #VENDOR_ID}. */
    private Poi ownedPoi() {
        return Poi.builder()
                .poiId(POI_ID)
                .vendorId(VENDOR_ID)
                .name("Bánh Mì Xíu Mại")
                .latitude(BigDecimal.valueOf(21.028700))
                .longitude(BigDecimal.valueOf(105.854300))
                .radius(BigDecimal.valueOf(50.0))
                .status(PoiStatus.active)
                .build();
    }

    /** Returns a {@link Poi} owned by a different vendor (ownership test). */
    private Poi foreignPoi() {
        return Poi.builder()
                .poiId(POI_ID)
                .vendorId(OTHER_VENDOR)
                .name("Phở Ngoại Lai")
                .latitude(BigDecimal.valueOf(21.028700))
                .longitude(BigDecimal.valueOf(105.854300))
                .radius(BigDecimal.valueOf(50.0))
                .status(PoiStatus.active)
                .build();
    }

    /** Stubs the vendor email → id resolution query. */
    private void stubVendorFound() {
        when(jdbcTemplate.queryForObject(
                eq("SELECT user_id FROM user WHERE email = ?"),
                eq(Integer.class),
                eq(VENDOR_EMAIL)
        )).thenReturn(VENDOR_ID);
    }

    /** Stubs the vendor email resolution to throw {@link EmptyResultDataAccessException}. */
    private void stubVendorNotFound() {
        when(jdbcTemplate.queryForObject(
                eq("SELECT user_id FROM user WHERE email = ?"),
                eq(Integer.class),
                eq(VENDOR_EMAIL)
        )).thenThrow(new EmptyResultDataAccessException(1));
    }

    // =========================================================================
    // TC-U-050 to TC-U-051 – Basic Flow (Scenario 1): Soft delete & Hard delete
    // =========================================================================

    /**
     * TC-U-050 | Priority: P1 | Type: Happy path
     * Traces to: AC-021 Scenario 1 – vendor xóa mềm POI thành công
     *
     * <p>Precondition: POI with {@code POI_ID} exists and is owned by the authenticated vendor.
     *
     * <p>Steps:
     * <ol>
     *   <li>Stub vendor + POI lookup to return an owned POI.</li>
     *   <li>Call {@code deletePoi(POI_ID, VENDOR_EMAIL, false)} (soft delete).</li>
     * </ol>
     *
     * <p>Expected:
     * <ul>
     *   <li>POI status is set to {@link PoiStatus#deleted}.</li>
     *   <li>{@code deletedAt} is timestamped (not null).</li>
     *   <li>Shop row is unlinked ({@code poi_id = NULL}).</li>
     *   <li>{@code poiRepository.save()} is called (entity updated, not removed).</li>
     *   <li>Cache entries for this POI and the active list are evicted.</li>
     * </ul>
     */
    @Test
    @DisplayName("TC-U-050 [P1][Happy] Soft delete → status=deleted, deletedAt stamped, shop unlinked, cache evicted")
    void deletePoi_softDelete_marksDeletedUnlinksShopAndEvictsCache() {
        // Arrange
        stubVendorFound();
        Poi poi = ownedPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        when(poiRepository.save(any(Poi.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        assertThatNoException().isThrownBy(() -> poiService.deletePoi(POI_ID, VENDOR_EMAIL, false));

        // Assert – status and timestamp captured
        ArgumentCaptor<Poi> saved = ArgumentCaptor.forClass(Poi.class);
        verify(poiRepository).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo(PoiStatus.deleted);
        assertThat(saved.getValue().getDeletedAt()).isNotNull();

        // Assert – shop unlinked (shop data preserved, only foreign-key cleared)
        verify(jdbcTemplate).update(
                eq("UPDATE shop SET poi_id = NULL WHERE poi_id = ?"),
                eq(POI_ID)
        );

        // Assert – cache evicted
        verify(poiCacheService).evict(POI_ID);
        verify(poiCacheService).evictActivePoisList();

        // Assert – hard-delete path NOT taken
        verify(poiRepository, never()).delete(any(Poi.class));
    }

    /**
     * TC-U-051 | Priority: P1 | Type: Happy path
     * Traces to: AC-021 Scenario 1 – vendor xóa cứng POI vĩnh viễn
     *
     * <p>Precondition: same as TC-U-050 but {@code hardDelete = true}.
     *
     * <p>Steps:
     * <ol>
     *   <li>Stub vendor + POI lookup to return an owned POI.</li>
     *   <li>Call {@code deletePoi(POI_ID, VENDOR_EMAIL, true)} (hard delete).</li>
     * </ol>
     *
     * <p>Expected:
     * <ul>
     *   <li>{@code poiRepository.delete(poi)} is called (permanent removal).</li>
     *   <li>Shop row is unlinked before deletion.</li>
     *   <li>{@code poiRepository.save()} is NOT called.</li>
     *   <li>Cache entries evicted.</li>
     * </ul>
     */
    @Test
    @DisplayName("TC-U-051 [P1][Happy] Hard delete → poiRepository.delete() called, row permanently removed")
    void deletePoi_hardDelete_permanentlyRemovesPoiAndEvictsCache() {
        // Arrange
        stubVendorFound();
        Poi poi = ownedPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));

        // Act
        assertThatNoException().isThrownBy(() -> poiService.deletePoi(POI_ID, VENDOR_EMAIL, true));

        // Assert – permanent removal
        verify(poiRepository).delete(poi);

        // Assert – save NOT called (entity not updated, just deleted)
        verify(poiRepository, never()).save(any(Poi.class));

        // Assert – shop unlinked first
        verify(jdbcTemplate).update(
                eq("UPDATE shop SET poi_id = NULL WHERE poi_id = ?"),
                eq(POI_ID)
        );

        // Assert – cache evicted
        verify(poiCacheService).evict(POI_ID);
        verify(poiCacheService).evictActivePoisList();
    }

    // =========================================================================
    // TC-U-052 to TC-U-054 – Exception Flows (Scenario 3 / E1)
    // =========================================================================

    /**
     * TC-U-052 | Priority: P1 | Type: Negative
     * Traces to: AC-021 Scenario 3 (E1) – POI không tồn tại
     *
     * <p>Precondition: no POI with {@code POI_ID} exists in the repository.
     *
     * <p>Steps: call {@code deletePoi(POI_ID, VENDOR_EMAIL, false)}.
     *
     * <p>Expected: {@link PoiNotFoundException} thrown, no DB writes or cache evictions occur.
     */
    @Test
    @DisplayName("TC-U-052 [P1][Negative] POI not found → PoiNotFoundException, no DB or cache changes")
    void deletePoi_poiNotFound_throwsPoiNotFoundException() {
        // Arrange
        stubVendorFound();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> poiService.deletePoi(POI_ID, VENDOR_EMAIL, false))
                .isInstanceOf(PoiNotFoundException.class)
                .hasMessageContaining(String.valueOf(POI_ID));

        // No cache side-effects on failure
        verifyNoInteractions(poiCacheService);
        verify(poiRepository, never()).save(any());
        verify(poiRepository, never()).delete(any());
    }

    /**
     * TC-U-053 | Priority: P1 | Type: Negative
     * Traces to: AC-021 Scenario 3 (E1) – vendor không phải chủ sở hữu POI
     *
     * <p>Precondition: POI exists but its {@code vendorId} differs from the authenticated vendor.
     *
     * <p>Steps: call {@code deletePoi(POI_ID, VENDOR_EMAIL, false)} where POI is owned by another vendor.
     *
     * <p>Expected: {@link IllegalArgumentException} thrown with ownership message;
     * no shop update, no cache change, no POI save/delete.
     */
    @Test
    @DisplayName("TC-U-053 [P1][Negative] Vendor does not own POI → IllegalArgumentException, no changes")
    void deletePoi_vendorDoesNotOwnPoi_throwsIllegalArgumentException() {
        // Arrange
        stubVendorFound();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(foreignPoi()));

        // Act & Assert
        assertThatThrownBy(() -> poiService.deletePoi(POI_ID, VENDOR_EMAIL, false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("do not own");

        // No side-effects allowed after ownership failure
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
        verifyNoInteractions(poiCacheService);
        verify(poiRepository, never()).save(any());
        verify(poiRepository, never()).delete(any());
    }

    /**
     * TC-U-054 | Priority: P1 | Type: Negative
     * Traces to: AC-021 Scenario 3 (E1) – vendor email không tồn tại
     *
     * <p>Precondition: the email supplied to the method does not match any user row.
     *
     * <p>Steps: call {@code deletePoi(POI_ID, VENDOR_EMAIL, false)} when the vendor is unknown.
     *
     * <p>Expected: {@link UserNotFoundException} thrown before any POI lookup occurs.
     */
    @Test
    @DisplayName("TC-U-054 [P1][Negative] Unknown vendor email → UserNotFoundException")
    void deletePoi_unknownVendorEmail_throwsUserNotFoundException() {
        // Arrange
        stubVendorNotFound();

        // Act & Assert
        assertThatThrownBy(() -> poiService.deletePoi(POI_ID, VENDOR_EMAIL, false))
                .isInstanceOf(UserNotFoundException.class);

        // POI lookup never reached
        verify(poiRepository, never()).findById(anyInt());
        verifyNoInteractions(poiCacheService);
    }

    // =========================================================================
    // TC-U-055 – Alternative Flow A1: POI with no linked shop
    // =========================================================================

    /**
     * TC-U-055 | Priority: P2 | Type: Happy path (edge data)
     * Traces to: AC-021 Scenario 1 – POI không liên kết gian hàng vẫn xóa được
     *
     * <p>Precondition: POI exists and is owned by vendor, but no shop has {@code poi_id} pointing to it.
     *
     * <p>Steps: call {@code deletePoi(POI_ID, VENDOR_EMAIL, false)}.
     *
     * <p>Expected: the shop-unlink UPDATE is still executed (safe no-op on DB side),
     * and the soft delete completes without error.
     */
    @Test
    @DisplayName("TC-U-055 [P2][Happy] POI with no linked shop → delete still completes, shop UPDATE is safe no-op")
    void deletePoi_noLinkedShop_softDeleteSucceeds() {
        // Arrange
        stubVendorFound();
        Poi poi = ownedPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        when(poiRepository.save(any(Poi.class))).thenAnswer(inv -> inv.getArgument(0));
        // jdbcTemplate.update just returns 0 rows affected — not an error
        when(jdbcTemplate.update(eq("UPDATE shop SET poi_id = NULL WHERE poi_id = ?"), eq(POI_ID)))
                .thenReturn(0);

        // Act
        assertThatNoException().isThrownBy(() -> poiService.deletePoi(POI_ID, VENDOR_EMAIL, false));

        // Assert – unlink attempt was still made
        verify(jdbcTemplate).update(
                eq("UPDATE shop SET poi_id = NULL WHERE poi_id = ?"),
                eq(POI_ID)
        );
    }

    // =========================================================================
    // TC-U-056 to TC-U-057 – Soft-delete correctness (edge assertions)
    // =========================================================================

    /**
     * TC-U-056 | Priority: P2 | Type: Edge case
     * Traces to: AC-021 Scenario 1 – trạng thái phải là 'deleted', không phải 'inactive'
     *
     * <p>Precondition: same as TC-U-050.
     *
     * <p>Expected: {@code poi.getStatus()} equals exactly {@link PoiStatus#deleted},
     * distinguishing soft-delete from a simple deactivation.
     */
    @Test
    @DisplayName("TC-U-056 [P2][Edge] Soft delete → status is 'deleted', NOT 'inactive'")
    void deletePoi_softDelete_statusIsDeletedNotInactive() {
        // Arrange
        stubVendorFound();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(ownedPoi()));
        when(poiRepository.save(any(Poi.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        poiService.deletePoi(POI_ID, VENDOR_EMAIL, false);

        // Assert
        ArgumentCaptor<Poi> captor = ArgumentCaptor.forClass(Poi.class);
        verify(poiRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus())
                .isEqualTo(PoiStatus.deleted)
                .isNotEqualTo(PoiStatus.inactive);
    }

    /**
     * TC-U-057 | Priority: P2 | Type: Edge case
     * Traces to: AC-021 Scenario 1 – deletedAt phải được ghi nhận thời điểm xóa
     *
     * <p>Precondition: POI's {@code deletedAt} is null before deletion.
     *
     * <p>Expected: after soft delete, {@code deletedAt} is a non-null timestamp
     * that is not in the future relative to the test execution time.
     */
    @Test
    @DisplayName("TC-U-057 [P2][Edge] Soft delete → deletedAt is set and is not in the future")
    void deletePoi_softDelete_deletedAtIsRecentTimestamp() {
        // Arrange
        stubVendorFound();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(ownedPoi()));
        when(poiRepository.save(any(Poi.class))).thenAnswer(inv -> inv.getArgument(0));

        java.time.LocalDateTime before = java.time.LocalDateTime.now().minusSeconds(1);

        // Act
        poiService.deletePoi(POI_ID, VENDOR_EMAIL, false);

        // Assert
        ArgumentCaptor<Poi> captor = ArgumentCaptor.forClass(Poi.class);
        verify(poiRepository).save(captor.capture());
        assertThat(captor.getValue().getDeletedAt())
                .isNotNull()
                .isAfter(before)
                .isBeforeOrEqualTo(java.time.LocalDateTime.now());
    }

    // =========================================================================
    // TC-U-058 to TC-U-060 – Cache eviction consistency
    // =========================================================================

    /**
     * TC-U-058 | Priority: P2 | Type: Edge case
     * Traces to: AC-021 Scenario 1 – cache phải luôn được xóa sau khi xóa POI
     *
     * <p>Precondition: N/A (both delete modes tested via parameterisation below).
     *
     * <p>Expected: regardless of {@code hardDelete} flag, both the single-POI cache key and
     * the active-list key are always evicted exactly once.
     */
    @Test
    @DisplayName("TC-U-058 [P2][Edge] Hard delete → cache single-key and active-list key both evicted")
    void deletePoi_hardDelete_bothCacheKeysEvicted() {
        // Arrange
        stubVendorFound();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(ownedPoi()));

        // Act
        poiService.deletePoi(POI_ID, VENDOR_EMAIL, true);

        // Assert – both keys evicted
        verify(poiCacheService, times(1)).evict(POI_ID);
        verify(poiCacheService, times(1)).evictActivePoisList();
        verifyNoMoreInteractions(poiCacheService);
    }

    /**
     * TC-U-059 | Priority: P2 | Type: Edge case
     * Traces to: AC-021 Scenario 1 – xóa cứng phải dùng repository.delete(), không phải save()
     *
     * <p>Expected: for hard delete, {@code poiRepository.delete()} is invoked and
     * {@code poiRepository.save()} is never called (avoids unnecessary DB write-then-delete).
     */
    @Test
    @DisplayName("TC-U-059 [P2][Edge] Hard delete → delete() called, save() never called")
    void deletePoi_hardDelete_usesRepositoryDeleteNotSave() {
        // Arrange
        stubVendorFound();
        Poi poi = ownedPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));

        // Act
        poiService.deletePoi(POI_ID, VENDOR_EMAIL, true);

        // Assert
        verify(poiRepository).delete(poi);
        verify(poiRepository, never()).save(any());
    }

    /**
     * TC-U-060 | Priority: P2 | Type: Edge case
     * Traces to: AC-021 Scenario 1 – xóa mềm phải dùng repository.save(), không phải delete()
     *
     * <p>Expected: for soft delete, {@code poiRepository.save()} is invoked and
     * {@code poiRepository.delete()} is never called (data is preserved for 30-day recovery).
     */
    @Test
    @DisplayName("TC-U-060 [P2][Edge] Soft delete → save() called, delete() never called")
    void deletePoi_softDelete_usesRepositorySaveNotDelete() {
        // Arrange
        stubVendorFound();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(ownedPoi()));
        when(poiRepository.save(any(Poi.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        poiService.deletePoi(POI_ID, VENDOR_EMAIL, false);

        // Assert
        verify(poiRepository).save(any(Poi.class));
        verify(poiRepository, never()).delete(any());
    }
}
