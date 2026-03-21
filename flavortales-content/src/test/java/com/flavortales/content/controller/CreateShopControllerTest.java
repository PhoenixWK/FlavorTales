package com.flavortales.content.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flavortales.common.exception.UserNotFoundException;
import com.flavortales.content.dto.ShopCreateRequest;
import com.flavortales.content.dto.ShopCreateResponse;
import com.flavortales.content.service.ShopService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for {@link ShopController} – web layer only (@WebMvcTest).
 *
 * Trace:
 *   Use case  : UC-CM-001 – Tạo gian hàng mới
 *   User story: US-CM-001 – Vendor creates shop profile
 *   SRS       : FR-CM-001
 *   AC        : AC-CM-001-01 … AC-CM-001-08
 *
 * Covers:
 *   • HTTP method/URL routing
 *   • Bean Validation (JSR-380) on the request body
 *   • Role authorisation (ROLE_vendor)
 *   • Service success → 201 Created
 *   • Duplicate name → 400 Bad Request
 *   • Unauthenticated call → 403 Forbidden
 *   • Wrong role (admin, customer) → 403 Forbidden
 *
 * Priority:
 *   P1 – Auth, role guard, happy path, validation failures
 *   P2 – Duplicate name error propagation
 *   P3 – Edge cases (minimum/maximum length boundaries)
 */
