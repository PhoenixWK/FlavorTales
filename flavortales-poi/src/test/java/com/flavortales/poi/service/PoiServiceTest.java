package com.flavortales.poi.service;

import com.flavortales.common.exception.DuplicatePoiLocationException;
import com.flavortales.common.exception.ShopAlreadyHasPoiException;
import com.flavortales.common.exception.ShopNotFoundException;
import com.flavortales.common.exception.UserNotFoundException;
import com.flavortales.notification.service.EmailService;
import com.flavortales.poi.dto.CreatePoiRequest;
import com.flavortales.poi.dto.PoiResponse;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link PoiService#createPoi(CreatePoiRequest, String)}.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>User Story  : US-019 – Vendor tạo POI mới</li>
 *   <li>Requirement : FR-PM-001 – Create POI</li>
 *   <li>AC          : AC-019
 *     <ul>
 *       <li>Scenario 1 – xác thực tọa độ trong phố ẩm thực và bán kính hợp lệ</li>
 *       <li>Scenario 2 – POI liên kết với gian hàng và xuất hiện trên bản đồ</li>
 *     </ul>
 *   </li>
 * </ul>
 *
 * <p><b>Test categories covered</b>: happy path, negative, edge case.
 */
@ExtendWith(MockitoExtension.class)
class PoiServiceTest {

    // ── Boundary config – mirrors backend/flavortales-app/src/main/resources/poi.yml ──
    private static final double CENTER_LAT   = 21.028500;
    private static final double CENTER_LNG   = 105.854200;
    private static final double MAX_RADIUS_M = 5_000.0;

    // ── Shared test data ──────────────────────────────────────────────────────
    private static final String  VENDOR_EMAIL = "vendor@flavortales.vn";
    private static final int     VENDOR_ID    = 1;
    private static final int     SHOP_ID      = 10;

    /** Coordinates clearly inside the boundary (~22 m from centre). */
    private static final BigDecimal INSIDE_LAT = BigDecimal.valueOf(21.028700);
    private static final BigDecimal INSIDE_LNG = BigDecimal.valueOf(105.854300);

    /** Coordinates clearly outside the boundary (~7 934 m from centre). */
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

    /** A valid {@link CreatePoiRequest} using coordinates well inside the boundary. */
    private CreatePoiRequest validRequest() {
        return CreatePoiRequest.builder()
                .name("Bún Bò Gân Trời")
                .latitude(INSIDE_LAT)
                .longitude(INSIDE_LNG)
                .radius(BigDecimal.valueOf(50.0))
                .shopId(SHOP_ID)
                .build();
    }

    private void stubVendorFound() {
        when(jdbcTemplate.queryForObject(
                eq("SELECT user_id FROM user WHERE email = ?"),
                eq(Integer.class),
                eq(VENDOR_EMAIL)
        )).thenReturn(VENDOR_ID);
    }

    /**
     * Stubs the shop-lookup query.
     *
     * @param shopVendorId the vendor_id stored on the shop row
     * @param poiId        the poi_id stored on the shop row (null = no POI yet)
     */
    private void stubShopRow(int shopVendorId, Integer poiId) {
        Map<String, Object> row = new HashMap<>();
        row.put("vendor_id", shopVendorId);
        row.put("poi_id", poiId);
        when(jdbcTemplate.queryForList(
                eq("SELECT vendor_id, poi_id FROM shop WHERE shop_id = ?"),
                eq((Object) SHOP_ID)
        )).thenReturn(List.of(row));
    }

    private Poi savedPoi(int id) {
        return Poi.builder()
                .poiId(id)
                .name("Bún Bò Gân Trời")
                .latitude(INSIDE_LAT)
                .longitude(INSIDE_LNG)
                .radius(BigDecimal.valueOf(50.0))
                .status(PoiStatus.active)
                .build();
    }

    private PoiResponse poiResponse(int poiId) {
        PoiResponse r = new PoiResponse();
        r.setPoiId(poiId);
        r.setName("Bún Bò Gân Trời");
        r.setLatitude(INSIDE_LAT);
        r.setLongitude(INSIDE_LNG);
        r.setRadius(BigDecimal.valueOf(50.0));
        r.setStatus("active");
        return r;
    }

    // =========================================================================
    // Scenario 2 – Happy path: POI created, linked to shop, map-ready
    // =========================================================================

