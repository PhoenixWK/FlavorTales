package com.flavortales.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flavortales.auth.dto.ForgotPasswordRequest;
import com.flavortales.auth.dto.ResetPasswordRequest;
import com.flavortales.auth.service.AuthService;
import com.flavortales.auth.service.JwtService;
import com.flavortales.auth.service.LoginAttemptService;
import com.flavortales.auth.service.PasswordResetService;
import com.flavortales.auth.service.TokenBlacklistService;
import com.flavortales.user.repository.UserRepository;
import com.flavortales.common.exception.InvalidResetTokenException;
import com.flavortales.common.exception.PasswordResetRateLimitException;
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
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-layer integration tests for the password recovery endpoints:
 * <ul>
 *   <li>{@code POST /api/auth/vendor/forgot-password}</li>
 *   <li>{@code POST /api/auth/vendor/reset-password}</li>
 * </ul>
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>Use Case   : UC-PasswordRecovery (Steps 1, 5–8, 10 and E1–E3)</li>
 *   <li>User Story : US-PasswordRecovery – FR-UM-004</li>
 *   <li>Requirement: FR-UM-004 – Password Recovery</li>
 *   <li>Acceptance : AC-PR-C01 … AC-PR-C18</li>
 * </ul>
 *
 * <p><b>Scope</b> – {@link WebMvcTest} loads only the web layer (controller +
 * {@code GlobalExceptionHandler}).  {@link PasswordResetService} is replaced
 * by a Mockito stub so tests are fast and isolated from persistence.
 *
 * <p><b>Coverage matrix</b>
 * <pre>
 *  ID           Scenario                                              Priority  Type
 *  ──────────────────────────────────────────────────────────────────────────────────
 *  AC-PR-C01    forgot-password – registered email → 200 + generic msg  P0  Positive
 *  AC-PR-C02    forgot-password – unknown email → 200 same message       P0  Security
 *  AC-PR-C03    forgot-password – blank email → 400 validation error     P0  Negative
 *  AC-PR-C04    forgot-password – invalid email format → 400             P0  Negative
 *  AC-PR-C05    forgot-password – IP rate limit hit → 429                P0  Negative
 *  AC-PR-C06    forgot-password – response never reveals email status    P1  Security
 *  AC-PR-C07    reset-password – valid token + valid passwords → 200     P0  Positive
 *  AC-PR-C08    reset-password – invalid/unknown token → 400             P0  Negative
 *  AC-PR-C09    reset-password – expired token → 400                     P0  Negative
 *  AC-PR-C10    reset-password – already-used token → 400                P0  Negative
 *  AC-PR-C11    reset-password – blank token field → 400                 P0  Negative
 *  AC-PR-C12    reset-password – blank newPassword → 400                 P0  Negative
 *  AC-PR-C13    reset-password – weak password (no uppercase) → 400      P0  Negative
 *  AC-PR-C14    reset-password – weak password (< 8 chars) → 400         P0  Negative
 *  AC-PR-C15    reset-password – password missing special char → 400     P0  Negative
 *  AC-PR-C16    reset-password – blank confirmPassword → 400             P0  Negative
 *  AC-PR-C17    reset-password – passwords do not match → 400            P0  Negative
 *  AC-PR-C18    reset-password – service not called on validation fail    P1  Negative
 * </pre>
 */
@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("Password Recovery endpoints | FR-UM-004 / US-PasswordRecovery")
class PasswordResetControllerTest {

    private static final String FORGOT_URL = "/api/auth/vendor/forgot-password";
    private static final String RESET_URL  = "/api/auth/vendor/reset-password";

    @Autowired private MockMvc      mockMvc;
    @Autowired private ObjectMapper objectMapper;

    // Service under test
    @MockBean private PasswordResetService passwordResetService;

    // Required to satisfy the AuthController constructor and JwtAuthenticationFilter component
    @MockBean private AuthService           authService;
    @MockBean private LoginAttemptService   loginAttemptService;
    @MockBean private JwtService            jwtService;
    @MockBean private TokenBlacklistService tokenBlacklistService;
    @MockBean private UserRepository        userRepository;

    /** Valid forgot-password request reused across tests. */
    private ForgotPasswordRequest validForgotRequest;

