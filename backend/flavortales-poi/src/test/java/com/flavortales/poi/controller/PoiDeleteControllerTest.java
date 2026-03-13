package com.flavortales.poi.controller;

import com.flavortales.common.exception.GlobalExceptionHandler;
import com.flavortales.common.exception.PoiNotFoundException;
import com.flavortales.common.exception.UserNotFoundException;
import com.flavortales.poi.service.PoiService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Controller-layer integration (slice) tests for
 * {@link PoiController#deletePoi(Integer, boolean, org.springframework.security.core.Authentication)}.
 *
 * <p>Uses {@code @WebMvcTest} so only the Web MVC layer is loaded.
 * The service is replaced by a {@code @MockBean}. {@link GlobalExceptionHandler} is
 * imported so domain exceptions are mapped to the correct HTTP status codes.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>User Story  : US-021 – Vendor xóa POI</li>
 *   <li>Use Case    : UC-021 – Delete POI</li>
 *   <li>Requirement : FR-PM-DEL – Delete POI (soft and hard)</li>
 *   <li>SRS         : SRS-POI-003 – Vendor có thể xóa POI do mình sở hữu</li>
 *   <li>AC          : AC-021
 *     <ul>
 *       <li>Scenario 1 (Basic Flow)  – 200 OK sau khi xóa thành công</li>
 *       <li>Scenario 2 (A1)         – không có thay đổi khi vendor hủy/không có quyền</li>
 *       <li>Scenario 3 (E1)         – lỗi hệ thống → HTTP lỗi tương ứng</li>
 *     </ul>
 *   </li>
 * </ul>
 *
 * <p><b>Test categories covered</b>: happy path, alternative flow (A1),
 * negative (access control + domain exceptions), edge case.
 */
@WebMvcTest(PoiController.class)
@Import(GlobalExceptionHandler.class)
class PoiDeleteControllerTest {

    private static final int    POI_ID       = 7;
    private static final String VENDOR_EMAIL = "vendor@flavortales.vn";

    @Autowired private MockMvc    mockMvc;
    @MockBean  private PoiService poiService;

    // =========================================================================
    // TC-I-030 to TC-I-031 – Basic Flow (Scenario 1): Successful deletion
    // =========================================================================

    /**
     * TC-I-030 | Priority: P1 | Type: Happy path
     * Traces to: AC-021 Scenario 1 – vendor xóa mềm POI thành công (mặc định)
     *
     * <p>Precondition: user authenticated with ROLE_vendor; POI owned by vendor exists.
     *
     * <p>Steps:
     * <ol>
     *   <li>Send {@code DELETE /api/poi/{poiId}} (no {@code ?hard} param) as ROLE_vendor.</li>
     * </ol>
     *
     * <p>Expected: HTTP 200 OK; response body contains {@code success=true} and
     * a message confirming deletion.
     */
    @Test
    @WithMockUser(username = VENDOR_EMAIL, roles = "vendor")
    @DisplayName("TC-I-030 [P1][Happy] ROLE_vendor + soft delete (default) → 200 OK, success=true")
    void deletePoi_roleVendorSoftDelete_returns200Ok() throws Exception {
        doNothing().when(poiService).deletePoi(eq(POI_ID), anyString(), eq(false));

        mockMvc.perform(delete("/api/poi/{poiId}", POI_ID).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("POI deleted successfully"));
    }

    /**
     * TC-I-031 | Priority: P1 | Type: Happy path
     * Traces to: AC-021 Scenario 1 – vendor xóa cứng POI vĩnh viễn
     *
     * <p>Precondition: user authenticated with ROLE_vendor; {@code ?hard=true} query param provided.
     *
     * <p>Steps:
     * <ol>
     *   <li>Send {@code DELETE /api/poi/{poiId}?hard=true} as ROLE_vendor.</li>
     * </ol>
     *
     * <p>Expected: HTTP 200 OK; response message indicates permanent deletion.
     */
    @Test
    @WithMockUser(username = VENDOR_EMAIL, roles = "vendor")
    @DisplayName("TC-I-031 [P1][Happy] ROLE_vendor + ?hard=true → 200 OK, message 'permanently deleted'")
    void deletePoi_roleVendorHardDelete_returns200OkWithPermanentMessage() throws Exception {
        doNothing().when(poiService).deletePoi(eq(POI_ID), anyString(), eq(true));

        mockMvc.perform(delete("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .param("hard", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("POI permanently deleted"));
    }

    // =========================================================================
    // TC-I-032 to TC-I-033 – Access Control (A1 / Scenario 2)
    // =========================================================================

    /**
     * TC-I-032 | Priority: P1 | Type: Negative (access control)
     * Traces to: AC-021 Scenario 2 (A1) – chỉ vendor mới được xóa POI
     *
     * <p>Precondition: user authenticated with ROLE_customer (not vendor).
     *
     * <p>Steps: {@code DELETE /api/poi/{poiId}} as ROLE_customer.
     *
     * <p>Expected: HTTP 403 Forbidden; service is never invoked.
     */
    @Test
    @WithMockUser(username = "customer@flavortales.vn", roles = "customer")
    @DisplayName("TC-I-032 [P1][Negative] ROLE_customer → 403 Forbidden, service not called")
    void deletePoi_roleCustomer_returns403Forbidden() throws Exception {
        mockMvc.perform(delete("/api/poi/{poiId}", POI_ID).with(csrf()))
                .andExpect(status().isForbidden());

        verify(poiService, never()).deletePoi(anyInt(), anyString(), anyBoolean());
    }

    /**
     * TC-I-033 | Priority: P1 | Type: Negative (access control)
     * Traces to: AC-021 Scenario 2 (A1) – yêu cầu không có JWT bị từ chối
     *
     * <p>Precondition: no authentication; request is anonymous.
     *
     * <p>Steps: {@code DELETE /api/poi/{poiId}} without any authenticated user.
     *
     * <p>Expected: HTTP 401 Unauthorized; service is never invoked.
     */
    @Test
    @WithAnonymousUser
    @DisplayName("TC-I-033 [P1][Negative] Anonymous request → 401 Unauthorized, service not called")
    void deletePoi_noAuthentication_returns401Unauthorized() throws Exception {
        mockMvc.perform(delete("/api/poi/{poiId}", POI_ID).with(csrf()))
                .andExpect(status().isUnauthorized());

        verify(poiService, never()).deletePoi(anyInt(), anyString(), anyBoolean());
    }

    // =========================================================================
    // TC-I-034 to TC-I-036 – Exception Flows (Scenario 3 / E1)
    // =========================================================================

    /**
     * TC-I-034 | Priority: P1 | Type: Negative (domain exception)
     * Traces to: AC-021 Scenario 3 (E1) – POI không tồn tại → hệ thống báo lỗi
     *
     * <p>Precondition: service throws {@link PoiNotFoundException} for the given ID.
     *
     * <p>Steps: {@code DELETE /api/poi/{poiId}} as ROLE_vendor.
     *
     * <p>Expected: HTTP 404 Not Found; response body contains {@code success=false}.
     */
    @Test
    @WithMockUser(username = VENDOR_EMAIL, roles = "vendor")
    @DisplayName("TC-I-034 [P1][Negative] POI not found → 404 Not Found, success=false")
    void deletePoi_poiNotFound_returns404NotFound() throws Exception {
        doThrow(new PoiNotFoundException("POI not found with id: " + POI_ID))
                .when(poiService).deletePoi(eq(POI_ID), anyString(), anyBoolean());

        mockMvc.perform(delete("/api/poi/{poiId}", POI_ID).with(csrf()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    /**
     * TC-I-035 | Priority: P1 | Type: Negative (domain exception)
     * Traces to: AC-021 Scenario 3 (E1) – vendor không sở hữu POI → bị từ chối
     *
     * <p>Precondition: service throws {@link IllegalArgumentException}
     * with message "do not own this POI".
     *
     * <p>Steps: {@code DELETE /api/poi/{poiId}} as a vendor who does not own the POI.
     *
     * <p>Expected: HTTP 400 Bad Request; response body contains {@code success=false}.
     */
    @Test
    @WithMockUser(username = VENDOR_EMAIL, roles = "vendor")
    @DisplayName("TC-I-035 [P1][Negative] Vendor does not own POI → 400 Bad Request, success=false")
    void deletePoi_vendorDoesNotOwnPoi_returns400BadRequest() throws Exception {
        doThrow(new IllegalArgumentException("You do not own this POI"))
                .when(poiService).deletePoi(eq(POI_ID), anyString(), anyBoolean());

        mockMvc.perform(delete("/api/poi/{poiId}", POI_ID).with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    /**
     * TC-I-036 | Priority: P2 | Type: Negative (domain exception)
     * Traces to: AC-021 Scenario 3 (E1) – vendor email không tồn tại trong hệ thống
     *
     * <p>Precondition: service throws {@link UserNotFoundException}.
     *
     * <p>Steps: {@code DELETE /api/poi/{poiId}} as ROLE_vendor with unregistered email.
     *
     * <p>Expected: HTTP 404 Not Found; response body contains {@code success=false}.
     */
    @Test
    @WithMockUser(username = "ghost@flavortales.vn", roles = "vendor")
    @DisplayName("TC-I-036 [P2][Negative] Unknown vendor email → 404 Not Found, success=false")
    void deletePoi_unknownVendorEmail_returns404NotFound() throws Exception {
        doThrow(new UserNotFoundException("Vendor not found: ghost@flavortales.vn"))
                .when(poiService).deletePoi(anyInt(), anyString(), anyBoolean());

        mockMvc.perform(delete("/api/poi/{poiId}", POI_ID).with(csrf()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    // =========================================================================
    // TC-I-037 to TC-I-038 – Edge cases & query-param handling
    // =========================================================================

    /**
     * TC-I-037 | Priority: P2 | Type: Edge case
     * Traces to: AC-021 Scenario 1 – ?hard=false phải hoạt động như mặc định (xóa mềm)
     *
     * <p>Precondition: user authenticated with ROLE_vendor.
     *
     * <p>Steps: {@code DELETE /api/poi/{poiId}?hard=false} explicitly.
     *
     * <p>Expected: HTTP 200 OK; service called with {@code hardDelete = false}.
     */
    @Test
    @WithMockUser(username = VENDOR_EMAIL, roles = "vendor")
    @DisplayName("TC-I-037 [P2][Edge] ?hard=false explicit → 200 OK, service called with hardDelete=false")
    void deletePoi_explicitSoftDeleteParam_returns200OkAndForwardsFalse() throws Exception {
        doNothing().when(poiService).deletePoi(eq(POI_ID), anyString(), eq(false));

        mockMvc.perform(delete("/api/poi/{poiId}", POI_ID)
                        .with(csrf())
                        .param("hard", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(poiService).deletePoi(eq(POI_ID), anyString(), eq(false));
    }

    /**
     * TC-I-038 | Priority: P2 | Type: Negative (alternative flow A1)
     * Traces to: AC-021 Scenario 2 (A1) – vendor hủy thao tác → service không được gọi
     *
     * <p>This test documents the behaviour when the ROLE check fails first.
     * The service must never be reached, so no POI state is changed —
     * equivalent to the vendor aborting the action before confirmation.
     *
     * <p>Precondition: authenticated user lacks ROLE_vendor.
     *
     * <p>Expected: HTTP 403; {@link PoiService#deletePoi} is never invoked, preserving POI state.
     */
    @Test
    @WithMockUser(roles = "operator")
    @DisplayName("TC-I-038 [P2][A1] ROLE_operator (not vendor) → 403, service not called, POI unchanged")
    void deletePoi_wrongRole_serviceNeverCalledPoiUnchanged() throws Exception {
        mockMvc.perform(delete("/api/poi/{poiId}", POI_ID).with(csrf()))
                .andExpect(status().isForbidden());

        verify(poiService, never()).deletePoi(anyInt(), anyString(), anyBoolean());
    }
}
