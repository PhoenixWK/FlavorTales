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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Controller-layer integration (slice) tests for {@link PoiController}.
 *
 * <p>Uses {@code @WebMvcTest} so only the controller and MVC infrastructure are
 * loaded; the service is replaced by a Mockito mock via {@code @MockBean}.
 * {@link GlobalExceptionHandler} is imported so that
 * {@link org.springframework.web.bind.MethodArgumentNotValidException} and domain
 * exceptions are mapped to the correct HTTP status codes.
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
 * <p><b>Test categories covered</b>: happy path, negative (access control + validation), edge case,
 * bug-finder.
 */
@WebMvcTest(PoiController.class)
@Import(GlobalExceptionHandler.class)
class PoiControllerTest {

    @Autowired private MockMvc     mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean  private PoiService  poiService;

    // ── Test-data helpers ─────────────────────────────────────────────────────

    /** Builds a fully-valid {@link CreatePoiRequest}. */
    private CreatePoiRequest validRequest() {
        return CreatePoiRequest.builder()
                .name("Bún Bò Gân Trời")
                .latitude(BigDecimal.valueOf(21.028700))
                .longitude(BigDecimal.valueOf(105.854300))
                .radius(BigDecimal.valueOf(50.0))
                .shopId(10)
                .build();
    }

    private PoiResponse samplePoiResponse() {
        PoiResponse r = new PoiResponse();
        r.setPoiId(1);
        r.setName("Bún Bò Gân Trời");
        r.setLatitude(BigDecimal.valueOf(21.028700));
        r.setLongitude(BigDecimal.valueOf(105.854300));
        r.setRadius(BigDecimal.valueOf(50.0));
        r.setStatus("active");
        r.setLinkedShopId(10);
        return r;
    }

    // =========================================================================
    // TC-I-001 to TC-I-003 – Role-based access control (Scenario 2)
    // =========================================================================

    /**
     * TC-I-001 | Priority: P1 | Type: Happy path
     * Traces to: AC-019 Scenario 2 – vendor đã đăng nhập tạo POI thành công
     *
     * <p>Precondition: user authenticated with ROLE_vendor; service returns a valid response.
     *
     * <p>Steps:
     * <ol>
     *   <li>POST /api/poi with a valid request body as ROLE_vendor.</li>
     * </ol>
     *
     * <p>Expected: HTTP 201 Created; response body contains {@code success=true},
     * {@code poiId}, {@code linkedShopId=10}, and {@code status="active"}.
     */
    @Test
    @WithMockUser(username = "vendor@flavortales.vn", roles = "vendor")
    @DisplayName("TC-I-001 [P1][Happy] ROLE_vendor + valid body → 201 Created with POI in body")
    void createPoi_roleVendorWithValidBody_returns201Created() throws Exception {
        when(poiService.createPoi(any(CreatePoiRequest.class), anyString()))
                .thenReturn(samplePoiResponse());

        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.poiId").value(1))
                .andExpect(jsonPath("$.data.linkedShopId").value(10))
                .andExpect(jsonPath("$.data.status").value("active"));
    }

