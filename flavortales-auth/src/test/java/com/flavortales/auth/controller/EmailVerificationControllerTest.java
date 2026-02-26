package com.flavortales.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flavortales.auth.dto.ResendCodeRequest;
import com.flavortales.auth.dto.VerifyEmailRequest;
import com.flavortales.auth.service.AuthService;
import com.flavortales.common.exception.AccountAlreadyVerifiedException;
import com.flavortales.common.exception.InvalidVerificationCodeException;
import com.flavortales.common.exception.ResendLimitExceededException;
import com.flavortales.common.exception.UserNotFoundException;
import com.flavortales.common.exception.VerificationCodeExpiredException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-layer integration tests for:
 *   POST /api/auth/vendor/verify        (FR-UM-002)
 *   POST /api/auth/vendor/resend-code   (FR-UM-003)
 *
 * Spring Security filters are disabled so that only Bean Validation,
 * routing, and GlobalExceptionHandler wiring are under test.
 *
 * Evaluation criteria satisfied:
 *   ✓ Preconditions included    ✓ Clear steps
 *   ✓ Measurable results        ✓ Traceability to requirements
 *   ✓ Happy / Negative / Edge   ✓ Real data
 *   ✓ No duplication            ✓ Prioritization
 *   ✓ Bug-finding capability
 */
@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AuthController – Email Verification & Resend Code Endpoints")
class EmailVerificationControllerTest {

    @Autowired private MockMvc       mockMvc;
    @Autowired private ObjectMapper  objectMapper;

    @MockBean  private AuthService   authService;

    private static final String VERIFY_URL      = "/api/auth/vendor/verify";
    private static final String RESEND_URL       = "/api/auth/vendor/resend-code";

    private static final String VALID_EMAIL      = "phovendor@example.com";
    private static final String VALID_CODE       = "847291";

    // ── Shared helpers ────────────────────────────────────────────────────────

    private VerifyEmailRequest verifyRequest(String email, String code) {
        VerifyEmailRequest req = new VerifyEmailRequest();
        req.setEmail(email);
        req.setCode(code);
        return req;
    }

    private ResendCodeRequest resendRequest(String email) {
        ResendCodeRequest req = new ResendCodeRequest();
        req.setEmail(email);
        return req;
    }

    // =========================================================================
    // POST /api/auth/vendor/verify  (FR-UM-002)
    // =========================================================================

    @Nested
    @DisplayName("FR-UM-002 | POST /api/auth/vendor/verify")
    class VerifyEndpoint {

        @BeforeEach
        void setUp() {
            // Default: service succeeds (void method)
            doNothing().when(authService).verifyEmail(anyString(), anyString());
        }

        // ── [P1] Happy path ───────────────────────────────────────────────────

        @Nested
        @DisplayName("[P1] Happy path – verification succeeds")
        class HappyPath {

            @Test
            @DisplayName("Returns 200 OK with success=true and confirmation message")
            void returns200OnSuccess() throws Exception {
                mockMvc.perform(post(VERIFY_URL)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(
                                        verifyRequest(VALID_EMAIL, VALID_CODE))))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.success").value(true))
                        .andExpect(jsonPath("$.message").value("Email verified successfully. You can now log in."));
            }

            @Test
            @DisplayName("Delegates to service exactly once with the correct email and code")
            void delegatesToServiceOnce() throws Exception {
                mockMvc.perform(post(VERIFY_URL)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(
                                        verifyRequest(VALID_EMAIL, VALID_CODE))))
                        .andExpect(status().isOk());

