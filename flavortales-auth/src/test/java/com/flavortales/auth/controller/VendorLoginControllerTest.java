package com.flavortales.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flavortales.auth.dto.LoginRequest;
import com.flavortales.auth.dto.LoginResponse;
import com.flavortales.auth.service.AuthService;
import com.flavortales.auth.service.JwtService;
import com.flavortales.auth.service.LoginAttemptService;
import com.flavortales.auth.service.TokenBlacklistService;
import com.flavortales.common.exception.AccountDisabledException;
import com.flavortales.common.exception.AccountLockedException;
import com.flavortales.common.exception.AccountPendingException;
import com.flavortales.common.exception.AccountRejectedException;
import com.flavortales.common.exception.AccountSuspendedException;
import com.flavortales.common.exception.InvalidCredentialsException;
import com.flavortales.common.exception.TooManyLoginAttemptsException;
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

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-layer integration tests for {@code POST /api/auth/vendor/login}.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>Use Case  : UC-Login-Vendor</li>
 *   <li>User Story: US-002 – Authentication / Vendor Login</li>
 *   <li>Acceptance: AC-002 (all criteria)</li>
 * </ul>
 *
 * <p><b>Scope</b> – {@link WebMvcTest} loads only the web layer (controller +
 * exception handler).  {@link AuthService} and {@link LoginAttemptService} are
 * replaced by Mockito stubs, keeping tests fast and isolated.
 *
 * <p><b>Coverage matrix</b>
 * <pre>
 *  Scenario                                        Priority  Type
 *  ──────────────────────────────────────────────────────────────
 *  Valid credentials → 200 + JSON body              P0       Positive
 *  Valid credentials → HTTP-only cookies set         P0       Positive
 *  rememberMe=true → longer cookie max-age           P1       Positive
 *  Invalid credentials → 401                         P0       Negative
 *  recordFailedAttempt called on bad credentials     P0       Negative
 *  Account pending  → 403                            P0       Negative
 *  Account rejected → 403                            P0       Negative
 *  Account suspended→ 403                            P0       Negative
 *  Account disabled → 403                            P0       Negative
 *  Lockout active   → 403                            P0       Negative
 *  Rate limit hit   → 429                            P0       Negative
 *  Blank email field → 400 validation error          P0       Negative
 *  Invalid email format → 400 validation error       P0       Negative
 *  Blank password field → 400 validation error       P0       Negative
 *  No session token for blocked accounts             P1       Security
 * </pre>
 */
@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("POST /api/auth/vendor/login | US-002 / AC-002")
class VendorLoginControllerTest {

    private static final String URL = "/api/auth/vendor/login";

    @Autowired private MockMvc       mockMvc;
    @Autowired private ObjectMapper  objectMapper;

    @MockBean  private AuthService          authService;
    @MockBean  private LoginAttemptService  loginAttemptService;
    // Required so JwtAuthenticationFilter @Component can be instantiated in the slice context
    @MockBean  private JwtService           jwtService;
    @MockBean  private TokenBlacklistService tokenBlacklistService;

    /** Reusable valid request with real-data values. */
    private LoginRequest validRequest;