    /**
     * TC-U-001 | Priority: P1 | Type: Happy path
     * Traces to: AC-019 Scenario 2
     *
     * <p>Precondition: vendor exists, shop belongs to vendor and has no POI,
     * no active POI within 5 m of the given coordinates.
     *
     * <p>Steps:
     * <ol>
     *   <li>Build a valid {@link CreatePoiRequest} with coordinates inside the boundary.</li>
     *   <li>Invoke {@code createPoi}.</li>
     * </ol>
     *
     * <p>Expected:
     * <ul>
     *   <li>POI is persisted via {@code PoiRepository.save}.</li>
     *   <li>Shop is updated with the new {@code poi_id} (Scenario 2 – linked to shop).</li>
     *   <li>Cache is updated and active-list evicted.</li>
     *   <li>Vendor notification email is dispatched.</li>
     *   <li>Response contains {@code linkedShopId} matching the request.</li>
     * </ul>
     */
    @Test
    @DisplayName("TC-U-001 [P1][Happy] Valid request → POI persisted, shop linked, cache evicted, email sent")
    void createPoi_validRequest_persistsPoiLinksShopUpdatesCacheAndNotifiesVendor() {
        // Arrange
        stubVendorFound();
        stubShopRow(VENDOR_ID, null);
        when(poiRepository.findByStatus(PoiStatus.active)).thenReturn(List.of());
        Poi saved = savedPoi(1);
        when(poiRepository.save(any(Poi.class))).thenReturn(saved);
        PoiResponse mapped = poiResponse(1);
        when(poiMapper.toResponse(saved)).thenReturn(mapped);

        // Act
        PoiResponse result = poiService.createPoi(validRequest(), VENDOR_EMAIL);

        // Assert – response
        assertThat(result).isNotNull();
        assertThat(result.getPoiId()).isEqualTo(1);
        assertThat(result.getLinkedShopId()).isEqualTo(SHOP_ID); // AC-019 Scenario 2

        // Assert – shop row updated in master DB
        verify(jdbcTemplate).update(
                eq("UPDATE shop SET poi_id = ? WHERE shop_id = ?"),
                eq(1), eq(SHOP_ID)
        );

        // Assert – Redis cache written and list evicted
        verify(poiCacheService).put(any(PoiResponse.class));
        verify(poiCacheService).evictActivePoisList();

        // Assert – vendor email sent (fire-and-forget, AC-019 Scenario 2)
        verify(emailService).sendPoiCreatedEmail(eq(VENDOR_EMAIL), eq("Bún Bò Gân Trời"));
    }

    // =========================================================================
    // Scenario 1 – Boundary (geofence) validation
    // =========================================================================

    /**
     * TC-U-002 | Priority: P1 | Type: Negative
     * Traces to: AC-019 Scenario 1 – tọa độ phải nằm trong khu vực phố ẩm thực
     *
     * <p>Precondition: coordinates are ~7 934 m from the boundary centre (well outside 5 000 m).
     *
     * <p>Steps: invoke {@code createPoi} with OUTSIDE_LAT / OUTSIDE_LNG.
     *
     * <p>Expected: {@link IllegalArgumentException} thrown with message describing the
     * violation; no DB write occurs.
     */
    @Test
    @DisplayName("TC-U-002 [P1][Negative] Coordinates outside boundary (~7 934 m) → IllegalArgumentException")
    void createPoi_coordinatesOutsideBoundary_throwsIllegalArgumentException() {
        CreatePoiRequest request = CreatePoiRequest.builder()
                .name("Quán Ngoài Khu Vực")
                .latitude(OUTSIDE_LAT)
                .longitude(OUTSIDE_LNG)
                .radius(BigDecimal.valueOf(50.0))
                .shopId(SHOP_ID)
                .build();

        assertThatThrownBy(() -> poiService.createPoi(request, VENDOR_EMAIL))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("outside the permitted food-street area");

        verifyNoInteractions(poiRepository);
    }