@WebMvcTest(ShopController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("POST /api/shop – ShopController")
class CreateShopControllerTest {

    // ── MVC infrastructure ───────────────────────────────────────────────────

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ShopService shopService;

    // ── Constants ────────────────────────────────────────────────────────────

    private static final String URL           = "/api/shop";
    private static final String VENDOR_EMAIL  = "pho.vendor@example.com";

    // ── Test data ────────────────────────────────────────────────────────────

    /** Fully valid request body – name, description, files, audio all present. */
    private ShopCreateRequest validRequest;

    @BeforeEach
    void setUp() {
        validRequest = new ShopCreateRequest();
        validRequest.setName("Phở Hà Nội");
        // description >= 50 chars
        validRequest.setDescription("Phở bò truyền thống Hà Nội với bí quyết ninh xương hơn 8 tiếng.");
        validRequest.setAvatarFileId(10);
    }

    // ── Authentication helpers ────────────────────────────────────────────────

    /** Returns an Authentication token for a user with the given role. */
    private static UsernamePasswordAuthenticationToken auth(String email, String role) {
        return new UsernamePasswordAuthenticationToken(
                email, null,
                List.of(new SimpleGrantedAuthority(role)));
    }

    private static UsernamePasswordAuthenticationToken vendorAuth() {
        return auth(VENDOR_EMAIL, "ROLE_vendor");
    }

    /** Stubs a successful service call returning a realistic response. */
    private void stubServiceSuccess() {
        ShopCreateResponse resp = ShopCreateResponse.builder()
                .shopId(101)
                .name("Phở Hà Nội")
                .status("pending")
                .message("Tạo gian hàng thành công, đang chờ duyệt")
                .createdAt(LocalDateTime.now())
                .build();
        when(shopService.createShop(any(ShopCreateRequest.class), eq(VENDOR_EMAIL)))
                .thenReturn(resp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AC-CM-001-01  Happy path – 201 Created with pending status
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("AC-CM-001-01 · Happy path – shop created, returns 201 with pending status")
    class HappyPath {

        @Test
        @DisplayName("P1 · Returns 201 Created with success=true and status=pending")
        void returns201WithPendingStatus() throws Exception {
            stubServiceSuccess();

            mockMvc.perform(post(URL)
                            .with(authentication(vendorAuth()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("pending"))
                    .andExpect(jsonPath("$.data.shopId").value(101))
                    .andExpect(jsonPath("$.data.name").value("Phở Hà Nội"))
                    .andExpect(jsonPath("$.message").value("Tạo gian hàng thành công, đang chờ duyệt"));
        }

        @Test
        @DisplayName("P2 · Accepts optional fields (tags, specialtyDescription, additionalImageIds)")
        void acceptsOptionalFields() throws Exception {
            stubServiceSuccess();
            validRequest.setTags(List.of("Bình dân", "Gia truyền"));
            validRequest.setSpecialtyDescription("Phở bò đặc sản");
            validRequest.setAdditionalImageIds(List.of(30, 31));

            mockMvc.perform(post(URL)
                            .with(authentication(vendorAuth()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AC-CM-001-02  Role authorisation
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("AC-CM-001-02 · Authorisation – only ROLE_vendor may call this endpoint")
    class Authorisation {

        @Test
        @DisplayName("P1 · Returns 403 Forbidden when caller has ROLE_admin")
        void adminRoleForbidden() throws Exception {
            mockMvc.perform(post(URL)
                            .with(authentication(auth("admin@flavortales.com", "ROLE_admin")))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        @DisplayName("P1 · Returns 403 Forbidden when caller has ROLE_customer")
        void customerRoleForbidden() throws Exception {
            mockMvc.perform(post(URL)
                            .with(authentication(auth("customer@example.com", "ROLE_customer")))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        @DisplayName("P1 · Returns 403 Forbidden when no authentication principal is present")
        void unauthenticatedRequestForbidden() throws Exception {
            mockMvc.perform(post(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isForbidden());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AC-CM-001-03  Bean Validation – required fields (E1 path)
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("AC-CM-001-03 · E1 – Required field validation failures return 400")
    class RequiredFieldValidation {

        @Test
        @DisplayName("P1 · Returns 400 when name is blank")
        void blankNameReturns400() throws Exception {
            validRequest.setName("");

            mockMvc.perform(post(URL)
                            .with(authentication(vendorAuth()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("P1 · Returns 400 when description is missing")
        void missingDescriptionReturns400() throws Exception {
            validRequest.setDescription(null);

            mockMvc.perform(post(URL)
                            .with(authentication(vendorAuth()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("P1 · Returns 400 when avatarFileId is null")
        void missingAvatarReturns400() throws Exception {
            validRequest.setAvatarFileId(null);

            mockMvc.perform(post(URL)
                            .with(authentication(vendorAuth()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest());
        }

    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AC-CM-001-04  Bean Validation – name length boundaries (E1 path)
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("AC-CM-001-04 · E1 – Name length boundary violations return 400")
    class NameLengthValidation {

        @Test
        @DisplayName("P1 · Returns 400 when name is shorter than 3 characters")
        void nameTooShortReturns400() throws Exception {
            validRequest.setName("AB");   // 2 chars

            mockMvc.perform(post(URL)
                            .with(authentication(vendorAuth()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("P3 · Returns 400 when name is exactly 101 characters (one over max)")
        void nameTooLongReturns400() throws Exception {
            validRequest.setName("A".repeat(101));

            mockMvc.perform(post(URL)
                            .with(authentication(vendorAuth()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("P3 · Returns 201 when name is exactly 3 characters (minimum boundary)")
        void nameAtMinBoundaryAccepted() throws Exception {
            stubServiceSuccess();
            validRequest.setName("Phở");  // 3 chars

            when(shopService.createShop(any(), eq(VENDOR_EMAIL)))
                    .thenReturn(ShopCreateResponse.builder()
                            .shopId(102).name("Phở").status("pending")
                            .message("Tạo gian hàng thành công, đang chờ duyệt")
                            .createdAt(LocalDateTime.now()).build());

            mockMvc.perform(post(URL)
                            .with(authentication(vendorAuth()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("P3 · Returns 201 when name is exactly 100 characters (maximum boundary)")
        void nameAtMaxBoundaryAccepted() throws Exception {
            String maxName = "N".repeat(100);
            validRequest.setName(maxName);

            when(shopService.createShop(any(), eq(VENDOR_EMAIL)))
                    .thenReturn(ShopCreateResponse.builder()
                            .shopId(103).name(maxName).status("pending")
                            .message("Tạo gian hàng thành công, đang chờ duyệt")
                            .createdAt(LocalDateTime.now()).build());

            mockMvc.perform(post(URL)
                            .with(authentication(vendorAuth()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isCreated());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AC-CM-001-05  Bean Validation – description length boundary
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("AC-CM-001-05 · E1 – Description length boundary violations return 400")
    class DescriptionLengthValidation {

        @Test
        @DisplayName("P1 · Returns 400 when description is shorter than 50 characters")
        void descriptionTooShortReturns400() throws Exception {
            validRequest.setDescription("Quá ngắn.");  // 9 chars

            mockMvc.perform(post(URL)
                            .with(authentication(vendorAuth()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("P3 · Returns 400 when description exceeds 1000 characters")
        void descriptionTooLongReturns400() throws Exception {
            validRequest.setDescription("A".repeat(1001));

            mockMvc.perform(post(URL)
                            .with(authentication(vendorAuth()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AC-CM-001-06  Bean Validation – additionalImageIds max cardinality
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("AC-CM-001-06 · E1 – More than 5 additional images returns 400")
    class AdditionalImagesValidation {

        @Test
        @DisplayName("P3 · Returns 400 when 6 additional image IDs are provided")
        void sixAdditionalImagesRejected() throws Exception {
            validRequest.setAdditionalImageIds(List.of(30, 31, 32, 33, 34, 35));

            mockMvc.perform(post(URL)
                            .with(authentication(vendorAuth()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AC-CM-001-07  Duplicate name – service exception mapped to 400
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("AC-CM-001-07 · Duplicate shop name – service exception mapped to 400 Bad Request")
    class DuplicateName {

        @Test
        @DisplayName("P1 · Returns 400 with success=false when service throws IllegalArgumentException")
        void duplicateNameReturns400() throws Exception {
            when(shopService.createShop(any(ShopCreateRequest.class), anyString()))
                    .thenThrow(new IllegalArgumentException("A shop with this name already exists."));

            mockMvc.perform(post(URL)
                            .with(authentication(vendorAuth()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("A shop with this name already exists."));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AC-CM-001-08  Bean Validation – tags max cardinality
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("AC-CM-001-08 · E1 – More than 5 tags returns 400")
    class TagsValidation {

        @Test
        @DisplayName("P3 · Returns 400 when 6 tags are provided (exceeds max=5)")
        void sixTagsRejected() throws Exception {
            validRequest.setTags(List.of("T1", "T2", "T3", "T4", "T5", "T6"));

            mockMvc.perform(post(URL)
                            .with(authentication(vendorAuth()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("P3 · Returns 201 when exactly 5 tags are provided (max boundary)")
        void fiveTagsAccepted() throws Exception {
            stubServiceSuccess();
            validRequest.setTags(List.of("Bình dân", "Gia truyền", "Chay", "Hải sản", "Đặc sản vùng miền"));

            mockMvc.perform(post(URL)
                            .with(authentication(vendorAuth()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isCreated());
        }
    }
}