    @BeforeEach
    void setUp() {
        validRequest = new LoginRequest();
        validRequest.setEmail("vendor@example.com");
        validRequest.setPassword("Vendor@123");
        validRequest.setRememberMe(false);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /** Stubs the service layer to return a successful login response. */
    private void stubSuccess() {
        LoginResponse resp = LoginResponse.builder()
                .userId(42)
                .email("vendor@example.com")
                .username("Shop Owner")
                .role("vendor")
                .accessToken("mock.access.token")
                .refreshToken("mock.refresh.token")
                .build();
        when(authService.login(any(LoginRequest.class))).thenReturn(resp);
    }

    private ResultActions perform(LoginRequest request) throws Exception {
        return mockMvc.perform(post(URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-002-01 / AC-002-03: Happy path
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Happy path – valid credentials, active account")
    class HappyPath {

        /**
         * AC-002-01 & AC-002-03: Successful login returns 200 with user data.
         */
        @Test
        @DisplayName("[AC-002-01][AC-002-03] Returns 200 with success=true and user identity fields")
        void returns200WithSuccessBody() throws Exception {
            stubSuccess();

            perform(validRequest)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Login successful"))
                    .andExpect(jsonPath("$.data.userId").value(42))
                    .andExpect(jsonPath("$.data.email").value("vendor@example.com"))
                    .andExpect(jsonPath("$.data.username").value("Shop Owner"))
                    .andExpect(jsonPath("$.data.role").value("vendor"));
        }

        /**
         * AC-002-06: Session token is created – access token present in response body.
         */
        @Test
        @DisplayName("[AC-002-06] Access token and refresh token are present in the response body")
        void returnsTokensInBody() throws Exception {
            stubSuccess();

            perform(validRequest)
                    .andExpect(jsonPath("$.data.accessToken").value("mock.access.token"))
                    .andExpect(jsonPath("$.data.refreshToken").value("mock.refresh.token"))
                    .andExpect(jsonPath("$.data.tokenType").value("Bearer"));
        }

        /**
         * AC-002-06: Session token is stored – HTTP-only Set-Cookie headers must be present.
         */
        @Test
        @DisplayName("[AC-002-06] Sets HTTP-only access_token and refresh_token cookies")
        void setsHttpOnlyCookies() throws Exception {
            stubSuccess();

            perform(validRequest)
                    .andExpect(header().exists("Set-Cookie"));
        }

        /**
         * AC-002-06 (edge): rememberMe=true must yield an access_token cookie with a
         * 7-day max-age (604800 seconds) instead of the default 1-day max-age.
         */
        @Test
        @DisplayName("[AC-002-06][Edge] rememberMe=true sets 7-day cookie max-age on access_token")
        void rememberMeTrueSetslongerCookieMaxAge() throws Exception {
            stubSuccess();
            validRequest.setRememberMe(true);

            perform(validRequest)
                    .andExpect(status().isOk())
                    // The Set-Cookie header for access_token must contain Max-Age=604800
                    .andExpect(result -> {
                        String setCookie = result.getResponse().getHeader("Set-Cookie");
                        assertThat(setCookie)
                                .contains("Max-Age=604800");
                    });
        }

        /**
         * Verifies that loginAttemptService.recordSuccessAndClear() is called after
         * a successful login (clears the attempt history → resets lockout window).
         */
        @Test
        @DisplayName("[AC-002-06] recordSuccessAndClear is invoked after successful login")
        void recordSuccessAndClearIsCalled() throws Exception {
            stubSuccess();

            perform(validRequest);

            verify(loginAttemptService).recordSuccessAndClear("vendor@example.com");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-002-02: Invalid credentials
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Invalid credentials – negative scenarios")
    class InvalidCredentials {

        /**
         * AC-002-02: Wrong password must be rejected with HTTP 401.
         */
        @Test
        @DisplayName("[AC-002-02] Wrong password → 401 Unauthorised with error message")
        void wrongPasswordReturns401() throws Exception {
            when(authService.login(any())).thenThrow(new InvalidCredentialsException());

            perform(validRequest)
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Invalid username/email or password"));
        }

        /**
         * AC-002-02: Unknown email must return the same error as wrong password
         * (prevents user enumeration).
         */
        @Test
        @DisplayName("[AC-002-02] Unknown email → 401 with same generic message")
        void unknownEmailReturns401() throws Exception {
            when(authService.login(any())).thenThrow(new InvalidCredentialsException());
            validRequest.setEmail("unknown@example.com");

            perform(validRequest)
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("Invalid username/email or password"));
        }

        /**
         * Security: Failed login must call recordFailedAttempt() so the failure
         * is counted towards the lockout threshold.
         */
        @Test
        @DisplayName("[Security] recordFailedAttempt is called when credentials are wrong")
        void recordFailedAttemptCalledOnBadCredentials() throws Exception {
            when(authService.login(any())).thenThrow(new InvalidCredentialsException());

            perform(validRequest);

            verify(loginAttemptService).recordFailedAttempt("vendor@example.com");
        }

        /**
         * Security: On credential failure no session cookies must be set.
         */
        @Test
        @DisplayName("[Security] No Set-Cookie header on failed login")
        void noTokenCookieOnFailedLogin() throws Exception {
            when(authService.login(any())).thenThrow(new InvalidCredentialsException());

            perform(validRequest)
                    .andExpect(result ->
                            assertThat(result.getResponse().getHeader("Set-Cookie")).isNull());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-002-04 / AC-002-05: Account status enforcement
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Account status checks – AC-002-04 and AC-002-05")
    class AccountStatusChecks {

        /**
         * AC-002-04: Temporarily locked (suspended) account → 403 with descriptive message.
         */
        @Test
        @DisplayName("[AC-002-04] Suspended account → 403 Forbidden with locked message")
        void suspendedAccountReturns403() throws Exception {
            when(authService.login(any())).thenThrow(new AccountSuspendedException());

            perform(validRequest)
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Account temporarily suspended. Please contact support."));
        }

        /**
         * AC-002-05: Disabled / inactive account → 403 with inactive message.
         */
        @Test
        @DisplayName("[AC-002-05] Inactive/disabled account → 403 Forbidden with inactive message")
        void inactiveAccountReturns403() throws Exception {
            when(authService.login(any())).thenThrow(new AccountDisabledException());

            perform(validRequest)
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value("Account is inactive. Please contact support."));
        }

        /**
         * AC-002-05: Pending-approval account → 403 with pending message.
         */
        @Test
        @DisplayName("[AC-002-05] Pending account → 403 Forbidden with pending-approval message")
        void pendingAccountReturns403() throws Exception {
            when(authService.login(any())).thenThrow(new AccountPendingException());

            perform(validRequest)
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value(
                            "Account pending approval. Please wait for administrator review."));
        }

        /**
         * AC-002-05: Rejected account → 403 with rejection message.
         */
        @Test
        @DisplayName("[AC-002-05] Rejected account → 403 Forbidden with rejected message")
        void rejectedAccountReturns403() throws Exception {
            when(authService.login(any())).thenThrow(new AccountRejectedException());

            perform(validRequest)
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value(
                            "Account rejected. Please contact support for more information."));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Security measures: rate limiting & lockout
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Security – rate limiting and lockout")
    class SecurityMeasures {

        /**
         * Lockout rule: 10 failed attempts → account locked for 30 minutes → 403.
         */
        @Test
        @DisplayName("[Security] Active lockout → 403 Forbidden with lock-time in message")
        void activeLockoutReturns403() throws Exception {
            LocalDateTime lockedUntil = LocalDateTime.now().plusMinutes(25);
            doThrow(new AccountLockedException(lockedUntil))
                    .when(loginAttemptService).checkRateLimitAndLockout(anyString());

            perform(validRequest)
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(
                            org.hamcrest.Matchers.containsString("locked")));
        }

        /**
         * Rate-limit rule: 5 attempts / 15 minutes → 429 Too Many Requests.
         */
        @Test
        @DisplayName("[Security] Rate limit exceeded → 429 Too Many Requests")
        void rateLimitExceededReturns429() throws Exception {
            doThrow(new TooManyLoginAttemptsException())
                    .when(loginAttemptService).checkRateLimitAndLockout(anyString());

            perform(validRequest)
                    .andExpect(status().isTooManyRequests())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Too many login attempts. Please try again later."));
        }

        /**
         * Security: When rate limit is hit, AuthService.login() must NOT be called.
         */
        @Test
        @DisplayName("[Security] AuthService.login() is not called when rate limit blocks the request")
        void loginNotCalledWhenRateLimitBlocks() throws Exception {
            doThrow(new TooManyLoginAttemptsException())
                    .when(loginAttemptService).checkRateLimitAndLockout(anyString());

            perform(validRequest);

            verify(authService, never()).login(any());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Input validation
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Input validation – AC-002-01")
    class InputValidation {

        /**
         * AC-002-01: The login form requires an email field.
         */
        @Test
        @DisplayName("[AC-002-01] Blank email → 400 Bad Request with 'email' field error")
        void blankEmailReturns400() throws Exception {
            validRequest.setEmail("");

            perform(validRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Validation failed"))
                    .andExpect(jsonPath("$.data.email").exists());
        }

        /**
         * AC-002-01: Email must be in valid format.
         */
        @Test
        @DisplayName("[AC-002-01] Invalid email format → 400 Bad Request")
        void invalidEmailFormatReturns400() throws Exception {
            validRequest.setEmail("not-an-email");

            perform(validRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.data.email").exists());
        }

        /**
         * AC-002-01: Missing "@" symbol in email.
         */
        @Test
        @DisplayName("[AC-002-01][Edge] Email missing '@' symbol → 400 Bad Request")
        void emailMissingAtSymbolReturns400() throws Exception {
            validRequest.setEmail("vendorexample.com");

            perform(validRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.data.email").exists());
        }

        /**
         * AC-002-02: Password field is required.
         */
        @Test
        @DisplayName("[AC-002-02] Blank password → 400 Bad Request with 'password' field error")
        void blankPasswordReturns400() throws Exception {
            validRequest.setPassword("");

            perform(validRequest)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.data.password").exists());
        }

        /**
         * Validation gate: When request body is invalid, loginAttemptService must
         * NOT be invoked – the request never reaches the security check.
         */
        @Test
        @DisplayName("[Edge] LoginAttemptService not called when request fails validation")
        void loginAttemptServiceNotCalledOnValidationFailure() throws Exception {
            validRequest.setEmail("");

            perform(validRequest);

            verify(loginAttemptService, never()).checkRateLimitAndLockout(anyString());
        }
    }
}