    /**
     * TC-U-003 | Priority: P2 | Type: Edge case
     * Traces to: AC-019 Scenario 1 – tọa độ tại đúng tâm điểm biên giới (0 m)
     *
     * <p>Precondition: coordinates equal the boundary centre → distance = 0 m.
     *
     * <p>Steps: invoke {@code createPoi} with CENTER_LAT / CENTER_LNG.
     *
     * <p>Expected: boundary validation passes (0 m &lt; 5 000 m); no exception thrown.
     */
    @Test
    @DisplayName("TC-U-003 [P2][Edge] Coordinates at boundary centre (0 m) → validation passes")
    void createPoi_coordinatesAtBoundaryCentre_validationPasses() {
        stubVendorFound();
        stubShopRow(VENDOR_ID, null);
        when(poiRepository.findByStatus(PoiStatus.active)).thenReturn(List.of());
        Poi saved = savedPoi(2);
        when(poiRepository.save(any(Poi.class))).thenReturn(saved);
        when(poiMapper.toResponse(saved)).thenReturn(poiResponse(2));

        CreatePoiRequest request = CreatePoiRequest.builder()
                .name("Gian Hàng Tâm Điểm")
                .latitude(BigDecimal.valueOf(CENTER_LAT))
                .longitude(BigDecimal.valueOf(CENTER_LNG))
                .radius(BigDecimal.valueOf(30.0))
                .shopId(SHOP_ID)
                .build();

        assertThatNoException().isThrownBy(() -> poiService.createPoi(request, VENDOR_EMAIL));
    }

    /**
     * TC-U-004 | Priority: P2 | Type: Edge case
     * Traces to: AC-019 Scenario 1 – tọa độ gần biên giới, bên trong (~4 993 m)
     *
     * <p>Test data: lat = 21.073400 → delta = 0.04490° → haversine ≈ 4 993 m &lt; 5 000 m.
     *
     * <p>Expected: boundary validation passes.
     */
    @Test
    @DisplayName("TC-U-004 [P2][Edge] Coordinates ~4 993 m from centre (just inside boundary) → passes")
    void createPoi_coordinatesNearBoundaryInsideEdge_validationPasses() {
        stubVendorFound();
        stubShopRow(VENDOR_ID, null);
        when(poiRepository.findByStatus(PoiStatus.active)).thenReturn(List.of());
        Poi saved = savedPoi(3);
        when(poiRepository.save(any(Poi.class))).thenReturn(saved);
        when(poiMapper.toResponse(saved)).thenReturn(poiResponse(3));

        // delta_lat = 0.04490° → haversine ≈ 4 993 m < 5 000 m → inside boundary
        CreatePoiRequest request = CreatePoiRequest.builder()
                .name("Gian Hàng Gần Biên")
                .latitude(BigDecimal.valueOf(21.073400))
                .longitude(BigDecimal.valueOf(CENTER_LNG))
                .radius(BigDecimal.valueOf(30.0))
                .shopId(SHOP_ID)
                .build();

        assertThatNoException().isThrownBy(() -> poiService.createPoi(request, VENDOR_EMAIL));
    }

    /**
     * TC-U-005 | Priority: P2 | Type: Edge case
     * Traces to: AC-019 Scenario 1 – tọa độ vừa vượt ra ngoài biên giới (~5 008 m)
     *
     * <p>Test data: lat = 21.073551 → delta = 0.04505° → haversine ≈ 5 008 m &gt; 5 000 m.
     *
     * <p>Expected: {@link IllegalArgumentException} thrown.
     */
    @Test
    @DisplayName("TC-U-005 [P2][Edge] Coordinates ~5 008 m from centre (just outside boundary) → IllegalArgumentException")
    void createPoi_coordinatesJustOutsideBoundary_throwsIllegalArgumentException() {
        // delta_lat = 0.04505° → haversine ≈ 5 008 m > 5 000 m → outside boundary
        CreatePoiRequest request = CreatePoiRequest.builder()
                .name("Gian Hàng Ngoài Biên")
                .latitude(BigDecimal.valueOf(21.073551))
                .longitude(BigDecimal.valueOf(CENTER_LNG))
                .radius(BigDecimal.valueOf(30.0))
                .shopId(SHOP_ID)
                .build();

        assertThatThrownBy(() -> poiService.createPoi(request, VENDOR_EMAIL))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("outside the permitted food-street area");

        verifyNoInteractions(poiRepository);
    }

    // =========================================================================
    // Scenario 2 – Vendor & shop validation
    // =========================================================================

