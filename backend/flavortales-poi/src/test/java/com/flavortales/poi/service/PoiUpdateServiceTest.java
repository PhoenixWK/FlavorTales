package com.flavortales.poi.service;

import com.flavortales.common.exception.DuplicatePoiLocationException;
import com.flavortales.common.exception.PoiNotFoundException;
import com.flavortales.common.exception.ShopAlreadyHasPoiException;
import com.flavortales.common.exception.ShopNotFoundException;
import com.flavortales.common.exception.UserNotFoundException;
import com.flavortales.notification.service.EmailService;
import com.flavortales.poi.dto.PoiResponse;
import com.flavortales.poi.dto.UpdatePoiRequest;
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
import org.springframework.jdbc.core.RowMapper;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link PoiService#updatePoi(Integer, UpdatePoiRequest, String)}.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>User Story  : US-020 – Vendor chỉnh sửa POI</li>
 *   <li>Use Case    : UC-020 – Modify POI</li>
 *   <li>Requirement : FR-PM-004 – Update POI</li>
 *   <li>SRS         : SRS-POI-002 – Vendor can modify display name and coordinates of an owned POI</li>
 *   <li>AC          : AC-020
 *     <ul>
 *       <li>Scenario 1 (Basic Flow)    – Vendor updates POI; system saves and confirms</li>
 *       <li>Scenario 2 (A1 – partial) – Unchanged fields retain their current value</li>
 *       <li>Scenario 3 (E1 – invalid) – Invalid data → error; vendor prompted to re-enter</li>
 *     </ul>
 *   </li>
 * </ul>
 *
 * <p><b>Test categories covered</b>: happy path, alternative flow (A1), negative (E1), edge case.
 */
@ExtendWith(MockitoExtension.class)
class PoiUpdateServiceTest {

    // ── Boundary config – mirrors backend/flavortales-app/src/main/resources/application.yml ──
    private static final double CENTER_LAT   = 21.028500;
    private static final double CENTER_LNG   = 105.854200;
    private static final double MAX_RADIUS_M = 5_000.0;

    // ── Shared test data ──────────────────────────────────────────────────────
    private static final String  VENDOR_EMAIL  = "vendor@flavortales.vn";
    private static final int     VENDOR_ID     = 1;
    private static final int     POI_ID        = 42;
    private static final int     SHOP_ID       = 10;
    private static final int     NEW_SHOP_ID   = 20;

    /** Current coordinates of the POI – inside boundary (~22 m from centre). */
    private static final BigDecimal CURRENT_LAT = BigDecimal.valueOf(21.028700);
    private static final BigDecimal CURRENT_LNG = BigDecimal.valueOf(105.854300);

    /** Different coordinates still inside boundary (~136 m from centre). */
    private static final BigDecimal UPDATED_LAT = BigDecimal.valueOf(21.029500);
    private static final BigDecimal UPDATED_LNG = BigDecimal.valueOf(105.855000);

    /** Outside boundary (~7 934 m from centre). */
    private static final BigDecimal OUTSIDE_LAT = BigDecimal.valueOf(21.100000);
    private static final BigDecimal OUTSIDE_LNG  = BigDecimal.valueOf(105.854200);

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

    /** The existing POI in the database, owned by VENDOR_ID, at CURRENT_LAT/LNG. */
    private Poi existingPoi() {
        return Poi.builder()
                .poiId(POI_ID)
                .vendorId(VENDOR_ID)
                .name("Bún Bò Gân Trời")
                .latitude(CURRENT_LAT)
                .longitude(CURRENT_LNG)
                .radius(BigDecimal.valueOf(50.0))
                .status(PoiStatus.active)
                .build();
    }

    private PoiResponse poiResponse(String name) {
        PoiResponse r = new PoiResponse();
        r.setPoiId(POI_ID);
        r.setName(name);
        r.setLatitude(CURRENT_LAT);
        r.setLongitude(CURRENT_LNG);
        r.setRadius(BigDecimal.valueOf(50.0));
        r.setStatus("active");
        return r;
    }

    private void stubVendorFound() {
        when(jdbcTemplate.queryForObject(
                eq("SELECT user_id FROM user WHERE email = ?"),
                eq(Integer.class),
                eq(VENDOR_EMAIL)
        )).thenReturn(VENDOR_ID);
    }

    /** Stubs the query that finds the shop currently linked to this POI. */
    @SuppressWarnings("unchecked")
    private void stubCurrentLinkedShop(List<Integer> shopIds) {
        when(jdbcTemplate.query(
                eq("SELECT shop_id FROM shop WHERE poi_id = ?"),
                any(RowMapper.class),
                eq(POI_ID)
        )).thenReturn(shopIds);
    }

