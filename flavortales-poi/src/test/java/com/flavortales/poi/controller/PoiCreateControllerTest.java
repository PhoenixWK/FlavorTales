package com.flavortales.poi.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flavortales.common.exception.GlobalExceptionHandler;
import com.flavortales.poi.dto.CreatePoiRequest;
import com.flavortales.poi.dto.PoiResponse;
import com.flavortales.poi.service.PoiService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller-layer integration (slice) tests for
 * {@link PoiController#createPoi(CreatePoiRequest, org.springframework.security.core.Authentication)}.
 *
 * <p>Uses {@code @WebMvcTest} so only the Web MVC layer is loaded.
 * The service is replaced by a {@code @MockBean}. {@link GlobalExceptionHandler} is
 * imported so domain exceptions are mapped to the correct HTTP status codes.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>User Story  : US-018 – Vendor tạo POI &amp; gian hàng</li>
 *   <li>Use Case    : UC-018 – Create POI</li>
 *   <li>Requirement : FR-PM-001 – Create POI with linked shop</li>
 *   <li>AC          : AC-018
 *     <ul>
 *       <li>Scenario 1 (Basic Flow) – 201 Created, status=pending, linkedShopId set</li>
 *       <li>Scenario 2 (E1)        – Coordinates outside zone → 400 Bad Request</li>
 *       <li>Scenario 3 (A1)        – Audio IDs are optional; null → 201 Created</li>
 *       <li>Scenario 4 (E2 image)  – More than 5 additionalImageIds → 400 Bad Request</li>
 *     </ul>
 *   </li>
 * </ul>
 *
 * <p><b>Test categories</b>: happy path, negative (access control + validation + domain), edge case, bug-finder.
 */
@WebMvcTest(PoiController.class)
@Import(GlobalExceptionHandler.class)
class PoiCreateControllerTest {

    private static final String  VENDOR_EMAIL = "vendor@flavortales.vn";
    private static final int     SHOP_ID      = 100;

    @Autowired private MockMvc      mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean  private PoiService   poiService;

    // ── Test-data helpers ─────────────────────────────────────────────────────

    /** Minimal valid request that satisfies all Bean Validation constraints. */
    private CreatePoiRequest validRequest() {
        return CreatePoiRequest.builder()
                .name("Bun Bo Gan Troi")
                .latitude(BigDecimal.valueOf(21.028700))
                .longitude(BigDecimal.valueOf(105.854300))
                .radius(50)
                .shopName("Tiem Bun Bo Gan Troi")
                .shopDescription("Quan bun bo dac san Hue, gia truyen 30 nam.")
                .avatarFileId(201)
                .build();
    }

    private PoiResponse samplePoiResponse() {
        PoiResponse r = new PoiResponse();
        r.setPoiId(10);
        r.setName("Bun Bo Gan Troi");
        r.setStatus("pending");
        r.setLinkedShopId(SHOP_ID);
        r.setLinkedShopName("Tiem Bun Bo Gan Troi");
        r.setMessage("Tao gian hang thanh cong, dang cho duyet");
        return r;
    }

    private String toJson(Object obj) throws Exception {
        return objectMapper.writeValueAsString(obj);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  SC-1 – Happy path
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * TC-S01-I-001 [P1][Happy]
     * GIVEN an authenticated vendor with a fully valid request body
     * WHEN  POST /api/poi is called
     * THEN  the response is 201 Created with {@code success=true},
     *        {@code data.status="pending"}, and {@code data.linkedShopId=100}.
     */
    @Test
    @WithMockUser(roles = "vendor", username = VENDOR_EMAIL)
    @DisplayName("TC-S01-I-001 [P1][Happy] Valid request → 201, success=true, status=pending, linkedShopId")
    void tc_s01_i001_validRequest_returns201WithPendingStatus() throws Exception {
        when(poiService.createPoi(any(CreatePoiRequest.class), anyString()))
                .thenReturn(samplePoiResponse());

        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("pending"))
                .andExpect(jsonPath("$.data.linkedShopId").value(SHOP_ID));
    }

    /**
     * TC-S01-I-002 [P1][Negative]
     * GIVEN an unauthenticated request
     * WHEN  POST /api/poi is called
     * THEN  the response is 401 Unauthorized.
     */
    @Test
    @WithAnonymousUser
    @DisplayName("TC-S01-I-002 [P1][Negative] Unauthenticated → 401 Unauthorized")
    void tc_s01_i002_unauthenticated_returns401() throws Exception {
        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validRequest())))
                .andExpect(status().isUnauthorized());
    }

    /**
     * TC-S01-I-003 [P1][Negative]
     * GIVEN a request authenticated as a customer (not a vendor)
     * WHEN  POST /api/poi is called
     * THEN  the response is 403 Forbidden.
     */
    @Test
    @WithMockUser(roles = "customer", username = "customer@test.vn")
    @DisplayName("TC-S01-I-003 [P1][Negative] Customer role → 403 Forbidden")
    void tc_s01_i003_customerRole_returns403() throws Exception {
        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validRequest())))
                .andExpect(status().isForbidden());
    }

    /**
     * TC-S01-I-004 [P1][Negative]
     * GIVEN a request where {@code name} is blank (only whitespace)
     * WHEN  POST /api/poi is called
     * THEN  the response is 400 Bad Request and validation error for {@code name} is present.
     */
    @Test
    @WithMockUser(roles = "vendor", username = VENDOR_EMAIL)
    @DisplayName("TC-S01-I-004 [P1][Negative] Blank name → 400, name error in response")
    void tc_s01_i004_blankName_returns400WithNameError() throws Exception {
        CreatePoiRequest req = CreatePoiRequest.builder()
                .name("   ")
                .latitude(BigDecimal.valueOf(21.028700))
                .longitude(BigDecimal.valueOf(105.854300))
                .radius(50)
                .shopName("Tiem Bun Bo Gan Troi")
                .shopDescription("Quan bun bo dac san Hue, gia truyen 30 nam.")
                .avatarFileId(201)
                .build();

        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.name").exists());
    }

    /**
     * TC-S01-I-005 [P2][Negative]
     * GIVEN a request where {@code name} has only 2 characters (below @Size(min=3))
     * WHEN  POST /api/poi is called
     * THEN  the response is 400 Bad Request.
     */
    @Test
    @WithMockUser(roles = "vendor", username = VENDOR_EMAIL)
    @DisplayName("TC-S01-I-005 [P2][Negative] Name too short (2 chars) → 400")
    void tc_s01_i005_nameTooShort_returns400() throws Exception {
        CreatePoiRequest req = CreatePoiRequest.builder()
                .name("AB")
                .latitude(BigDecimal.valueOf(21.028700))
                .longitude(BigDecimal.valueOf(105.854300))
                .radius(50)
                .shopName("Tiem Bun Bo Gan Troi")
                .shopDescription("Quan bun bo dac san Hue, gia truyen 30 nam.")
                .avatarFileId(201)
                .build();

        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(req)))
                .andExpect(status().isBadRequest());
    }

    /**
     * TC-S01-I-006 [P1][Negative]
     * GIVEN a request where {@code avatarFileId} is null (@NotNull)
     * WHEN  POST /api/poi is called
     * THEN  the response is 400 Bad Request and validation error for {@code avatarFileId}.
     */
    @Test
    @WithMockUser(roles = "vendor", username = VENDOR_EMAIL)
    @DisplayName("TC-S01-I-006 [P1][Negative] Null avatarFileId → 400, avatarFileId error in response")
    void tc_s01_i006_nullAvatarFileId_returns400() throws Exception {
        CreatePoiRequest req = CreatePoiRequest.builder()
                .name("Bun Bo Gan Troi")
                .latitude(BigDecimal.valueOf(21.028700))
                .longitude(BigDecimal.valueOf(105.854300))
                .radius(50)
                .shopName("Tiem Bun Bo Gan Troi")
                .shopDescription("Quan bun bo dac san Hue, gia truyen 30 nam.")
                .avatarFileId(null)
                .build();

        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.avatarFileId").exists());
    }

    /**
     * TC-S01-I-007 [P1][Negative]
     * GIVEN a request where {@code latitude} is null (@NotNull)
     * WHEN  POST /api/poi is called
     * THEN  the response is 400 Bad Request.
     */
    @Test
    @WithMockUser(roles = "vendor", username = VENDOR_EMAIL)
    @DisplayName("TC-S01-I-007 [P1][Negative] Null latitude → 400")
    void tc_s01_i007_nullLatitude_returns400() throws Exception {
        CreatePoiRequest req = CreatePoiRequest.builder()
                .name("Bun Bo Gan Troi")
                .latitude(null)
                .longitude(BigDecimal.valueOf(105.854300))
                .radius(50)
                .shopName("Tiem Bun Bo Gan Troi")
                .shopDescription("Quan bun bo dac san Hue, gia truyen 30 nam.")
                .avatarFileId(201)
                .build();

        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(req)))
                .andExpect(status().isBadRequest());
    }

    /**
     * TC-S01-I-008 [P1][Negative]
     * GIVEN a request where {@code radius} = 9 (below @Min(10))
     * WHEN  POST /api/poi is called
     * THEN  the response is 400 Bad Request and validation error for {@code radius}.
     */
    @Test
    @WithMockUser(roles = "vendor", username = VENDOR_EMAIL)
    @DisplayName("TC-S01-I-008 [P1][Negative] radius=9 (below min) → 400, radius error in response")
    void tc_s01_i008_radiusBelowMin_returns400() throws Exception {
        CreatePoiRequest req = CreatePoiRequest.builder()
                .name("Bun Bo Gan Troi")
                .latitude(BigDecimal.valueOf(21.028700))
                .longitude(BigDecimal.valueOf(105.854300))
                .radius(9)
                .shopName("Tiem Bun Bo Gan Troi")
                .shopDescription("Quan bun bo dac san Hue, gia truyen 30 nam.")
                .avatarFileId(201)
                .build();

        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.radius").exists());
    }

    /**
     * TC-S01-I-009 [P1][Negative]
     * GIVEN a request where {@code radius} = 101 (above @Max(100))
     * WHEN  POST /api/poi is called
     * THEN  the response is 400 Bad Request and validation error for {@code radius}.
     */
    @Test
    @WithMockUser(roles = "vendor", username = VENDOR_EMAIL)
    @DisplayName("TC-S01-I-009 [P1][Negative] radius=101 (above max) → 400, radius error in response")
    void tc_s01_i009_radiusAboveMax_returns400() throws Exception {
        CreatePoiRequest req = CreatePoiRequest.builder()
                .name("Bun Bo Gan Troi")
                .latitude(BigDecimal.valueOf(21.028700))
                .longitude(BigDecimal.valueOf(105.854300))
                .radius(101)
                .shopName("Tiem Bun Bo Gan Troi")
                .shopDescription("Quan bun bo dac san Hue, gia truyen 30 nam.")
                .avatarFileId(201)
                .build();

        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.radius").exists());
    }

    /**
     * TC-S01-I-010 [P1][Negative]
     * GIVEN a request where {@code shopName} is blank
     * WHEN  POST /api/poi is called
     * THEN  the response is 400 Bad Request and validation error for {@code shopName}.
     */
    @Test
    @WithMockUser(roles = "vendor", username = VENDOR_EMAIL)
    @DisplayName("TC-S01-I-010 [P1][Negative] Blank shopName → 400, shopName error in response")
    void tc_s01_i010_blankShopName_returns400() throws Exception {
        CreatePoiRequest req = CreatePoiRequest.builder()
                .name("Bun Bo Gan Troi")
                .latitude(BigDecimal.valueOf(21.028700))
                .longitude(BigDecimal.valueOf(105.854300))
                .radius(50)
                .shopName("   ")
                .shopDescription("Quan bun bo dac san Hue, gia truyen 30 nam.")
                .avatarFileId(201)
                .build();

        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.shopName").exists());
    }

    /**
     * TC-S01-I-011 [P2][Negative]
     * GIVEN a request where {@code shopDescription} is blank (@NotBlank)
     * WHEN  POST /api/poi is called
     * THEN  the response is 400 Bad Request and validation error for {@code shopDescription}.
     */
    @Test
    @WithMockUser(roles = "vendor", username = VENDOR_EMAIL)
    @DisplayName("TC-S01-I-011 [P2][Negative] Blank shopDescription → 400, shopDescription error")
    void tc_s01_i011_blankShopDescription_returns400() throws Exception {
        CreatePoiRequest req = CreatePoiRequest.builder()
                .name("Bun Bo Gan Troi")
                .latitude(BigDecimal.valueOf(21.028700))
                .longitude(BigDecimal.valueOf(105.854300))
                .radius(50)
                .shopName("Tiem Bun Bo Gan Troi")
                .shopDescription("   ")
                .avatarFileId(201)
                .build();

        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.shopDescription").exists());
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  SC-2 – Boundary validation (E1)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * TC-S02-I-001 [P1][Negative]
     * GIVEN a vendor-authenticated request where the service throws an
     *        {@link IllegalArgumentException} (coordinates outside zone)
     * WHEN  POST /api/poi is called
     * THEN  the response is 409 Conflict (mapped by {@link GlobalExceptionHandler}).
     *
     * <p>Note: {@link GlobalExceptionHandler} maps {@link IllegalArgumentException}
     * to HTTP 409 Conflict.
     */
    @Test
    @WithMockUser(roles = "vendor", username = VENDOR_EMAIL)
    @DisplayName("TC-S02-I-001 [P1][Negative] Service throws boundary error → 409 Conflict")
    void tc_s02_i001_serviceBoundaryException_returns409() throws Exception {
        when(poiService.createPoi(any(CreatePoiRequest.class), anyString()))
                .thenThrow(new IllegalArgumentException(
                        "Toa do nam ngoai khu pho am thuc (7934.0m, max 5000.0m)"));

        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(validRequest())))
                .andExpect(status().isConflict());
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  SC-3 – Audio IDs optional (A1)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * TC-S03-I-001 [P2][Happy]
     * GIVEN a valid request (audio is uploaded separately after POI creation via the audio API)
     * WHEN  POST /api/poi is called as an authenticated vendor
     * THEN  the response is 201 Created.
     */
    @Test
    @WithMockUser(roles = "vendor", username = VENDOR_EMAIL)
    @DisplayName("TC-S03-I-001 [P2][Happy] Request without audio fields → 201 Created")
    void tc_s03_i001_nullAudioIds_returns201() throws Exception {
        when(poiService.createPoi(any(CreatePoiRequest.class), anyString()))
                .thenReturn(samplePoiResponse());

        CreatePoiRequest req = CreatePoiRequest.builder()
                .name("Bun Bo Gan Troi")
                .latitude(BigDecimal.valueOf(21.028700))
                .longitude(BigDecimal.valueOf(105.854300))
                .radius(50)
                .shopName("Tiem Bun Bo Gan Troi")
                .shopDescription("Quan bun bo dac san Hue, gia truyen 30 nam.")
                .avatarFileId(201)
                .build();

        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  SC-4 – Image upload constraint
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * TC-S04-I-001 [P2][BugFinder]
     * GIVEN a request with 6 additional image IDs (above @Size(max=5))
     * WHEN  POST /api/poi is called as an authenticated vendor
     * THEN  the response is 400 Bad Request and a validation error for
     *        {@code additionalImageIds} is present.
     * <p>Regression guard: ensures the image-count constraint is enforced at the
     * API boundary before the service layer is ever reached.
     */
    @Test
    @WithMockUser(roles = "vendor", username = VENDOR_EMAIL)
    @DisplayName("TC-S04-I-001 [P2][BugFinder] 6 additionalImageIds (max=5) → 400, additionalImageIds error")
    void tc_s04_i001_tooManyAdditionalImages_returns400() throws Exception {
        CreatePoiRequest req = CreatePoiRequest.builder()
                .name("Bun Bo Gan Troi")
                .latitude(BigDecimal.valueOf(21.028700))
                .longitude(BigDecimal.valueOf(105.854300))
                .radius(50)
                .shopName("Tiem Bun Bo Gan Troi")
                .shopDescription("Quan bun bo dac san Hue, gia truyen 30 nam.")
                .avatarFileId(201)
                .additionalImageIds(List.of(1, 2, 3, 4, 5, 6))
                .build();

        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(toJson(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.additionalImageIds").exists());
    }
}