    /**
     * TC-U-006 | Priority: P1 | Type: Negative
     * Traces to: AC-019 Scenario 2 – vendor phải tồn tại trong hệ thống
     *
     * <p>Precondition: the email does not match any user record.
     *
     * <p>Expected: {@link UserNotFoundException} thrown; no POI is persisted.
     */
    @Test
    @DisplayName("TC-U-006 [P1][Negative] Unknown vendor email → UserNotFoundException; no DB write")
    void createPoi_vendorEmailNotFound_throwsUserNotFoundException() {
        when(jdbcTemplate.queryForObject(
                eq("SELECT user_id FROM user WHERE email = ?"),
                eq(Integer.class),
                eq(VENDOR_EMAIL)
        )).thenThrow(new EmptyResultDataAccessException(1));

        assertThatThrownBy(() -> poiService.createPoi(validRequest(), VENDOR_EMAIL))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("Vendor not found");

        verifyNoInteractions(poiRepository);
    }

    /**
     * TC-U-007 | Priority: P1 | Type: Negative
     * Traces to: AC-019 Scenario 2 – gian hàng phải tồn tại
     *
     * <p>Precondition: the shopId does not match any row in the shop table.
     *
     * <p>Expected: {@link ShopNotFoundException} thrown.
     */
    @Test
    @DisplayName("TC-U-007 [P1][Negative] Non-existent shopId → ShopNotFoundException")
    void createPoi_shopNotFound_throwsShopNotFoundException() {
        stubVendorFound();
        when(jdbcTemplate.queryForList(
                eq("SELECT vendor_id, poi_id FROM shop WHERE shop_id = ?"),
                eq((Object) SHOP_ID)
        )).thenReturn(List.of());

        assertThatThrownBy(() -> poiService.createPoi(validRequest(), VENDOR_EMAIL))
                .isInstanceOf(ShopNotFoundException.class)
                .hasMessageContaining("Shop not found");

        verifyNoInteractions(poiRepository);
    }

    /**
     * TC-U-008 | Priority: P1 | Type: Negative
     * Traces to: AC-019 Scenario 2 – gian hàng phải thuộc về vendor đang đăng nhập
     *
     * <p>Precondition: the shop's vendor_id (99) differs from the authenticated vendor's id (1).
     *
     * <p>Expected: {@link IllegalArgumentException} thrown; no POI is persisted.
     */
    @Test
    @DisplayName("TC-U-008 [P1][Negative] Shop belongs to a different vendor → IllegalArgumentException")
    void createPoi_shopBelongsToDifferentVendor_throwsIllegalArgumentException() {
        stubVendorFound();
        stubShopRow(99, null); // vendor_id=99 ≠ VENDOR_ID=1

        assertThatThrownBy(() -> poiService.createPoi(validRequest(), VENDOR_EMAIL))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not belong to this vendor");

        verifyNoInteractions(poiRepository);
    }

    /**
     * TC-U-009 | Priority: P1 | Type: Negative
     * Traces to: AC-019 Scenario 2 – mỗi gian hàng chỉ có thể liên kết một POI
     *
     * <p>Precondition: the shop already has poi_id = 5 (non-null).
     *
     * <p>Expected: {@link ShopAlreadyHasPoiException} thrown; no new POI is persisted.
     */
    @Test
    @DisplayName("TC-U-009 [P1][Negative] Shop already linked to a POI → ShopAlreadyHasPoiException")
    void createPoi_shopAlreadyHasPoi_throwsShopAlreadyHasPoiException() {
        stubVendorFound();
        stubShopRow(VENDOR_ID, 5); // poi_id = 5 (non-null → already linked)

        assertThatThrownBy(() -> poiService.createPoi(validRequest(), VENDOR_EMAIL))
                .isInstanceOf(ShopAlreadyHasPoiException.class)
                .hasMessageContaining("already has a POI");

        verifyNoInteractions(poiRepository);
    }

    // =========================================================================
    // Scenario 2 – Proximity conflict (no two POIs within 5 m)
    // =========================================================================