    /**
     * Stubs the shop validation query used by {@code validateShopForUpdate}.
     *
     * @param shopId        the shop being linked
     * @param shopVendorId  vendor_id stored on the shop row
     * @param existingPoiId poi_id stored on the shop row (null = no POI yet)
     */
    private void stubShopForUpdate(int shopId, int shopVendorId, Integer existingPoiId) {
        Map<String, Object> row = new HashMap<>();
        row.put("vendor_id", shopVendorId);
        row.put("poi_id", existingPoiId);
        when(jdbcTemplate.queryForList(
                eq("SELECT vendor_id, poi_id FROM shop WHERE shop_id = ?"),
                eq((Object) shopId)
        )).thenReturn(List.of(row));
    }

    // =========================================================================
    // Basic Flow – Scenario 1: successful update
    // =========================================================================

    /**
     * TC-U-020 | Priority: P1 | Type: Happy path
     * Traces to: UC-020 Step 5–6, FR-PM-004, AC-020 Scenario 1
     *
     * <p>Precondition: POI exists, belongs to vendor; only the name field is updated.
     *
     * <p>Steps:
     * <ol>
     *   <li>Submit {@link UpdatePoiRequest} with only {@code name} set.</li>
     *   <li>Invoke {@code updatePoi}.</li>
     * </ol>
     *
     * <p>Expected:
     * <ul>
     *   <li>POI entity saved with the new name.</li>
     *   <li>Cache entries evicted for this POI and the active-list.</li>
     *   <li>No update email sent (coordinates and shop unchanged).</li>
     *   <li>Response reflects the updated name.</li>
     * </ul>
     */
    @Test
    @DisplayName("TC-U-020 [P1][Happy] Name-only update → saved, cache evicted, no email")
    void updatePoi_nameOnlyUpdate_savesEntityEvictsCacheAndDoesNotSendEmail() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();
        stubCurrentLinkedShop(List.of(SHOP_ID));
        when(poiRepository.save(poi)).thenReturn(poi);
        PoiResponse response = poiResponse("Phở Đặc Biệt");
        when(poiMapper.toResponse(poi)).thenReturn(response);

        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .name("Phở Đặc Biệt")
                .build();

        // Act
        PoiResponse result = poiService.updatePoi(POI_ID, request, VENDOR_EMAIL);

        // Assert – response
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Phở Đặc Biệt");

        // Assert – entity persisted with the new name
        ArgumentCaptor<Poi> captor = ArgumentCaptor.forClass(Poi.class);
        verify(poiRepository).save(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("Phở Đặc Biệt");

        // Assert – cache invalidated (AC-020 Scenario 1 – system updates persistent store)
        verify(poiCacheService).evict(POI_ID);
        verify(poiCacheService).evictActivePoisList();

        // Assert – no email for name-only change
        verify(emailService, never()).sendPoiUpdatedEmail(any(), any());
    }

    /**
     * TC-U-021 | Priority: P1 | Type: Happy path
     * Traces to: UC-020 Step 3 (coordinates), FR-PM-004, AC-020 Scenario 1
     *
     * <p>Precondition: POI exists, belongs to vendor; both name and coordinates are updated
     * to values inside the boundary with no nearby active POI.
     *
     * <p>Steps:
     * <ol>
     *   <li>Submit {@link UpdatePoiRequest} with new name, latitude, and longitude.</li>
     *   <li>Invoke {@code updatePoi}.</li>
     * </ol>
     *
     * <p>Expected:
     * <ul>
     *   <li>Boundary validation runs against the new coordinates.</li>
     *   <li>POI is saved with updated fields.</li>
     *   <li>Email notification sent to vendor (coordinate change).</li>
     *   <li>Cache evicted.</li>
     * </ul>
     */
    @Test
    @DisplayName("TC-U-021 [P1][Happy] Name + coordinates update (inside boundary) → saved, email sent")
    void updatePoi_nameAndCoordinatesUpdated_savesEntityAndNotifiesVendor() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();
        when(poiRepository.findByStatus(PoiStatus.active)).thenReturn(List.of());
        stubCurrentLinkedShop(List.of(SHOP_ID));
        when(poiRepository.save(poi)).thenReturn(poi);
        PoiResponse response = poiResponse("Phở Đặc Biệt");
        response.setLatitude(UPDATED_LAT);
        response.setLongitude(UPDATED_LNG);
        when(poiMapper.toResponse(poi)).thenReturn(response);

        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .name("Phở Đặc Biệt")
                .latitude(UPDATED_LAT)
                .longitude(UPDATED_LNG)
                .build();

        // Act
        PoiResponse result = poiService.updatePoi(POI_ID, request, VENDOR_EMAIL);

