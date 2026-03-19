package com.flavortales.poi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flavortales.common.exception.DuplicatePoiLocationException;
import com.flavortales.common.exception.UserNotFoundException;
import com.flavortales.notification.service.EmailService;
import com.flavortales.poi.dto.CreatePoiRequest;
import com.flavortales.poi.dto.PoiResponse;
import com.flavortales.poi.entity.Poi;
import com.flavortales.poi.entity.PoiStatus;
import com.flavortales.poi.mapper.PoiMapper;
import com.flavortales.poi.service.PoiCacheService;
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
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
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
 *   <li>User Story  : US-018 – Vendor tạo POI &amp; gian hàng</li>
 *   <li>Use Case    : UC-018 – Create POI</li>
 *   <li>Requirement : FR-PM-001 – Create POI with linked shop</li>
 *   <li>AC          : AC-018
 *     <ul>
 *       <li>Scenario 1 (Basic Flow)     – Valid request → POI status=pending, admin notified</li>
 *       <li>Scenario 2 (E1)             – Coordinates outside zone → boundary error, no DB write</li>
 *       <li>Scenario 3 (A1 – TTS fail)  – Audio IDs optional; success without audio</li>
 *       <li>Scenario 4 (E2/E3)          – Misc validation failures (vendor not found, duplicate name, duplicate location)</li>
 *     </ul>
 *   </li>
 * </ul>
 *
 * <p><b>Test categories</b>: happy path, negative, edge case, bug-finder.
 */
@ExtendWith(MockitoExtension.class)
class PoiCreateServiceTest {

    // ── Boundary constants (must match application.yml) ───────────────────────
    private static final double CENTER_LAT   = 21.028500;
    private static final double CENTER_LNG   = 105.854200;
    private static final double MAX_RADIUS_M = 5000.0;

    // ── Well-known coordinates ─────────────────────────────────────────────────
    /** ~22 m from centre – clearly inside the zone. */
    private static final double INSIDE_LAT = 21.028700;
    private static final double INSIDE_LNG = 105.854300;
    /** ~7 934 m from centre – clearly outside the zone. */
    private static final double OUTSIDE_LAT = 21.100000;
    private static final double OUTSIDE_LNG = 105.854200;
    /** ~4 993 m from centre – just inside the 5 000 m boundary. */
    private static final double EDGE_INSIDE_LAT  = 21.073400;
    /** ~5 008 m from centre – just outside the 5 000 m boundary. */
    private static final double EDGE_OUTSIDE_LAT = 21.073551;

    // ── Misc constants ─────────────────────────────────────────────────────────
    private static final int    VENDOR_ID      = 1;
    private static final int    SHOP_ID        = 100;
    private static final String VENDOR_EMAIL   = "vendor@flavortales.vn";

    // ── Mocks ──────────────────────────────────────────────────────────────────
    @Mock private PoiRepository  poiRepository;
    @Mock private PoiCacheService poiCacheService;
    @Mock private PoiMapper      poiMapper;
    @Mock private JdbcTemplate   jdbcTemplate;
    @Mock private EmailService   emailService;
    @Mock private ObjectMapper   objectMapper;

    @InjectMocks private PoiService poiService;

    // ── Fixtures ───────────────────────────────────────────────────────────────

    @BeforeEach
    void injectBoundaryConfig() {
        ReflectionTestUtils.setField(poiService, "boundaryCenterLat",   CENTER_LAT);
        ReflectionTestUtils.setField(poiService, "boundaryCenterLng",   CENTER_LNG);
        ReflectionTestUtils.setField(poiService, "boundaryMaxRadiusM",  MAX_RADIUS_M);
    }

    /**
     * Fully-populated valid three-step request.
     * Audio IDs are provided; additional images are omitted to keep the stub simple.
     */
    private CreatePoiRequest validRequest() {
        return CreatePoiRequest.builder()
                .name("Bun Bo Gan Troi")
                .latitude(BigDecimal.valueOf(INSIDE_LAT))
                .longitude(BigDecimal.valueOf(INSIDE_LNG))
                .radius(50)
                .shopName("Tiem Bun Bo Gan Troi")
                .shopDescription("Quan bun bo dac san Hue, gia truyen 30 nam.")
                .avatarFileId(201)
                .viAudioFileId(301)
                .enAudioFileId(302)
                .build();
    }

    private Poi savedPoi() {
        return Poi.builder()
                .poiId(10)
                .vendorId(VENDOR_ID)
                .name("Bun Bo Gan Troi")
                .latitude(BigDecimal.valueOf(INSIDE_LAT))
                .longitude(BigDecimal.valueOf(INSIDE_LNG))
                .radius(BigDecimal.valueOf(50))
                .status(PoiStatus.pending)
                .build();
    }