    /** Valid reset-password request reused across tests. */
    private ResetPasswordRequest validResetRequest;

    @BeforeEach
    void setUp() {
        validForgotRequest = new ForgotPasswordRequest();
        validForgotRequest.setEmail("vendor@example.com");

        validResetRequest = new ResetPasswordRequest();
        validResetRequest.setToken("847291");
        validResetRequest.setNewPassword("NewPass@2025");
        validResetRequest.setConfirmPassword("NewPass@2025");
    }

    // ── HTTP helpers ──────────────────────────────────────────────────────────

    private ResultActions postForgot(Object body) throws Exception {
        return mockMvc.perform(post(FORGOT_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private ResultActions postReset(Object body) throws Exception {
        return mockMvc.perform(post(RESET_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    // =========================================================================
    // POST /api/auth/vendor/forgot-password
    // =========================================================================

    @Nested
    @DisplayName("POST /api/auth/vendor/forgot-password")
    class ForgotPassword {

        /**
         * AC-PR-C01: A valid request for a registered email responds 200 with a
         * generic success message.
         * UC-PasswordRecovery step 4 – system sends the reset link.
         */
        @Test
        @DisplayName("[AC-PR-C01][P0] Returns 200 with generic success message for a registered email")
        void returns200ForRegisteredEmail() throws Exception {
            doNothing().when(passwordResetService).requestReset(anyString(), anyString());

            postForgot(validForgotRequest)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value(
                            "If this email is registered, a password reset link has been sent."));
        }

        /**
         * AC-PR-C02: A request for an unregistered email returns exactly the same
         * 200 response, preventing email enumeration.
         * FR-UM-004 Security – "Always show 'Email sent' regardless of whether the email exists".
         * UC-PasswordRecovery E1.
         */
        @Test
        @DisplayName("[AC-PR-C02][P0] Returns identical 200 response for an unregistered email (no enumeration)")
        void returnsIdentical200ForUnknownEmail() throws Exception {
            // Service silently returns for unknown emails (tested in unit tests)
            doNothing().when(passwordResetService).requestReset(anyString(), anyString());

            ForgotPasswordRequest unknownEmailReq = new ForgotPasswordRequest();
            unknownEmailReq.setEmail("ghost@nowhere.com");

            postForgot(unknownEmailReq)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value(
                            "If this email is registered, a password reset link has been sent."));
        }

        /**
         * AC-PR-C03: A blank email field is rejected with 400 and a validation error.
         * UC-PasswordRecovery step 1 – "Validate email format".
         */
        @Test
        @DisplayName("[AC-PR-C03][P0] Returns 400 when email is blank")
        void returns400ForBlankEmail() throws Exception {
            validForgotRequest.setEmail("");

            postForgot(validForgotRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));
        }

        /**
         * AC-PR-C04: A syntactically invalid email address is rejected before reaching
         * the service layer.
         * UC-PasswordRecovery step 1 – "Validate email format".
         */
        @Test
        @DisplayName("[AC-PR-C04][P0] Returns 400 for an invalid email format (missing @)")
        void returns400ForInvalidEmailFormat() throws Exception {
            validForgotRequest.setEmail("not-an-email");

            postForgot(validForgotRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.data.email").exists());
        }

        /**
         * AC-PR-C04b: A domain-less email address is also invalid.
         */
        @Test
        @DisplayName("[AC-PR-C04b][P0] Returns 400 for email without domain extension")
        void returns400ForEmailWithoutDomainExtension() throws Exception {
            validForgotRequest.setEmail("vendor@example");   // no TLD

            postForgot(validForgotRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));
        }

        /**
         * AC-PR-C05: When the IP rate limit is exceeded, the endpoint returns 429.
         * FR-UM-004 Security – "Rate limit: 3 requests/hour per IP".
         */
        @Test
        @DisplayName("[AC-PR-C05][P0] Returns 429 when the IP rate limit is exceeded")
        void returns429WhenRateLimitExceeded() throws Exception {
            doThrow(new PasswordResetRateLimitException())
                    .when(passwordResetService).requestReset(anyString(), anyString());

            postForgot(validForgotRequest)
                    .andExpect(status().isTooManyRequests())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(
                            "Too many password reset requests. Please try again later."));
        }

        /**
         * AC-PR-C06 (security): The response body for a registered and an
         * unregistered email must be identical so an attacker cannot distinguish them.
         */
        @Test
        @DisplayName("[AC-PR-C06][P1] Response body is identical whether email exists or not")
        void responseBodyIsIdenticalRegardlessOfEmailExistence() throws Exception {
            doNothing().when(passwordResetService).requestReset(anyString(), anyString());

            // Known email
            String bodyKnown = postForgot(validForgotRequest)
                    .andReturn().getResponse().getContentAsString();

            // Unknown email
            ForgotPasswordRequest unknownReq = new ForgotPasswordRequest();
            unknownReq.setEmail("nobody@unknown.org");
            String bodyUnknown = postForgot(unknownReq)
                    .andReturn().getResponse().getContentAsString();

            // Strip HTTP status – body equality is sufficient to verify identical messages
            com.fasterxml.jackson.databind.JsonNode nodeKnown =
                    objectMapper.readTree(bodyKnown);
            com.fasterxml.jackson.databind.JsonNode nodeUnknown =
                    objectMapper.readTree(bodyUnknown);

            assertThat(nodeKnown.get("message").asText())
                    .isEqualTo(nodeUnknown.get("message").asText());
            assertThat(nodeKnown.get("success").asBoolean())
                    .isEqualTo(nodeUnknown.get("success").asBoolean());
        }
    }

    // =========================================================================
    // POST /api/auth/vendor/reset-password
    // =========================================================================

    @Nested
    @DisplayName("POST /api/auth/vendor/reset-password")
    class ResetPassword {

        /**
         * AC-PR-C07: A valid token with matching passwords succeeds.
         * UC-PasswordRecovery steps 8–10 – system updates password, returns to login.
         */
        @Test
        @DisplayName("[AC-PR-C07][P0] Returns 200 with success message for valid token and matching passwords")
        void returns200ForValidTokenAndMatchingPasswords() throws Exception {
            doNothing().when(passwordResetService).resetPassword(anyString(), anyString());

            postReset(validResetRequest)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value(
                            "Password has been reset successfully. Please log in with your new password."));
        }

        /**
         * AC-PR-C08: An invalid or unknown token is rejected with 400.
         * UC-PasswordRecovery E2 – "token expires → system requests a restart".
         */
        @Test
        @DisplayName("[AC-PR-C08][P0] Returns 400 for an invalid (unknown) reset token")
        void returns400ForInvalidToken() throws Exception {
            doThrow(new InvalidResetTokenException())
                    .when(passwordResetService).resetPassword(anyString(), anyString());

            postReset(validResetRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));
        }

        /**
         * AC-PR-C09: An expired token is rejected with 400.
         * UC-PasswordRecovery E2 – "Token expires → system requests a restart".
         */
        @Test
        @DisplayName("[AC-PR-C09][P0] Returns 400 for an expired reset token")
        void returns400ForExpiredToken() throws Exception {
            doThrow(new InvalidResetTokenException(
                    "The password reset link has expired. Please request a new one."))
                    .when(passwordResetService).resetPassword(anyString(), anyString());

            postReset(validResetRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(
                            "The password reset link has expired. Please request a new one."));
        }

        /**
         * AC-PR-C10: An already-consumed token is rejected with 400.
         * FR-UM-004 Security – "Token is for one-time use only".
         */
        @Test
        @DisplayName("[AC-PR-C10][P0] Returns 400 for a token that has already been used")
        void returns400ForAlreadyUsedToken() throws Exception {
            doThrow(new InvalidResetTokenException(
                    "The password reset link is invalid or has already been used."))
                    .when(passwordResetService).resetPassword(anyString(), anyString());

            postReset(validResetRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message")
                            .value("The password reset link is invalid or has already been used."));
        }

        /**
         * AC-PR-C11: A blank token field fails Bean Validation before the service is invoked.
         */
        @Test
        @DisplayName("[AC-PR-C11][P0] Returns 400 when token field is blank")
        void returns400ForBlankToken() throws Exception {
            validResetRequest.setToken("");

            postReset(validResetRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.data.token").exists());
        }

        /**
         * AC-PR-C11b: A non-numeric token fails @Pattern validation.
         * The reset code must consist of exactly 6 numeric digits.
         */
        @Test
        @DisplayName("[AC-PR-C11b][P0] Returns 400 when token is not exactly 6 numeric digits")
        void returns400ForNonNumericToken() throws Exception {
            validResetRequest.setToken("abcXYZ");   // 6 chars but not digits

            postReset(validResetRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.data.token").exists());
        }

        /**
         * AC-PR-C12: A blank newPassword field fails Bean Validation.
         * UC-PasswordRecovery step 7 – "Enter the new password".
         */
        @Test
        @DisplayName("[AC-PR-C12][P0] Returns 400 when newPassword is blank")
        void returns400ForBlankNewPassword() throws Exception {
            validResetRequest.setNewPassword("");

            postReset(validResetRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.data.newPassword").exists());
        }

        /**
         * AC-PR-C13: A password without an uppercase letter is rejected.
         * UC-PasswordRecovery step 8 – "Check that the password is strong enough".
         */
        @Test
        @DisplayName("[AC-PR-C13][P0] Returns 400 when newPassword has no uppercase letter")
        void returns400ForPasswordWithoutUppercase() throws Exception {
            validResetRequest.setNewPassword("newpass@2025");
            validResetRequest.setConfirmPassword("newpass@2025");

            postReset(validResetRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.data.newPassword").exists());
        }

        /**
         * AC-PR-C14: A password shorter than 8 characters is rejected.
         * UC-PasswordRecovery step 8 – "Check that the password is strong enough".
         */
        @Test
        @DisplayName("[AC-PR-C14][P0] Returns 400 when newPassword is shorter than 8 characters")
        void returns400ForTooShortPassword() throws Exception {
            validResetRequest.setNewPassword("N@1aB");     // 5 chars
            validResetRequest.setConfirmPassword("N@1aB");

            postReset(validResetRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.data.newPassword").exists());
        }

        /**
         * AC-PR-C15: A password missing a special character is rejected.
         * UC-PasswordRecovery step 8 – "Check that the password is strong enough".
         */
        @Test
        @DisplayName("[AC-PR-C15][P0] Returns 400 when newPassword has no special character")
        void returns400ForPasswordWithoutSpecialChar() throws Exception {
            validResetRequest.setNewPassword("NewPass2025");   // no special char
            validResetRequest.setConfirmPassword("NewPass2025");

            postReset(validResetRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.data.newPassword").exists());
        }

        /**
         * AC-PR-C16: A blank confirmPassword field fails Bean Validation.
         */
        @Test
        @DisplayName("[AC-PR-C16][P0] Returns 400 when confirmPassword is blank")
        void returns400ForBlankConfirmPassword() throws Exception {
            validResetRequest.setConfirmPassword("");

            postReset(validResetRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.data.confirmPassword").exists());
        }

        /**
         * AC-PR-C17: Mismatched newPassword and confirmPassword fields are rejected
         * by the {@code @PasswordMatch} class-level constraint.
         * UC-PasswordRecovery step 8 – "Check that … the two fields match".
         * UC-PasswordRecovery E3 – "password … does not match → re-enter".
         */
        @Test
        @DisplayName("[AC-PR-C17][P0] Returns 400 when newPassword and confirmPassword do not match")
        void returns400WhenPasswordsDontMatch() throws Exception {
            validResetRequest.setNewPassword("NewPass@2025");
            validResetRequest.setConfirmPassword("Different@2025");

            postReset(validResetRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.data.confirmPassword").exists());
        }

        /**
         * AC-PR-C18: The service is never invoked when Bean Validation fails.
         * This ensures no side-effects (DB writes, email) occur on bad input.
         */
        @Test
        @DisplayName("[AC-PR-C18][P1] PasswordResetService is NOT called when request validation fails")
        void serviceIsNotCalledOnValidationFailure() throws Exception {
            validResetRequest.setToken("");   // triggers @NotBlank

            postReset(validResetRequest)
                    .andExpect(status().isBadRequest());

            verify(passwordResetService, never()).resetPassword(anyString(), anyString());
        }
    }
}