        // Assert – entity updated
        ArgumentCaptor<Poi> captor = ArgumentCaptor.forClass(Poi.class);
        verify(poiRepository).save(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("Phở Đặc Biệt");
        assertThat(captor.getValue().getLatitude()).isEqualByComparingTo(UPDATED_LAT);
        assertThat(captor.getValue().getLongitude()).isEqualByComparingTo(UPDATED_LNG);

        // Assert – email triggered by coordinate change
        verify(emailService).sendPoiUpdatedEmail(eq(VENDOR_EMAIL), eq("Phở Đặc Biệt"));

        verify(poiCacheService).evict(POI_ID);
        verify(poiCacheService).evictActivePoisList();
        assertThat(result).isNotNull();
    }

    /**
     * TC-U-022 | Priority: P1 | Type: Happy path
     * Traces to: UC-020 Step 5–6, FR-PM-004, AC-020 Scenario 1
     *
     * <p>Precondition: POI exists and belongs to vendor; all updatable fields are changed.
     *
     * <p>Expected: every field (name, lat, lng, radius) is applied; email sent; cache evicted.
     */
    @Test
    @DisplayName("TC-U-022 [P1][Happy] All-fields update → all applied, email sent, cache evicted")
    void updatePoi_allFieldsUpdated_appliesAllChangesAndNotifiesVendor() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();
        when(poiRepository.findByStatus(PoiStatus.active)).thenReturn(List.of());
        stubCurrentLinkedShop(List.of(SHOP_ID));
        when(poiRepository.save(poi)).thenReturn(poi);
        when(poiMapper.toResponse(poi)).thenReturn(poiResponse("Bún Chả Mới"));

        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .name("Bún Chả Mới")
                .latitude(UPDATED_LAT)
                .longitude(UPDATED_LNG)
                .radius(BigDecimal.valueOf(80.0))
                .build();

        // Act
        poiService.updatePoi(POI_ID, request, VENDOR_EMAIL);

        // Assert – all fields applied
        ArgumentCaptor<Poi> captor = ArgumentCaptor.forClass(Poi.class);
        verify(poiRepository).save(captor.capture());
        Poi saved = captor.getValue();
        assertThat(saved.getName()).isEqualTo("Bún Chả Mới");
        assertThat(saved.getLatitude()).isEqualByComparingTo(UPDATED_LAT);
        assertThat(saved.getLongitude()).isEqualByComparingTo(UPDATED_LNG);
        assertThat(saved.getRadius()).isEqualByComparingTo(BigDecimal.valueOf(80.0));