    private PoiResponse basePoiResponse() {
        PoiResponse r = new PoiResponse();
        r.setPoiId(10);
        r.setName("Bun Bo Gan Troi");
        r.setStatus("pending");
        return r;
    }

    /**
     * Configures all collaborators to return happy-path values.
     * Individual tests override only the stub they need to change.
     */
    private void stubHappyPath() {
        // No active POIs → no proximity conflict
        when(poiRepository.findByStatus(PoiStatus.active)).thenReturn(List.of());

        // Shop name does not exist yet
        when(jdbcTemplate.queryForObject(anyString(), eq(Boolean.class), anyString()))
                .thenReturn(Boolean.FALSE);

        // Vendor exists in the user DB
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), anyString()))
                .thenReturn(VENDOR_ID);

        // JPA save returns persisted POI
        when(poiRepository.save(any(Poi.class))).thenReturn(savedPoi());

        // JDBC insert shop with generated key → SHOP_ID
        doAnswer(inv -> {
            KeyHolder kh = inv.getArgument(1);
            kh.getKeyList().add(Map.of("id", (long) SHOP_ID));
            return 1;
        }).when(jdbcTemplate).update(any(PreparedStatementCreator.class), any(KeyHolder.class));

        // Mapper returns base response
        when(poiMapper.toResponse(any(Poi.class))).thenReturn(basePoiResponse());
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  SC-1 – Happy path: valid full request
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * TC-S01-U-001 [P1][Happy]
     * GIVEN a fully valid three-step request with coordinates inside the zone
     * WHEN  createPoi is called
     * THEN  the response carries linkedShopId = SHOP_ID, a non-blank message,
     *        and the admin is notified exactly once.
     */
    @Test
    @DisplayName("TC-S01-U-001 [P1][Happy] Valid full request → linkedShopId set, admin notified")
    void tc_s01_u001_validRequest_returnsLinkedShopIdAndNotifiesAdmin() {
        stubHappyPath();
        CreatePoiRequest req = validRequest();

        PoiResponse result = poiService.createPoi(req, VENDOR_EMAIL);

        assertThat(result.getLinkedShopId()).isEqualTo(SHOP_ID);
        assertThat(result.getMessage()).isNotBlank();
        verify(emailService).sendAdminNewShopNotification(
                eq(req.getShopName()), eq(VENDOR_EMAIL));
    }

    /**
     * TC-S01-U-002 [P1][Happy]
     * GIVEN a valid request
     * WHEN  createPoi is called
     * THEN  the Poi entity passed to {@code poiRepository.save} has status = {@code pending}.
     */
    @Test
    @DisplayName("TC-S01-U-002 [P1][Happy] Saved POI entity must have status=pending")
    void tc_s01_u002_savedPoiHasPendingStatus() {
        stubHappyPath();
        ArgumentCaptor<Poi> captor = ArgumentCaptor.forClass(Poi.class);

        poiService.createPoi(validRequest(), VENDOR_EMAIL);

        verify(poiRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(PoiStatus.pending);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  SC-2 – Boundary validation (E1)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * TC-S02-U-001 [P1][Negative]
     * GIVEN coordinates that are ~7 934 m from the centre (well outside the 5 000 m zone)
     * WHEN  createPoi is called
     * THEN  an {@link IllegalArgumentException} is thrown containing "ngoai" (ASCII-safe
     *        fragment of "ngoai khu pho am thuc")
     *        AND neither the repository nor JDBC template are touched.
     */
    @Test
    @DisplayName("TC-S02-U-001 [P1][Negative] Coordinates outside zone → boundary error, no DB write")
    void tc_s02_u001_outsideCoordinates_throwsBoundaryException() {
        CreatePoiRequest req = CreatePoiRequest.builder()
                .name("Bun Bo Gan Troi")
                .latitude(BigDecimal.valueOf(OUTSIDE_LAT))
                .longitude(BigDecimal.valueOf(OUTSIDE_LNG))
                .radius(50)
                .shopName("Tiem Bun Bo Gan Troi")
                .shopDescription("Quan bun bo dac san Hue, gia truyen 30 nam.")
                .avatarFileId(201)
                .viAudioFileId(301).enAudioFileId(302)
                .build();

        assertThatThrownBy(() -> poiService.createPoi(req, VENDOR_EMAIL))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ngoai");

        verifyNoInteractions(poiRepository, jdbcTemplate);
    }

    /**
     * TC-S02-U-002 [P2][Edge]
     * GIVEN coordinates at the exact centre (0 m from centre)
     * WHEN  createPoi is called
     * THEN  no boundary exception is thrown.
     */
    @Test
    @DisplayName("TC-S02-U-002 [P2][Edge] Centre coordinates (0 m) → within boundary, no exception")
    void tc_s02_u002_centreCoordinates_noBoundaryException() {
        stubHappyPath();
        CreatePoiRequest req = CreatePoiRequest.builder()
                .name("Bun Bo Gan Troi")
                .latitude(BigDecimal.valueOf(CENTER_LAT))
                .longitude(BigDecimal.valueOf(CENTER_LNG))
                .radius(50)
                .shopName("Tiem Bun Bo Gan Troi")
                .shopDescription("Quan bun bo dac san Hue, gia truyen 30 nam.")
                .avatarFileId(201)
                .build();

        assertThatNoException().isThrownBy(() -> poiService.createPoi(req, VENDOR_EMAIL));
    }

    /**
     * TC-S02-U-003 [P2][Edge]
     * GIVEN coordinates ~4 993 m from the centre (just inside the 5 000 m limit)
     * WHEN  createPoi is called
     * THEN  no boundary exception is thrown.
     */
    @Test
    @DisplayName("TC-S02-U-003 [P2][Edge] ~4993 m from centre (just inside) → no boundary exception")
    void tc_s02_u003_justInsideBoundary_noBoundaryException() {
        stubHappyPath();
        CreatePoiRequest req = CreatePoiRequest.builder()
                .name("Bun Bo Gan Troi")
                .latitude(BigDecimal.valueOf(EDGE_INSIDE_LAT))
                .longitude(BigDecimal.valueOf(CENTER_LNG))
                .radius(50)
                .shopName("Tiem Bun Bo Gan Troi")
                .shopDescription("Quan bun bo dac san Hue, gia truyen 30 nam.")
                .avatarFileId(201)
                .build();

        assertThatNoException().isThrownBy(() -> poiService.createPoi(req, VENDOR_EMAIL));
    }

    /**
     * TC-S02-U-004 [P2][Edge]
     * GIVEN coordinates ~5 008 m from the centre (just outside the 5 000 m limit)
     * WHEN  createPoi is called
     * THEN  an {@link IllegalArgumentException} is thrown.
     */
    @Test
    @DisplayName("TC-S02-U-004 [P2][Edge] ~5008 m from centre (just outside) → boundary exception")
    void tc_s02_u004_justOutsideBoundary_throwsBoundaryException() {
        CreatePoiRequest req = CreatePoiRequest.builder()
                .name("Bun Bo Gan Troi")
                .latitude(BigDecimal.valueOf(EDGE_OUTSIDE_LAT))
                .longitude(BigDecimal.valueOf(CENTER_LNG))
                .radius(50)
                .shopName("Tiem Bun Bo Gan Troi")
                .shopDescription("Quan bun bo dac san Hue, gia truyen 30 nam.")
                .avatarFileId(201)
                .build();

        assertThatThrownBy(() -> poiService.createPoi(req, VENDOR_EMAIL))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  SC-3 – Audio IDs optional (A1 – TTS non-blocking)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * TC-S03-U-001 [P1][Happy]
     * GIVEN a valid request with both {@code viAudioFileId} and {@code enAudioFileId} = null
     * WHEN  createPoi is called
     * THEN  the POI and shop are created successfully (audio fields are optional).
     */
    @Test
    @DisplayName("TC-S03-U-001 [P1][Happy] Both audio IDs null → POI created successfully")
    void tc_s03_u001_noAudioIds_poiCreatedSuccessfully() {
        stubHappyPath();
        CreatePoiRequest req = CreatePoiRequest.builder()
                .name("Bun Bo Gan Troi")
                .latitude(BigDecimal.valueOf(INSIDE_LAT))
                .longitude(BigDecimal.valueOf(INSIDE_LNG))
                .radius(50)
                .shopName("Tiem Bun Bo Gan Troi")
                .shopDescription("Quan bun bo dac san Hue, gia truyen 30 nam.")
                .avatarFileId(201)
                .viAudioFileId(null)
                .enAudioFileId(null)
                .build();

        PoiResponse result = poiService.createPoi(req, VENDOR_EMAIL);

        assertThat(result).isNotNull();
        assertThat(result.getLinkedShopId()).isEqualTo(SHOP_ID);
    }

    /**
     * TC-S03-U-002 [P2][Happy]
     * GIVEN a valid request with only {@code viAudioFileId} set and {@code enAudioFileId} = null
     * WHEN  createPoi is called
     * THEN  the POI and shop are created successfully.
     */
    @Test
    @DisplayName("TC-S03-U-002 [P2][Happy] Only viAudioFileId set, enAudioFileId null → success")
    void tc_s03_u002_onlyViAudio_poiCreatedSuccessfully() {
        stubHappyPath();
        CreatePoiRequest req = CreatePoiRequest.builder()
                .name("Bun Bo Gan Troi")
                .latitude(BigDecimal.valueOf(INSIDE_LAT))
                .longitude(BigDecimal.valueOf(INSIDE_LNG))
                .radius(50)
                .shopName("Tiem Bun Bo Gan Troi")
                .shopDescription("Quan bun bo dac san Hue, gia truyen 30 nam.")
                .avatarFileId(201)
                .viAudioFileId(330)
                .enAudioFileId(null)
                .build();

        PoiResponse result = poiService.createPoi(req, VENDOR_EMAIL);

        assertThat(result).isNotNull();
        assertThat(result.getLinkedShopId()).isEqualTo(SHOP_ID);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  SC-4 – Misc failure paths (E2 / E3 / domain guard-rails)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * TC-S04-U-001 [P1][Negative]
     * GIVEN the vendor's e-mail is not found in the user DB
     *        (queryForObject for Integer throws {@link EmptyResultDataAccessException})
     * WHEN  createPoi is called
     * THEN  a {@link UserNotFoundException} containing "Vendor not found" is thrown.
     */
    @Test
    @DisplayName("TC-S04-U-001 [P1][Negative] Vendor email not in DB → UserNotFoundException")
    void tc_s04_u001_vendorNotFound_throwsUserNotFoundException() {
        // Up to the Integer query everything is fine; the Integer query then fails
        when(poiRepository.findByStatus(PoiStatus.active)).thenReturn(List.of());
        when(jdbcTemplate.queryForObject(anyString(), eq(Boolean.class), anyString()))
                .thenReturn(Boolean.FALSE);
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), anyString()))
                .thenThrow(new EmptyResultDataAccessException(1));

        assertThatThrownBy(() -> poiService.createPoi(validRequest(), VENDOR_EMAIL))
                .isInstanceOf(UserNotFoundException.class)
                .hasMessageContaining("Vendor not found");
    }

    /**
     * TC-S04-U-002 [P1][Negative]
     * GIVEN the shop name already exists in the database
     *        (queryForObject for Boolean returns {@code true})
     * WHEN  createPoi is called
     * THEN  an {@link IllegalArgumentException} containing "ton tai" is thrown.
     */
    @Test
    @DisplayName("TC-S04-U-002 [P1][Negative] Duplicate shop name → IllegalArgumentException")
    void tc_s04_u002_duplicateShopName_throwsIllegalArgumentException() {
        when(poiRepository.findByStatus(PoiStatus.active)).thenReturn(List.of());
        when(jdbcTemplate.queryForObject(anyString(), eq(Boolean.class), anyString()))
                .thenReturn(Boolean.TRUE);

        assertThatThrownBy(() -> poiService.createPoi(validRequest(), VENDOR_EMAIL))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ton tai");
    }

    /**
     * TC-S04-U-003 [P1][Negative]
     * GIVEN an active POI that already exists within 5 m of the requested location
     * WHEN  createPoi is called
     * THEN  a {@link DuplicatePoiLocationException} containing "5 metres" is thrown.
     */
    @Test
    @DisplayName("TC-S04-U-003 [P1][Negative] Existing POI within 5 m → DuplicatePoiLocationException")
    void tc_s04_u003_proximityConflict_throwsDuplicatePoiLocationException() {
        // A conflicting POI at exactly the requested coordinates (0 m apart)
        Poi conflicting = Poi.builder()
                .poiId(99)
                .latitude(BigDecimal.valueOf(INSIDE_LAT))
                .longitude(BigDecimal.valueOf(INSIDE_LNG))
                .status(PoiStatus.active)
                .build();
        when(poiRepository.findByStatus(PoiStatus.active)).thenReturn(List.of(conflicting));

        assertThatThrownBy(() -> poiService.createPoi(validRequest(), VENDOR_EMAIL))
                .isInstanceOf(DuplicatePoiLocationException.class)
                .hasMessageContaining("5 metres");
    }

    /**
     * TC-S04-U-004 [P1][BugFinder]
     * GIVEN a successful creation
     * WHEN  createPoi completes
     * THEN  {@link EmailService#sendAdminNewShopNotification} is called with the exact
     *        shop name from the request and the vendor's e-mail.
     * <p>Regression guard: ensures the notification payload is not accidentally swapped
     * or left empty.
     */
    @Test
    @DisplayName("TC-S04-U-004 [P1][BugFinder] Admin email uses exact shopName and vendorEmail")
    void tc_s04_u004_adminNotificationUsesExactShopNameAndEmail() {
        stubHappyPath();
        String expectedShopName = validRequest().getShopName();

        poiService.createPoi(validRequest(), VENDOR_EMAIL);

        verify(emailService, times(1))
                .sendAdminNewShopNotification(eq(expectedShopName), eq(VENDOR_EMAIL));
    }
}
