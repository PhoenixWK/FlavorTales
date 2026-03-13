package com.flavortales.poi.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flavortales.common.exception.DuplicatePoiLocationException;
import com.flavortales.common.exception.GlobalExceptionHandler;
import com.flavortales.common.exception.PoiNotFoundException;
import com.flavortales.common.exception.ShopAlreadyHasPoiException;
import com.flavortales.common.exception.ShopNotFoundException;
import com.flavortales.poi.dto.PoiResponse;
import com.flavortales.poi.dto.UpdatePoiRequest;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Controller-layer integration (slice) tests for
 * {@link PoiController#updatePoi(Integer, UpdatePoiRequest, org.springframework.security.core.Authentication)}.
 *
 * <p>Uses {@code @WebMvcTest} so only the Web MVC layer is loaded.
 * The service is replaced by a {@code @MockBean}. {@link GlobalExceptionHandler} is
 * imported so domain exceptions are mapped to the correct HTTP status codes.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>User Story  : US-020 – Vendor chỉnh sửa POI</li>
 *   <li>Use Case    : UC-020 – Modify POI</li>
 *   <li>Requirement : FR-PM-004 – Update POI</li>
 *   <li>SRS         : SRS-POI-002 – Vendor can modify display name and coordinates of an owned POI</li>
 *   <li>AC          : AC-020
 *     <ul>
 *       <li>Scenario 1 (Basic Flow)  – 200 OK and updated POI in response body</li>
 *       <li>Scenario 2 (A1)         – Partial body accepted; system processes without error</li>
 *       <li>Scenario 3 (E1)         – Invalid data → error response with correct HTTP status</li>
 *     </ul>
 *   </li>
 * </ul>
 *
 * <p><b>Test categories covered</b>: happy path, alternative flow (A1),
 * negative (access control + validation + domain exceptions), edge case, bug-finder.
 */
@WebMvcTest(PoiController.class)
@Import(GlobalExceptionHandler.class)
class PoiUpdateControllerTest {

    private static final int     POI_ID       = 42;
    private static final String  VENDOR_EMAIL = "vendor@flavortales.vn";

    @Autowired private MockMvc      mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean  private PoiService   poiService;

    // ── Test-data helpers ─────────────────────────────────────────────────────

    /** Fully-populated valid {@link UpdatePoiRequest}. */
    private UpdatePoiRequest validRequest() {
        return UpdatePoiRequest.builder()
                .name("Phở Đặc Biệt")
                .latitude(BigDecimal.valueOf(21.028700))
                .longitude(BigDecimal.valueOf(105.854300))
                .radius(BigDecimal.valueOf(50.0))
                .build();
    }

    private PoiResponse samplePoiResponse() {
        PoiResponse r = new PoiResponse();
        r.setPoiId(POI_ID);
        r.setName("Phở Đặc Biệt");
        r.setLatitude(BigDecimal.valueOf(21.028700));
        r.setLongitude(BigDecimal.valueOf(105.854300));
        r.setRadius(BigDecimal.valueOf(50.0));
        r.setStatus("active");
        r.setLinkedShopId(10);
        return r;
    }

    // =========================================================================
    // TC-I-010 to TC-I-012 – Role-based access control (AC-020 Scenario 1)
    // =========================================================================

    /**
     * TC-I-010 | Priority: P1 | Type: Happy path
     * Traces to: UC-020 Step 5–6, FR-PM-004, AC-020 Scenario 1
     *
     * <p>Precondition: user authenticated as ROLE_vendor; service returns updated POI.
     *
     * <p>Steps:
     * <ol>
     *   <li>PUT /api/poi/{poiId} with a valid body as ROLE_vendor.</li>
     * </ol>
     *
     * <p>Expected: HTTP 200 OK; response body contains {@code success=true},
     * updated {@code name}, {@code poiId}, and {@code status="active"}.
     */
    @Test
    @WithMockUser(username = VENDOR_EMAIL, roles = "vendor")
    @DisplayName("TC-I-010 [P1][Happy] ROLE_vendor + valid body → 200 OK with updated POI in body")
    void updatePoi_roleVendorWithValidBody_returns200Ok() throws Exception {
        when(poiService.updatePoi(anyInt(), any(UpdatePoiRequest.class), anyString()))
                .thenReturn(samplePoiResponse());

        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.poiId").value(POI_ID))
                .andExpect(jsonPath("$.data.name").value("Phở Đặc Biệt"))
                .andExpect(jsonPath("$.data.status").value("active"))
                .andExpect(jsonPath("$.data.linkedShopId").value(10));
    }

    /**
     * TC-I-011 | Priority: P1 | Type: Negative (access control)
     * Traces to: FR-PM-004 – chỉ vendor mới được cập nhật POI, AC-020 Scenario 3 (E1)
     *
     * <p>Precondition: user authenticated with ROLE_customer.
     *
     * <p>Steps: PUT /api/poi/{poiId} with a valid body as ROLE_customer.
     *
     * <p>Expected: HTTP 403 Forbidden; service is never called.
     */
    @Test
    @WithMockUser(username = "customer@flavortales.vn", roles = "customer")
    @DisplayName("TC-I-011 [P1][Negative] ROLE_customer → 403 Forbidden; service not called")
    void updatePoi_roleCustomer_returns403Forbidden() throws Exception {
        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isForbidden());

        verify(poiService, never()).updatePoi(anyInt(), any(), anyString());
    }

    /**
     * TC-I-012 | Priority: P1 | Type: Negative (access control)
     * Traces to: FR-PM-004 – yêu cầu phải có JWT hợp lệ, AC-020 Scenario 3 (E1)
     *
     * <p>Precondition: no authentication; request is anonymous.
     *
     * <p>Steps: PUT /api/poi/{poiId} with no authenticated user.
     *
     * <p>Expected: HTTP 401 Unauthorized; service is never called.
     */
    @Test
    @WithAnonymousUser
    @DisplayName("TC-I-012 [P1][Negative] Anonymous request → 401 Unauthorized; service not called")
    void updatePoi_noAuthentication_returns401Unauthorized() throws Exception {
        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isUnauthorized());

        verify(poiService, never()).updatePoi(anyInt(), any(), anyString());
    }

    // =========================================================================
    // TC-I-013 to TC-I-017 – Request-body validation (AC-020 Scenario 3 / E1)
    // =========================================================================

    /**
     * TC-I-013 | Priority: P1 | Type: Negative (validation / E1)
     * Traces to: SRS-POI-002 – tên POI phải có ít nhất 3 ký tự, FR-PM-004
     *
     * <p>Test data: {@code name = "AB"} (2 chars, below the {@code @Size(min=3)} constraint).
     *
     * <p>Expected: HTTP 400 Bad Request; field error on {@code name}.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-013 [P1][Negative/E1] Name length=2 (below min 3) → 400 Bad Request with 'name' error")
    void updatePoi_nameTooShort_returns400BadRequest() throws Exception {
        UpdatePoiRequest request = validRequest();
        request.setName("AB");

        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.name").exists());
    }

    /**
     * TC-I-014 | Priority: P1 | Type: Negative (validation / E1)
     * Traces to: SRS-POI-002 – tên không được vượt quá 100 ký tự, FR-PM-004
     *
     * <p>Test data: name with 101 characters (above the {@code @Size(max=100)} constraint).
     *
     * <p>Expected: HTTP 400 Bad Request; field error on {@code name}.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-014 [P1][Negative/E1] Name length=101 (above max 100) → 400 Bad Request with 'name' error")
    void updatePoi_nameTooLong_returns400BadRequest() throws Exception {
        UpdatePoiRequest request = validRequest();
        request.setName("A".repeat(101)); // 101 chars > max 100

        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.name").exists());
    }

    /**
     * TC-I-015 | Priority: P1 | Type: Negative (validation / E1)
     * Traces to: SRS-POI-002 – bán kính phải ≥ 10 m, FR-PM-004
     *
     * <p>Test data: {@code radius = 5.0} m (below {@code @DecimalMin("10.0")}).
     *
     * <p>Expected: HTTP 400 Bad Request; field error on {@code radius}.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-015 [P1][Negative/E1] Radius=5.0 m (below min 10 m) → 400 Bad Request with 'radius' error")
    void updatePoi_radiusBelowMinimum_returns400BadRequest() throws Exception {
        UpdatePoiRequest request = validRequest();
        request.setRadius(BigDecimal.valueOf(5.0));

        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.radius").exists());
    }

    /**
     * TC-I-016 | Priority: P1 | Type: Negative (validation / E1)
     * Traces to: SRS-POI-002 – vĩ độ phải trong khoảng [-90, 90], FR-PM-004
     *
     * <p>Test data: {@code latitude = 91.0} (above {@code @DecimalMax("90.0")}).
     *
     * <p>Expected: HTTP 400 Bad Request; field error on {@code latitude}.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-016 [P1][Negative/E1] Latitude=91.0 (above max 90) → 400 Bad Request with 'latitude' error")
    void updatePoi_latitudeOutOfRange_returns400BadRequest() throws Exception {
        UpdatePoiRequest request = validRequest();
        request.setLatitude(BigDecimal.valueOf(91.0));

        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.latitude").exists());
    }

    /**
     * TC-I-017 | Priority: P1 | Type: Negative (validation / E1)
     * Traces to: SRS-POI-002 – kinh độ phải trong khoảng [-180, 180], FR-PM-004
     *
     * <p>Test data: {@code longitude = 181.0} (above {@code @DecimalMax("180.0")}).
     *
     * <p>Expected: HTTP 400 Bad Request; field error on {@code longitude}.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-017 [P1][Negative/E1] Longitude=181.0 (above max 180) → 400 Bad Request with 'longitude' error")
    void updatePoi_longitudeOutOfRange_returns400BadRequest() throws Exception {
        UpdatePoiRequest request = validRequest();
        request.setLongitude(BigDecimal.valueOf(181.0));

        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.longitude").exists());
    }

    // =========================================================================
    // TC-I-018 to TC-I-022 – Domain exception mapping (AC-020 Scenario 3 / E1)
    // =========================================================================

    /**
     * TC-I-018 | Priority: P1 | Type: Negative (E1 – POI not found)
     * Traces to: UC-020 Step 2, FR-PM-004, AC-020 Scenario 3
     *
     * <p>Precondition: service throws {@link PoiNotFoundException} (poiId does not exist).
     *
     * <p>Expected: HTTP 404 Not Found; response body contains {@code success=false}
     * and the error message.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-018 [P1][Negative/E1] Service → PoiNotFoundException → 404 Not Found")
    void updatePoi_serviceThrowsPoiNotFoundException_returns404NotFound() throws Exception {
        when(poiService.updatePoi(anyInt(), any(UpdatePoiRequest.class), anyString()))
                .thenThrow(new PoiNotFoundException("POI not found with id: " + POI_ID));

        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    /**
     * TC-I-019 | Priority: P1 | Type: Negative (E1 – ownership violation)
     * Traces to: UC-020 ownership check, FR-PM-004, AC-020 Scenario 3
     *
     * <p>Precondition: service throws {@link IllegalArgumentException}
     * because POI belongs to a different vendor.
     *
     * <p>Expected: HTTP 409 Conflict (GlobalExceptionHandler maps
     * {@code IllegalArgumentException} → 409).
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-019 [P1][Negative/E1] Service → IllegalArgumentException (ownership) → 409 Conflict")
    void updatePoi_serviceThrowsIllegalArgumentException_returns409Conflict() throws Exception {
        when(poiService.updatePoi(anyInt(), any(UpdatePoiRequest.class), anyString()))
                .thenThrow(new IllegalArgumentException("You do not own this POI"));

        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("You do not own this POI"));
    }

    /**
     * TC-I-020 | Priority: P1 | Type: Negative (E1 – coordinate conflict)
     * Traces to: UC-020 Step 4 (proximity check), FR-PM-004, AC-020 Scenario 3
     *
     * <p>Precondition: service throws {@link DuplicatePoiLocationException}
     * because another POI exists within 5 m of the new coordinates.
     *
     * <p>Expected: HTTP 409 Conflict.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-020 [P1][Negative/E1] Service → DuplicatePoiLocationException → 409 Conflict")
    void updatePoi_serviceThrowsDuplicatePoiLocationException_returns409Conflict() throws Exception {
        when(poiService.updatePoi(anyInt(), any(UpdatePoiRequest.class), anyString()))
                .thenThrow(new DuplicatePoiLocationException("A POI already exists within 5 metres"));

        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    /**
     * TC-I-021 | Priority: P1 | Type: Negative (E1 – shop not found)
     * Traces to: UC-020 Step 4 (shop validation), FR-PM-004, AC-020 Scenario 3
     *
     * <p>Precondition: the requested shopId does not exist in the database.
     *
     * <p>Expected: HTTP 404 Not Found.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-021 [P1][Negative/E1] Service → ShopNotFoundException → 404 Not Found")
    void updatePoi_serviceThrowsShopNotFoundException_returns404NotFound() throws Exception {
        when(poiService.updatePoi(anyInt(), any(UpdatePoiRequest.class), anyString()))
                .thenThrow(new ShopNotFoundException("Shop not found with id: 99"));

        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    /**
     * TC-I-022 | Priority: P1 | Type: Negative (E1 – shop already linked)
     * Traces to: UC-020 Step 4 (shop validation), FR-PM-004, AC-020 Scenario 3
     *
     * <p>Precondition: the requested shop already has a POI linked.
     *
     * <p>Expected: HTTP 409 Conflict; response body contains error message.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-022 [P1][Negative/E1] Service → ShopAlreadyHasPoiException → 409 Conflict")
    void updatePoi_serviceThrowsShopAlreadyHasPoiException_returns409Conflict() throws Exception {
        when(poiService.updatePoi(anyInt(), any(UpdatePoiRequest.class), anyString()))
                .thenThrow(new ShopAlreadyHasPoiException("Shop already has a POI assigned to it"));

        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    // =========================================================================
    // TC-I-023 to TC-I-025 – Alternative Flow A1 and edge cases
    // =========================================================================

    /**
     * TC-I-023 | Priority: P1 | Type: Alternative flow (A1)
     * Traces to: UC-020 A1 – Các trường không thay đổi giữ nguyên, FR-PM-004, AC-020 Scenario 2
     *
     * <p>Precondition: request body contains only {@code name}; all other fields are null.
     *
     * <p>Steps: PUT /api/poi/{poiId} with a body containing only the name.
     *
     * <p>Expected: HTTP 200 OK — partial body (all-null except name) is valid per
     * the "all-optional" contract of {@link UpdatePoiRequest}; service is invoked.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-023 [P1][A1] Partial body (name only) → 200 OK; service invoked (all fields optional)")
    void updatePoi_partialBodyNameOnly_returns200Ok() throws Exception {
        when(poiService.updatePoi(anyInt(), any(UpdatePoiRequest.class), anyString()))
                .thenReturn(samplePoiResponse());

        UpdatePoiRequest partialRequest = UpdatePoiRequest.builder()
                .name("Phở Đặc Biệt")
                .build();

        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(partialRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    /**
     * TC-I-024 | Priority: P2 | Type: Edge case
     * Traces to: SRS-POI-002 – tên hợp lệ ở đúng giá trị biên (3 ký tự)
     *
     * <p>Test data: {@code name = "Phở"} (exactly 3 chars, the minimum allowed).
     *
     * <p>Expected: HTTP 200 OK; name accepted; no validation error.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-024 [P2][Edge] Name length=3 (exact minimum) → 200 OK; passes validation")
    void updatePoi_nameAtMinimumLength_returns200Ok() throws Exception {
        when(poiService.updatePoi(anyInt(), any(UpdatePoiRequest.class), anyString()))
                .thenReturn(samplePoiResponse());

        UpdatePoiRequest request = validRequest();
        request.setName("Phở"); // exactly 3 characters

        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    /**
     * TC-I-025 | Priority: P2 | Type: Edge case
     * Traces to: SRS-POI-002 – tên hợp lệ ở đúng giá trị biên tối đa (100 ký tự)
     *
     * <p>Test data: name with exactly 100 characters.
     *
     * <p>Expected: HTTP 200 OK; name accepted.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-025 [P2][Edge] Name length=100 (exact maximum) → 200 OK; passes validation")
    void updatePoi_nameAtMaximumLength_returns200Ok() throws Exception {
        when(poiService.updatePoi(anyInt(), any(UpdatePoiRequest.class), anyString()))
                .thenReturn(samplePoiResponse());

        UpdatePoiRequest request = validRequest();
        request.setName("A".repeat(100)); // exactly 100 characters

        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    /**
     * TC-I-026 | Priority: P2 | Type: Edge case
     * Traces to: SRS-POI-002 – bán kính hợp lệ tại đúng giá trị biên (10 m)
     *
     * <p>Test data: {@code radius = 10.0} m (exact minimum).
     *
     * <p>Expected: HTTP 200 OK; radius accepted at the inclusive boundary.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-026 [P2][Edge] Radius=10.0 m (exact minimum) → 200 OK; passes validation")
    void updatePoi_radiusAtMinimumBoundary_returns200Ok() throws Exception {
        when(poiService.updatePoi(anyInt(), any(UpdatePoiRequest.class), anyString()))
                .thenReturn(samplePoiResponse());

        UpdatePoiRequest request = validRequest();
        request.setRadius(BigDecimal.valueOf(10.0));

        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    /**
     * TC-I-027 | Priority: P2 | Type: BUG FINDER
     * Traces to: SRS-POI-002 – bán kính tối đa theo AC-020 là 100 m, nhưng code cho phép 200 m
     *
     * <p><b>Discrepancy detected</b>:
     * <ul>
     *   <li>AC-020 specifies the valid radius range as <b>10–100 m</b>.</li>
     *   <li>{@link UpdatePoiRequest} uses {@code @DecimalMax("200.0")}, allowing up to 200 m.</li>
     * </ul>
     *
     * <p>Test data: {@code radius = 150.0} m — accepted by the code's annotation
     * but violates the AC upper bound of 100 m.
     *
     * <p>Expected per AC-020: HTTP 400 Bad Request.<br>
     * Actual (current code): HTTP 200 OK — <b>this assertion intentionally asserts 200
     * to document the current (buggy) behaviour and will serve as a regression signal
     * once {@code @DecimalMax("200.0")} is corrected to {@code @DecimalMax("100.0")}
     * in {@link UpdatePoiRequest}</b>.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-027 [P2][BUG] Radius=150 m exceeds AC-020 max of 100 m → code accepts (bug documented)")
    void updatePoi_radiusExceedsAcLimit_currentCodeAccepts200_bugDocumented() throws Exception {
        when(poiService.updatePoi(anyInt(), any(UpdatePoiRequest.class), anyString()))
                .thenReturn(samplePoiResponse());

        UpdatePoiRequest request = validRequest();
        request.setRadius(BigDecimal.valueOf(150.0)); // > AC max (100 m), ≤ code max (200 m)

        // Documents current (incorrect) behaviour – should be 400 per AC-020
        mockMvc.perform(put("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk()); // BUG: should be 400 Bad Request per AC-020
    }
}