    /**
     * TC-I-002 | Priority: P1 | Type: Negative (access control)
     * Traces to: AC-019 Scenario 2 – chỉ vendor mới được tạo POI
     *
     * <p>Precondition: user authenticated with ROLE_customer (not vendor).
     *
     * <p>Steps: POST /api/poi with a valid request body as ROLE_customer.
     *
     * <p>Expected: HTTP 403 Forbidden; service is never called.
     */
    @Test
    @WithMockUser(username = "customer@flavortales.vn", roles = "customer")
    @DisplayName("TC-I-002 [P1][Negative] ROLE_customer → 403 Forbidden")
    void createPoi_roleCustomer_returns403Forbidden() throws Exception {
        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isForbidden());
    }

    /**
     * TC-I-003 | Priority: P1 | Type: Negative (access control)
     * Traces to: AC-019 Scenario 2 – yêu cầu không có JWT bị từ chối
     *
     * <p>Precondition: no authentication token; request is anonymous.
     *
     * <p>Steps: POST /api/poi with CSRF but without any authenticated user.
     *
     * <p>Expected: HTTP 401 Unauthorized (Spring Security rejects prior to controller).
     */
    @Test
    @WithAnonymousUser
    @DisplayName("TC-I-003 [P1][Negative] Anonymous request → 401 Unauthorized")
    void createPoi_noAuthentication_returns401Unauthorized() throws Exception {
        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // TC-I-004 to TC-I-006 – Request-body validation (Scenario 1)
    // =========================================================================

    /**
     * TC-I-004 | Priority: P1 | Type: Negative (validation)
     * Traces to: AC-019 Scenario 1 – tên POI là trường bắt buộc
     *
     * <p>Precondition: authenticated as ROLE_vendor; request body has a blank name.
     *
     * <p>Steps: POST /api/poi with {@code name = "  "} (blank string).
     *
     * <p>Expected: HTTP 400 Bad Request; response body contains a validation error
     * for the {@code name} field.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-004 [P1][Negative] Blank POI name → 400 Bad Request with field error on 'name'")
    void createPoi_blankName_returns400BadRequest() throws Exception {
        CreatePoiRequest request = validRequest();
        request.setName("  ");

        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.name").exists());
    }

    /**
     * TC-I-005 | Priority: P2 | Type: Negative (validation)
     * Traces to: AC-019 Scenario 1 – tên POI phải có ít nhất 3 ký tự
     *
     * <p>Precondition: name contains exactly 2 characters (below the minimum of 3).
     *
     * <p>Steps: POST /api/poi with {@code name = "AB"}.
     *
     * <p>Expected: HTTP 400 Bad Request; field error on {@code name}.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-005 [P2][Negative] Name length = 2 (below min 3) → 400 Bad Request")
    void createPoi_nameTooShort_returns400BadRequest() throws Exception {
        CreatePoiRequest request = validRequest();
        request.setName("AB");

        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.name").exists());
    }

    /**
     * TC-I-006 | Priority: P1 | Type: Negative (validation)
     * Traces to: AC-019 Scenario 1 – shopId là trường bắt buộc
     *
     * <p>Precondition: shopId is null in the request body.
     *
     * <p>Steps: POST /api/poi with {@code shopId = null}.
     *
     * <p>Expected: HTTP 400 Bad Request; field error on {@code shopId}.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-006 [P1][Negative] Null shopId → 400 Bad Request with field error on 'shopId'")
    void createPoi_nullShopId_returns400BadRequest() throws Exception {
        CreatePoiRequest request = validRequest();
        request.setShopId(null);

        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.shopId").exists());
    }

    // =========================================================================
    // TC-I-007 to TC-I-008 – Radius validation (Scenario 1)
    // =========================================================================

    /**
     * TC-I-007 | Priority: P1 | Type: Negative (validation)
     * Traces to: AC-019 Scenario 1 – bán kính phải ≥ 10 m
     *
     * <p>Test data: radius = 5.0 m (below the @DecimalMin("10.0") constraint).
     *
     * <p>Expected: HTTP 400 Bad Request; field error on {@code radius}.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-007 [P1][Negative] Radius = 5.0 m (below min 10 m) → 400 Bad Request")
    void createPoi_radiusBelowMinimum_returns400BadRequest() throws Exception {
        CreatePoiRequest request = validRequest();
        request.setRadius(BigDecimal.valueOf(5.0));

        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.radius").exists());
    }

    /**
     * TC-I-008 | Priority: P2 | Type: BUG FINDER
     * Traces to: AC-019 Scenario 1 – bán kính phải ≤ 100 m theo AC, nhưng code cho phép ≤ 200 m
     *
     * <p><b>Discrepancy detected</b>:
     * <ul>
     *   <li>AC-019 Scenario 1 specifies the valid radius range as <b>10–100 m</b>.</li>
     *   <li>{@link CreatePoiRequest} uses {@code @DecimalMax("200.0")}, allowing up to 200 m.</li>
     * </ul>
     *
     * <p>Test data: radius = 150 m — accepted by code's {@code @DecimalMax("200.0")} but
     * violates the AC upper bound of 100 m.
     *
     * <p>Expected per AC-019: HTTP 400 Bad Request.<br>
     * Actual (current code): HTTP 201 Created — <b>this assertion will FAIL until
     * {@code @DecimalMax("200.0")} is corrected to {@code @DecimalMax("100.0")}
     * in {@link CreatePoiRequest}</b>.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-008 [P2][BUG] Radius = 150 m exceeds AC-019 max of 100 m → expects 400, code returns 201")
    void createPoi_radiusExceedsAcLimit_bugFinderRevealsMismatch() throws Exception {
        when(poiService.createPoi(any(CreatePoiRequest.class), anyString()))
                .thenReturn(samplePoiResponse());

        CreatePoiRequest request = validRequest();
        request.setRadius(BigDecimal.valueOf(150.0)); // > AC max (100 m), ≤ code max (200 m)

        // Per AC-019 this must be 400. The assertion below will FAIL (returns 201)
        // until @DecimalMax in CreatePoiRequest is fixed to "100.0".
        mockMvc.perform(post("/api/poi")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest()); // BUG: currently returns 201
    }

    // =========================================================================
    // TC-I-009 – GET /api/poi – active POIs appear on map (Scenario 2)
    // =========================================================================

    /**
     * TC-I-009 | Priority: P1 | Type: Happy path
     * Traces to: AC-019 Scenario 2 – POI mới xuất hiện trên bản đồ ngay sau khi tạo
     *
     * <p>Precondition: two active POIs exist in the system (cached or live from DB).
     *
     * <p>Steps:
     * <ol>
     *   <li>GET /api/poi as any authenticated user.</li>
     * </ol>
     *
     * <p>Expected: HTTP 200 OK; response body contains an array of 2 POI objects,
     * verifying that newly created POIs are immediately visible via the map endpoint.
     */
    @Test
    @WithMockUser(roles = "vendor")
    @DisplayName("TC-I-009 [P1][Happy] GET /api/poi → 200 OK with list of active POIs (map-ready)")
    void getActivePois_activePoisExist_returns200WithPoiList() throws Exception {
        PoiResponse poi1 = samplePoiResponse();
        PoiResponse poi2 = samplePoiResponse();
        poi2.setPoiId(2);
        poi2.setName("Phở Hà Nội");
        when(poiService.getActivePois()).thenReturn(List.of(poi1, poi2));

        mockMvc.perform(get("/api/poi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].poiId").value(1))
                .andExpect(jsonPath("$.data[1].poiId").value(2));
    }
}