    /**
     * TC-U-010 | Priority: P1 | Type: Negative
     * Traces to: AC-019 Scenario 2 – không tạo POI trùng vị trí (khoảng cách &lt; 5 m)
     *
     * <p>Precondition: an active POI already exists at the exact same coordinates (distance = 0 m).
     *
     * <p>Expected: {@link DuplicatePoiLocationException} thrown; no new POI is saved.
     */
    @Test
    @DisplayName("TC-U-010 [P1][Negative] Existing active POI at same location (0 m) → DuplicatePoiLocationException")
    void createPoi_existingPoiAtSameLocation_throwsDuplicatePoiLocationException() {
        stubVendorFound();
        stubShopRow(VENDOR_ID, null);

        Poi conflictingPoi = Poi.builder()
                .poiId(99)
                .latitude(INSIDE_LAT)  // same as validRequest()
                .longitude(INSIDE_LNG)
                .status(PoiStatus.active)
                .build();
        when(poiRepository.findByStatus(PoiStatus.active)).thenReturn(List.of(conflictingPoi));

        assertThatThrownBy(() -> poiService.createPoi(validRequest(), VENDOR_EMAIL))
                .isInstanceOf(DuplicatePoiLocationException.class)
                .hasMessageContaining("within 5 metres");

        verify(poiRepository, never()).save(any());
    }

    /**
     * TC-U-011 | Priority: P2 | Type: Edge case
     * Traces to: AC-019 Scenario 2 – ngưỡng 5 m là loại trừ (strictly &lt; 5 m)
     *
     * <p>Precondition: an existing active POI is placed at lat = 21.028545,
     * which is delta_lat = 0.000045° from the new POI location at the boundary
     * centre → haversine ≈ 5.003 m. Since 5.003 is NOT &lt; 5.0, no conflict.
     *
     * <p>Expected: no {@link DuplicatePoiLocationException}; POI is created.
     */
    @Test
    @DisplayName("TC-U-011 [P2][Edge] Existing POI at ~5.003 m (exclusive threshold) → no conflict, POI created")
    void createPoi_existingPoiAtApproximately5mDistance_noProximityConflict() {
        stubVendorFound();
        stubShopRow(VENDOR_ID, null);

        // delta_lat = 0.000045° → haversine ≈ 5.003 m → NOT < 5.0 → no conflict
        Poi nearbyPoi = Poi.builder()
                .poiId(88)
                .latitude(BigDecimal.valueOf(21.028545))
                .longitude(BigDecimal.valueOf(CENTER_LNG))
                .status(PoiStatus.active)
                .build();
        when(poiRepository.findByStatus(PoiStatus.active)).thenReturn(List.of(nearbyPoi));

        // New POI at centre → distance to nearbyPoi ≈ 5.003 m ≥ 5.0 → allowed
        CreatePoiRequest request = CreatePoiRequest.builder()
                .name("Gian Hàng Cách 5m")
                .latitude(BigDecimal.valueOf(CENTER_LAT))
                .longitude(BigDecimal.valueOf(CENTER_LNG))
                .radius(BigDecimal.valueOf(30.0))
                .shopId(SHOP_ID)
                .build();

        Poi saved = savedPoi(4);
        when(poiRepository.save(any(Poi.class))).thenReturn(saved);
        when(poiMapper.toResponse(saved)).thenReturn(poiResponse(4));

        assertThatNoException().isThrownBy(() -> poiService.createPoi(request, VENDOR_EMAIL));
    }

    // =========================================================================
    // Scenario 2 – POI status
    // =========================================================================

    /**
     * TC-U-012 | Priority: P2 | Type: Happy path
     * Traces to: AC-019 Scenario 2 – POI mới phải có trạng thái active (FR-PM-001)
     *
     * <p>Expected: the entity argument passed to {@code PoiRepository.save} has
     * {@code status = PoiStatus.active}.
     */
    @Test
    @DisplayName("TC-U-012 [P2][Happy] Newly created POI is persisted with status = active")
    void createPoi_newPoi_savedWithActiveStatus() {
        stubVendorFound();
        stubShopRow(VENDOR_ID, null);
        when(poiRepository.findByStatus(PoiStatus.active)).thenReturn(List.of());
        Poi saved = savedPoi(5);
        when(poiRepository.save(any(Poi.class))).thenReturn(saved);
        when(poiMapper.toResponse(saved)).thenReturn(poiResponse(5));

        poiService.createPoi(validRequest(), VENDOR_EMAIL);

        ArgumentCaptor<Poi> captor = ArgumentCaptor.forClass(Poi.class);
        verify(poiRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(PoiStatus.active);
    }
}