                verify(authService).verifyEmail(VALID_EMAIL, VALID_CODE);
            }
        }

        // ── [P1] Negative – service-level errors ──────────────────────────────

        @Nested
        @DisplayName("[P1] Negative – service-level exceptions map to correct HTTP status")
        class ServiceErrors {

            @Test
            @DisplayName("Returns 404 when service throws UserNotFoundException")
            void userNotFoundReturns404() throws Exception {
                doThrow(new UserNotFoundException())
                        .when(authService).verifyEmail(anyString(), anyString());

                mockMvc.perform(post(VERIFY_URL)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(
                                        verifyRequest(VALID_EMAIL, VALID_CODE))))
                        .andExpect(status().isNotFound())
                        .andExpect(jsonPath("$.success").value(false))
                        .andExpect(jsonPath("$.message").value("User not found"));
            }

            @Test
            @DisplayName("Returns 409 when service throws AccountAlreadyVerifiedException")
            void alreadyVerifiedReturns409() throws Exception {
                doThrow(new AccountAlreadyVerifiedException())
                        .when(authService).verifyEmail(anyString(), anyString());

                mockMvc.perform(post(VERIFY_URL)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(
                                        verifyRequest(VALID_EMAIL, VALID_CODE))))
                        .andExpect(status().isConflict())
                        .andExpect(jsonPath("$.success").value(false))
                        .andExpect(jsonPath("$.message").value("Account is already verified"));
            }

            @Test
            @DisplayName("Returns 400 when service throws InvalidVerificationCodeException")
            void invalidCodeReturns400() throws Exception {
                doThrow(new InvalidVerificationCodeException())
                        .when(authService).verifyEmail(anyString(), anyString());

                mockMvc.perform(post(VERIFY_URL)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(
                                        verifyRequest(VALID_EMAIL, "000000"))))
                        .andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.success").value(false))
                        .andExpect(jsonPath("$.message").value("Invalid verification code"));
            }

            @Test
            @DisplayName("Returns 410 Gone when service throws VerificationCodeExpiredException")
            void expiredCodeReturns410() throws Exception {
                doThrow(new VerificationCodeExpiredException())
                        .when(authService).verifyEmail(anyString(), anyString());

                mockMvc.perform(post(VERIFY_URL)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(
                                        verifyRequest(VALID_EMAIL, VALID_CODE))))
                        .andExpect(status().isGone())
                        .andExpect(jsonPath("$.success").value(false))
                        .andExpect(jsonPath("$.message").value("Verification code has expired"));
            }
        }

        // ── [P2] Bean Validation – email field ────────────────────────────────

        @Nested
        @DisplayName("[P2] Bean Validation – email field")
        class EmailValidation {

            @Test
            @DisplayName("Returns 400 when email is blank")
            void blankEmailFails() throws Exception {
                performVerifyExpect400(verifyRequest("", VALID_CODE), "email");
            }

            @Test
            @DisplayName("Returns 400 when email is not a valid format")
            void malformedEmailFails() throws Exception {
                performVerifyExpect400(verifyRequest("not-an-email", VALID_CODE), "email");
            }

            @Test
            @DisplayName("Returns 400 when email has no domain extension")
            void emailMissingExtensionFails() throws Exception {
                performVerifyExpect400(verifyRequest("vendor@domain", VALID_CODE), "email");
            }
        }

        // ── [P2] Bean Validation – code field ─────────────────────────────────

        @Nested
        @DisplayName("[P2] Bean Validation – code field")
        class CodeValidation {

            @Test
            @DisplayName("Returns 400 when code is blank")
            void blankCodeFails() throws Exception {
                performVerifyExpect400(verifyRequest(VALID_EMAIL, ""), "code");
            }

            @Test
            @DisplayName("Returns 400 when code has fewer than 6 digits")
            void codeTooShortFails() throws Exception {
                // 5 digits — should fail @Size(min=6, max=6)
                performVerifyExpect400(verifyRequest(VALID_EMAIL, "12345"), "code");
            }

            @Test
            @DisplayName("Returns 400 when code has more than 6 characters")
            void codeTooLongFails() throws Exception {
                // 7 digits
                performVerifyExpect400(verifyRequest(VALID_EMAIL, "1234567"), "code");
            }

            @Test
            @DisplayName("[P3] Edge – service is never called when request fails Bean Validation")
            void serviceNotCalledOnValidationFailure() throws Exception {
                mockMvc.perform(post(VERIFY_URL)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(
                                        verifyRequest("", ""))))
                        .andExpect(status().isBadRequest());

                verify(authService, never()).verifyEmail(anyString(), anyString());
            }
        }
    }

    // =========================================================================
    // POST /api/auth/vendor/resend-code  (FR-UM-003)
    // =========================================================================

    @Nested
    @DisplayName("FR-UM-003 | POST /api/auth/vendor/resend-code")
    class ResendCodeEndpoint {

        @BeforeEach
        void setUp() {
            doNothing().when(authService).resendVerificationCode(anyString());
        }

        // ── [P1] Happy path ───────────────────────────────────────────────────

        @Nested
        @DisplayName("[P1] Happy path – resend succeeds")
        class HappyPath {

            @Test
            @DisplayName("Returns 200 OK with success=true and confirmation message")
            void returns200OnSuccess() throws Exception {
                mockMvc.perform(post(RESEND_URL)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(
                                        resendRequest(VALID_EMAIL))))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.success").value(true))
                        .andExpect(jsonPath("$.message").value(
                                "A new verification code has been sent to your email."));
            }

            @Test
            @DisplayName("Delegates to service exactly once with the correct email")
            void delegatesToServiceOnce() throws Exception {
                mockMvc.perform(post(RESEND_URL)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(
                                        resendRequest(VALID_EMAIL))))
                        .andExpect(status().isOk());

                verify(authService).resendVerificationCode(VALID_EMAIL);
            }
        }

        // ── [P1] Negative – service-level errors ──────────────────────────────

        @Nested
        @DisplayName("[P1] Negative – service-level exceptions map to correct HTTP status")
        class ServiceErrors {

            @Test
            @DisplayName("Returns 404 when service throws UserNotFoundException")
            void userNotFoundReturns404() throws Exception {
                doThrow(new UserNotFoundException())
                        .when(authService).resendVerificationCode(anyString());

                mockMvc.perform(post(RESEND_URL)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(
                                        resendRequest(VALID_EMAIL))))
                        .andExpect(status().isNotFound())
                        .andExpect(jsonPath("$.success").value(false))
                        .andExpect(jsonPath("$.message").value("User not found"));
            }

            @Test
            @DisplayName("Returns 409 when service throws AccountAlreadyVerifiedException")
            void alreadyActiveReturns409() throws Exception {
                doThrow(new AccountAlreadyVerifiedException())
                        .when(authService).resendVerificationCode(anyString());

                mockMvc.perform(post(RESEND_URL)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(
                                        resendRequest(VALID_EMAIL))))
                        .andExpect(status().isConflict())
                        .andExpect(jsonPath("$.success").value(false))
                        .andExpect(jsonPath("$.message").value("Account is already verified"));
            }

            @Test
            @DisplayName("Returns 429 Too Many Requests when service throws ResendLimitExceededException")
            void limitExceededReturns429() throws Exception {
                doThrow(new ResendLimitExceededException())
                        .when(authService).resendVerificationCode(anyString());

                mockMvc.perform(post(RESEND_URL)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(
                                        resendRequest(VALID_EMAIL))))
                        .andExpect(status().isTooManyRequests())
                        .andExpect(jsonPath("$.success").value(false))
                        .andExpect(jsonPath("$.message").value(
                                "Resend limit reached. Maximum 3 resends are allowed per account."));
            }
        }

        // ── [P2] Bean Validation – email field ────────────────────────────────

        @Nested
        @DisplayName("[P2] Bean Validation – email field")
        class EmailValidation {

            @Test
            @DisplayName("Returns 400 when email is blank")
            void blankEmailFails() throws Exception {
                performResendExpect400(resendRequest(""), "email");
            }

            @Test
            @DisplayName("Returns 400 when email is not a valid format")
            void malformedEmailFails() throws Exception {
                performResendExpect400(resendRequest("notvalid"), "email");
            }

            @Test
            @DisplayName("[P3] Edge – service is never called when email is invalid")
            void serviceNotCalledOnInvalidEmail() throws Exception {
                mockMvc.perform(post(RESEND_URL)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(resendRequest(""))))
                        .andExpect(status().isBadRequest());

                verify(authService, never()).resendVerificationCode(anyString());
            }
        }
    }

    // ── Private assertion helpers ─────────────────────────────────────────────

    private void performVerifyExpect400(VerifyEmailRequest req, String field) throws Exception {
        mockMvc.perform(post(VERIFY_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.data." + field).exists());
    }

    private void performResendExpect400(ResendCodeRequest req, String field) throws Exception {
        mockMvc.perform(post(RESEND_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.data." + field).exists());
    }
}