        verify(emailService).sendPoiUpdatedEmail(eq(VENDOR_EMAIL), any());
    }

    // =========================================================================
    // Alternative Flow A1 – Partial update: unchanged fields retain old values
    // =========================================================================

    /**
     * TC-U-023 | Priority: P1 | Type: Alternative flow (A1)
     * Traces to: UC-020 A1 – Vendor chỉ cập nhật một phần thông tin, FR-PM-004, AC-020 Scenario 2
     *
     * <p>Precondition: POI exists and belongs to vendor.
     *
     * <p>Steps:
     * <ol>
     *   <li>Submit request with only {@code name} set; latitude, longitude, radius are null.</li>
     *   <li>Invoke {@code updatePoi}.</li>
     * </ol>
     *
     * <p>Expected: latitude, longitude, and radius on the saved entity equal the original values
     * (unchanged fields are NOT overwritten by null).
     */
    @Test
    @DisplayName("TC-U-023 [P1][A1] Partial update (name only) → unchanged fields retain original values")
    void updatePoi_partialUpdate_unchangedFieldsRetainOriginalValues() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();
        stubCurrentLinkedShop(List.of(SHOP_ID));
        when(poiRepository.save(poi)).thenReturn(poi);
        when(poiMapper.toResponse(poi)).thenReturn(poiResponse("Phở Mới"));

        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .name("Phở Mới")
                // latitude, longitude, radius intentionally null
                .build();

        // Act
        poiService.updatePoi(POI_ID, request, VENDOR_EMAIL);

        // Assert – original coordinates and radius preserved (A1)
        ArgumentCaptor<Poi> captor = ArgumentCaptor.forClass(Poi.class);
        verify(poiRepository).save(captor.capture());
        Poi saved = captor.getValue();
        assertThat(saved.getLatitude()).isEqualByComparingTo(CURRENT_LAT);
        assertThat(saved.getLongitude()).isEqualByComparingTo(CURRENT_LNG);
        assertThat(saved.getRadius()).isEqualByComparingTo(BigDecimal.valueOf(50.0));
    }

    /**
     * TC-U-024 | Priority: P2 | Type: Alternative flow (A1)
     * Traces to: UC-020 A1 – shopId=null means keep current shop link, AC-020 Scenario 2
     *
     * <p>Precondition: POI is linked to SHOP_ID; request has shopId = null.
     *
     * <p>Expected: no shop update queries are executed; linked shop remains unchanged.
     */
    @Test
    @DisplayName("TC-U-024 [P2][A1] shopId=null in request → current shop link unchanged, no shop SQL")
    void updatePoi_shopIdNullInRequest_shopLinkRetained() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();
        stubCurrentLinkedShop(List.of(SHOP_ID));
        when(poiRepository.save(poi)).thenReturn(poi);
        PoiResponse response = poiResponse("Bún Bò Gân Trời");
        response.setLinkedShopId(SHOP_ID);
        when(poiMapper.toResponse(poi)).thenReturn(response);

        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .name("Bún Bò Gân Trời")
                .build(); // shopId = null

        // Act
        PoiResponse result = poiService.updatePoi(POI_ID, request, VENDOR_EMAIL);

        // Assert – linked shop still SHOP_ID in response
        assertThat(result.getLinkedShopId()).isEqualTo(SHOP_ID);

        // Assert – no UPDATE on shop table
        verify(jdbcTemplate, never()).update(contains("UPDATE shop SET poi_id"), any(Object[].class));
    }

    // =========================================================================
    // Basic Flow – Shop link management
    // =========================================================================

    /**
     * TC-U-025 | Priority: P1 | Type: Happy path
     * Traces to: UC-020 Step 3 (shop change), FR-PM-004, AC-020 Scenario 1
     *
     * <p>Precondition: POI is linked to SHOP_ID; vendor requests shopId = 0 to unlink.
     *
     * <p>Steps:
     * <ol>
     *   <li>Submit request with {@code shopId = 0}.</li>
     *   <li>Invoke {@code updatePoi}.</li>
     * </ol>
     *
     * <p>Expected:
     * <ul>
     *   <li>Old shop row's poi_id set to NULL.</li>
     *   <li>Response linkedShopId = null.</li>
     *   <li>Email sent (shop changed).</li>
     * </ul>
     */
    @Test
    @DisplayName("TC-U-025 [P1][Happy] shopId=0 → unlink current shop, email sent, response.linkedShopId=null")
    void updatePoi_shopIdZero_unlinksCurrentShopAndNotifiesVendor() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();
        stubCurrentLinkedShop(List.of(SHOP_ID));
        when(poiRepository.save(poi)).thenReturn(poi);
        PoiResponse response = poiResponse("Bún Bò Gân Trời");
        response.setLinkedShopId(null);
        when(poiMapper.toResponse(poi)).thenReturn(response);

        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .shopId(0) // explicit unlink
                .build();

        // Act
        PoiResponse result = poiService.updatePoi(POI_ID, request, VENDOR_EMAIL);

        // Assert – shop row unlinked
        verify(jdbcTemplate).update(
                eq("UPDATE shop SET poi_id = NULL WHERE poi_id = ?"),
                eq(POI_ID)
        );

        // Assert – response shows no linked shop
        assertThat(result.getLinkedShopId()).isNull();

        // Assert – email fire for shop change
        verify(emailService).sendPoiUpdatedEmail(eq(VENDOR_EMAIL), any());
    }

    /**
     * TC-U-026 | Priority: P1 | Type: Happy path
     * Traces to: UC-020 Step 3 (shop re-link), FR-PM-004, AC-020 Scenario 1
     *
     * <p>Precondition: POI is linked to SHOP_ID; vendor requests a switch to NEW_SHOP_ID.
     *
     * <p>Steps:
     * <ol>
     *   <li>Submit request with {@code shopId = NEW_SHOP_ID}.</li>
     *   <li>Invoke {@code updatePoi}.</li>
     * </ol>
     *
     * <p>Expected:
     * <ul>
     *   <li>Old shop (SHOP_ID) is unlinked (poi_id → NULL).</li>
     *   <li>New shop (NEW_SHOP_ID) linked to this POI.</li>
     *   <li>Email sent (shop changed).</li>
     *   <li>Response linkedShopId = NEW_SHOP_ID.</li>
     * </ul>
     */
    @Test
    @DisplayName("TC-U-026 [P1][Happy] shopId=NEW_SHOP_ID → old shop unlinked, new shop linked, email sent")
    void updatePoi_relinkToNewShop_unlinksOldShopLinksNewShopAndNotifiesVendor() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();
        stubCurrentLinkedShop(List.of(SHOP_ID));
        stubShopForUpdate(NEW_SHOP_ID, VENDOR_ID, null);
        when(poiRepository.save(poi)).thenReturn(poi);
        PoiResponse response = poiResponse("Bún Bò Gân Trời");
        response.setLinkedShopId(NEW_SHOP_ID);
        when(poiMapper.toResponse(poi)).thenReturn(response);

        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .shopId(NEW_SHOP_ID)
                .build();

        // Act
        PoiResponse result = poiService.updatePoi(POI_ID, request, VENDOR_EMAIL);

        // Assert – old shop unlinked, new shop linked
        verify(jdbcTemplate).update(
                eq("UPDATE shop SET poi_id = NULL WHERE poi_id = ?"),
                eq(POI_ID)
        );
        verify(jdbcTemplate).update(
                eq("UPDATE shop SET poi_id = ? WHERE shop_id = ?"),
                eq(POI_ID), eq(NEW_SHOP_ID)
        );

        // Assert – response has new linked shop
        assertThat(result.getLinkedShopId()).isEqualTo(NEW_SHOP_ID);

        // Assert – email for shop change
        verify(emailService).sendPoiUpdatedEmail(eq(VENDOR_EMAIL), any());
    }

    // =========================================================================
    // Exception Flow E1 – POI lookup & ownership failures
    // =========================================================================

    /**
     * TC-U-027 | Priority: P1 | Type: Negative (E1)
     * Traces to: UC-020 Step 1 (system loads POI), FR-PM-004, AC-020 Scenario 3
     *
     * <p>Precondition: the given poiId does not exist in the database.
     *
     * <p>Steps: invoke {@code updatePoi} with a non-existent poiId.
     *
     * <p>Expected: {@link PoiNotFoundException} thrown; no DB write occurs.
     *            (System shows error to vendor per E1.)
     */
    @Test
    @DisplayName("TC-U-027 [P1][Negative/E1] Non-existent poiId → PoiNotFoundException; no DB write")
    void updatePoi_poiNotFound_throwsPoiNotFoundException() {
        // Arrange
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.empty());

        UpdatePoiRequest request = UpdatePoiRequest.builder().name("Any Name").build();

        // Act & Assert
        assertThatThrownBy(() -> poiService.updatePoi(POI_ID, request, VENDOR_EMAIL))
                .isInstanceOf(PoiNotFoundException.class)
                .hasMessageContaining("POI not found with id: " + POI_ID);

        verify(poiRepository, never()).save(any());
        verifyNoInteractions(jdbcTemplate);
    }

    /**
     * TC-U-028 | Priority: P1 | Type: Negative (E1)
     * Traces to: UC-020 ownership check, FR-PM-004 (only owner may update), AC-020 Scenario 3
     *
     * <p>Precondition: POI exists but its vendorId (99) differs from the authenticated vendor (1).
     *
     * <p>Expected: {@link IllegalArgumentException} with message "You do not own this POI";
     * no DB write.
     */
    @Test
    @DisplayName("TC-U-028 [P1][Negative/E1] POI owned by different vendor → IllegalArgumentException")
    void updatePoi_poiOwnedByDifferentVendor_throwsIllegalArgumentException() {
        // Arrange
        Poi poi = existingPoi();
        poi.setVendorId(99); // belongs to someone else
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound(); // authenticated vendor = VENDOR_ID = 1

        UpdatePoiRequest request = UpdatePoiRequest.builder().name("Any Name").build();

        // Act & Assert
        assertThatThrownBy(() -> poiService.updatePoi(POI_ID, request, VENDOR_EMAIL))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("You do not own this POI");

        verify(poiRepository, never()).save(any());
    }

    /**
     * TC-U-029 | Priority: P1 | Type: Negative (E1)
     * Traces to: UC-020 vendor resolution, FR-PM-004, SRS-AUTH-001
     *
     * <p>Precondition: the vendor email does not correspond to any user record.
     *
     * <p>Expected: {@link UserNotFoundException} thrown; no POI is persisted.
     */
    @Test
    @DisplayName("TC-U-029 [P1][Negative/E1] Unknown vendor email → UserNotFoundException; no DB write")
    void updatePoi_vendorEmailNotFound_throwsUserNotFoundException() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        when(jdbcTemplate.queryForObject(
                eq("SELECT user_id FROM user WHERE email = ?"),
                eq(Integer.class),
                eq(VENDOR_EMAIL)
        )).thenThrow(new EmptyResultDataAccessException(1));

        UpdatePoiRequest request = UpdatePoiRequest.builder().name("Any Name").build();

        // Act & Assert
        assertThatThrownBy(() -> poiService.updatePoi(POI_ID, request, VENDOR_EMAIL))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("Vendor not found");

        verify(poiRepository, never()).save(any());
    }

    // =========================================================================
    // Exception Flow E1 – Coordinate validation failures
    // =========================================================================

    /**
     * TC-U-030 | Priority: P1 | Type: Negative (E1)
     * Traces to: UC-020 Step 4 (validate data), FR-PM-004, AC-020 Scenario 3
     *
     * <p>Precondition: the new coordinates are ~7 934 m from the boundary centre
     * (well outside the 5 000 m limit).
     *
     * <p>Expected: {@link IllegalArgumentException} thrown with "outside the permitted
     * food-street area"; no save occurs.
     */
    @Test
    @DisplayName("TC-U-030 [P1][Negative/E1] New coordinates outside boundary (~7 934 m) → IllegalArgumentException")
    void updatePoi_newCoordinatesOutsideBoundary_throwsIllegalArgumentException() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();

        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .latitude(OUTSIDE_LAT)
                .longitude(OUTSIDE_LNG)
                .build();

        // Act & Assert
        assertThatThrownBy(() -> poiService.updatePoi(POI_ID, request, VENDOR_EMAIL))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("outside the permitted food-street area");

        verify(poiRepository, never()).save(any());
    }

    /**
     * TC-U-031 | Priority: P1 | Type: Negative (E1)
     * Traces to: UC-020 Step 4 (proximity conflict), FR-PM-004, AC-020 Scenario 3
     *
     * <p>Precondition: an existing active POI (id=99) is at the same coordinates as UPDATED_LAT/LNG.
     *
     * <p>Expected: {@link DuplicatePoiLocationException} thrown; no save occurs.
     */
    @Test
    @DisplayName("TC-U-031 [P1][Negative/E1] New coordinates conflict with existing POI (<5 m) → DuplicatePoiLocationException")
    void updatePoi_newCoordinatesConflictWithExistingPoi_throwsDuplicatePoiLocationException() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();

        // Another active POI at the exact target coordinates
        Poi conflictingPoi = Poi.builder()
                .poiId(99)
                .latitude(UPDATED_LAT)
                .longitude(UPDATED_LNG)
                .status(PoiStatus.active)
                .build();
        when(poiRepository.findByStatus(PoiStatus.active)).thenReturn(List.of(conflictingPoi));

        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .latitude(UPDATED_LAT)
                .longitude(UPDATED_LNG)
                .build();

        // Act & Assert
        assertThatThrownBy(() -> poiService.updatePoi(POI_ID, request, VENDOR_EMAIL))
                .isInstanceOf(DuplicatePoiLocationException.class)
                .hasMessageContaining("within 5 metres");

        verify(poiRepository, never()).save(any());
    }

    // =========================================================================
    // Exception Flow E1 – Shop validation failures when re-linking
    // =========================================================================

    /**
     * TC-U-032 | Priority: P1 | Type: Negative (E1)
     * Traces to: UC-020 Step 4 (shop validation), FR-PM-004
     *
     * <p>Precondition: requested shop (NEW_SHOP_ID) does not exist.
     *
     * <p>Expected: {@link ShopNotFoundException} thrown; no save.
     */
    @Test
    @DisplayName("TC-U-032 [P1][Negative/E1] New shopId not found → ShopNotFoundException")
    void updatePoi_newShopNotFound_throwsShopNotFoundException() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();
        stubCurrentLinkedShop(List.of(SHOP_ID));
        when(jdbcTemplate.queryForList(
                eq("SELECT vendor_id, poi_id FROM shop WHERE shop_id = ?"),
                eq((Object) NEW_SHOP_ID)
        )).thenReturn(List.of()); // shop row absent → ShopNotFoundException

        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .shopId(NEW_SHOP_ID)
                .build();

        // Act & Assert
        assertThatThrownBy(() -> poiService.updatePoi(POI_ID, request, VENDOR_EMAIL))
                .isInstanceOf(ShopNotFoundException.class)
                .hasMessageContaining("Shop not found with id: " + NEW_SHOP_ID);

        verify(poiRepository, never()).save(any());
    }

    /**
     * TC-U-033 | Priority: P1 | Type: Negative (E1)
     * Traces to: UC-020 Step 4 (shop ownership), FR-PM-004
     *
     * <p>Precondition: requested shop (NEW_SHOP_ID) belongs to a different vendor (id=99).
     *
     * <p>Expected: {@link IllegalArgumentException} thrown with "does not belong to this vendor".
     */
    @Test
    @DisplayName("TC-U-033 [P1][Negative/E1] New shop belongs to different vendor → IllegalArgumentException")
    void updatePoi_newShopBelongsToDifferentVendor_throwsIllegalArgumentException() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();
        stubCurrentLinkedShop(List.of(SHOP_ID));
        stubShopForUpdate(NEW_SHOP_ID, 99, null); // shop owned by vendor 99 ≠ VENDOR_ID 1

        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .shopId(NEW_SHOP_ID)
                .build();

        // Act & Assert
        assertThatThrownBy(() -> poiService.updatePoi(POI_ID, request, VENDOR_EMAIL))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not belong to this vendor");

        verify(poiRepository, never()).save(any());
    }

    /**
     * TC-U-034 | Priority: P1 | Type: Negative (E1)
     * Traces to: UC-020 Step 4, FR-PM-004
     *
     * <p>Precondition: requested shop (NEW_SHOP_ID) belongs to vendor but is already linked
     * to another POI (poi_id = 55).
     *
     * <p>Expected: {@link ShopAlreadyHasPoiException} thrown; no save.
     */
    @Test
    @DisplayName("TC-U-034 [P1][Negative/E1] New shop already linked to another POI → ShopAlreadyHasPoiException")
    void updatePoi_newShopAlreadyHasPoi_throwsShopAlreadyHasPoiException() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();
        stubCurrentLinkedShop(List.of(SHOP_ID));
        stubShopForUpdate(NEW_SHOP_ID, VENDOR_ID, 55); // already has poi_id = 55

        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .shopId(NEW_SHOP_ID)
                .build();

        // Act & Assert
        assertThatThrownBy(() -> poiService.updatePoi(POI_ID, request, VENDOR_EMAIL))
                .isInstanceOf(ShopAlreadyHasPoiException.class)
                .hasMessageContaining("already has a POI");

        verify(poiRepository, never()).save(any());
    }

    // =========================================================================
    // Edge cases
    // =========================================================================

    /**
     * TC-U-035 | Priority: P2 | Type: Edge case
     * Traces to: FR-PM-004, AC-020 Scenario 2 – same coordinates are not treated as changed
     *
     * <p>Precondition: update request provides the exact same latitude and longitude
     * as the current POI (no actual movement).
     *
     * <p>Expected: {@code coordsChanged = false} → boundary and proximity validation
     * are skipped; no email sent.
     */
    @Test
    @DisplayName("TC-U-035 [P2][Edge] Update coordinates to same values → coordsChanged=false, no validation, no email")
    void updatePoi_coordinatesUnchanged_skipsValidationAndDoesNotSendEmail() {
        // Arrange
        Poi poi = existingPoi(); // lat=CURRENT_LAT, lng=CURRENT_LNG
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();
        stubCurrentLinkedShop(List.of(SHOP_ID));
        when(poiRepository.save(poi)).thenReturn(poi);
        when(poiMapper.toResponse(poi)).thenReturn(poiResponse("Bún Bò Gân Trời"));

        // Provide same latitude and longitude values
        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .latitude(CURRENT_LAT)   // identical to poi.getLatitude()
                .longitude(CURRENT_LNG)  // identical to poi.getLongitude()
                .build();

        // Act
        poiService.updatePoi(POI_ID, request, VENDOR_EMAIL);

        // Assert – proximity check not triggered (coordsChanged = false)
        verify(poiRepository, never()).findByStatus(any());

        // Assert – no email (neither coords nor shop changed)
        verify(emailService, never()).sendPoiUpdatedEmail(any(), any());
    }

    /**
     * TC-U-036 | Priority: P2 | Type: Edge case
     * Traces to: AC-020 Scenario 1 – boundary just inside (~4 993 m)
     *
     * <p>Test data: lat = 21.073400 → haversine ≈ 4 993 m &lt; 5 000 m → inside boundary.
     *
     * <p>Expected: boundary validation passes; no exception thrown.
     */
    @Test
    @DisplayName("TC-U-036 [P2][Edge] New coordinates ~4 993 m from centre (just inside) → boundary passes")
    void updatePoi_newCoordinatesNearBoundaryInsideEdge_validationPasses() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();
        when(poiRepository.findByStatus(PoiStatus.active)).thenReturn(List.of());
        stubCurrentLinkedShop(List.of(SHOP_ID));
        when(poiRepository.save(poi)).thenReturn(poi);
        when(poiMapper.toResponse(poi)).thenReturn(poiResponse("Bún Bò Gân Trời"));

        // delta_lat = 0.04490° → haversine ≈ 4 993 m < 5 000 m → inside boundary
        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .latitude(BigDecimal.valueOf(21.073400))
                .longitude(BigDecimal.valueOf(CENTER_LNG))
                .build();

        // Act & Assert – no exception
        assertThatNoException().isThrownBy(
                () -> poiService.updatePoi(POI_ID, request, VENDOR_EMAIL));
    }

    /**
     * TC-U-037 | Priority: P2 | Type: Edge case
     * Traces to: AC-020 Scenario 3 (E1) – boundary just outside (~5 008 m)
     *
     * <p>Test data: lat = 21.073551 → haversine ≈ 5 008 m &gt; 5 000 m → outside boundary.
     *
     * <p>Expected: {@link IllegalArgumentException} thrown.
     */
    @Test
    @DisplayName("TC-U-037 [P2][Edge] New coordinates ~5 008 m from centre (just outside) → IllegalArgumentException")
    void updatePoi_newCoordinatesJustOutsideBoundary_throwsIllegalArgumentException() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();

        // delta_lat = 0.04505° → haversine ≈ 5 008 m > 5 000 m → outside boundary
        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .latitude(BigDecimal.valueOf(21.073551))
                .longitude(BigDecimal.valueOf(CENTER_LNG))
                .build();

        // Act & Assert
        assertThatThrownBy(() -> poiService.updatePoi(POI_ID, request, VENDOR_EMAIL))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("outside the permitted food-street area");
    }

    /**
     * TC-U-038 | Priority: P2 | Type: Edge case
     * Traces to: FR-PM-004 – proximity threshold is exclusive (&lt; 5 m, not ≤ 5 m)
     *
     * <p>Precondition: a different active POI exists at lat = 21.028545 (same lng as centre);
     * distance from target (lat=CENTER_LAT, lng=CENTER_LNG) ≈ 5.003 m — NOT strictly &lt; 5 m.
     *
     * <p>Expected: no {@link DuplicatePoiLocationException}; POI is saved (exclusive threshold).
     */
    @Test
    @DisplayName("TC-U-038 [P2][Edge] Existing POI at ~5.003 m (exclusive threshold) → no conflict, POI saved")
    void updatePoi_existingPoiAtExclusiveProximityThreshold_noConflict() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();

        // delta_lat = 0.000045° → haversine ≈ 5.003 m → NOT < 5.0 → no conflict
        Poi nearbyPoi = Poi.builder()
                .poiId(88)
                .latitude(BigDecimal.valueOf(21.028545))
                .longitude(BigDecimal.valueOf(CENTER_LNG))
                .status(PoiStatus.active)
                .build();
        when(poiRepository.findByStatus(PoiStatus.active)).thenReturn(List.of(nearbyPoi));

        stubCurrentLinkedShop(List.of(SHOP_ID));
        when(poiRepository.save(poi)).thenReturn(poi);
        when(poiMapper.toResponse(poi)).thenReturn(poiResponse("Bún Bò Gân Trời"));

        // Target: boundary centre – exactly 5.003 m from nearbyPoi
        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .latitude(BigDecimal.valueOf(CENTER_LAT))
                .longitude(BigDecimal.valueOf(CENTER_LNG))
                .build();

        // Act & Assert – no exception thrown
        assertThatNoException().isThrownBy(
                () -> poiService.updatePoi(POI_ID, request, VENDOR_EMAIL));
    }

    /**
     * TC-U-039 | Priority: P2 | Type: Edge case
     * Traces to: FR-PM-004 – updated POI is excluded from its own proximity check
     *
     * <p>Precondition: the POI being updated appears in the active POI list loaded during
     * proximity checking. Its own entry must be skipped (excludePoiId = poiId).
     *
     * <p>Expected: no {@link DuplicatePoiLocationException}; POI is saved.
     */
    @Test
    @DisplayName("TC-U-039 [P2][Edge] POI's own location in active list → excluded from proximity check, no conflict")
    void updatePoi_ownLocationInActiveList_selfExcludedFromProximityCheck() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();

        // The POI itself appears in the active list at target coordinates
        Poi selfEntry = Poi.builder()
                .poiId(POI_ID)  // same id → must be excluded
                .latitude(UPDATED_LAT)
                .longitude(UPDATED_LNG)
                .status(PoiStatus.active)
                .build();
        when(poiRepository.findByStatus(PoiStatus.active)).thenReturn(List.of(selfEntry));

        stubCurrentLinkedShop(List.of(SHOP_ID));
        when(poiRepository.save(poi)).thenReturn(poi);
        when(poiMapper.toResponse(poi)).thenReturn(poiResponse("Bún Bò Gân Trời"));

        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .latitude(UPDATED_LAT)
                .longitude(UPDATED_LNG)
                .build();

        // Act & Assert – self-exclusion prevents false DuplicatePoiLocationException
        assertThatNoException().isThrownBy(
                () -> poiService.updatePoi(POI_ID, request, VENDOR_EMAIL));
    }

    /**
     * TC-U-040 | Priority: P2 | Type: Edge case
     * Traces to: UC-020 Step 6, FR-PM-004 – cache always evicted on any update
     *
     * <p>Precondition: a name-only update (no coords, no shop change).
     *
     * <p>Expected: even for the smallest change, cache entries for the POI and
     * the active list are always evicted.
     */
    @Test
    @DisplayName("TC-U-040 [P2][Edge] Any update → cache always evicted (both POI entry and active list)")
    void updatePoi_anyUpdate_alwaysEvictsCacheEntries() {
        // Arrange
        Poi poi = existingPoi();
        when(poiRepository.findById(POI_ID)).thenReturn(Optional.of(poi));
        stubVendorFound();
        stubCurrentLinkedShop(List.of(SHOP_ID));
        when(poiRepository.save(poi)).thenReturn(poi);
        when(poiMapper.toResponse(poi)).thenReturn(poiResponse("Chả Cá Lã Vọng"));

        UpdatePoiRequest request = UpdatePoiRequest.builder()
                .name("Chả Cá Lã Vọng")
                .build();

        // Act
        poiService.updatePoi(POI_ID, request, VENDOR_EMAIL);

        // Assert – both cache methods always called
        verify(poiCacheService).evict(POI_ID);
        verify(poiCacheService).evictActivePoisList();
    }
}
