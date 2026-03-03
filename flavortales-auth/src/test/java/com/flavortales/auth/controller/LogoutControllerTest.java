package com.flavortales.auth.controller;

import com.flavortales.auth.service.AuthService;
import com.flavortales.auth.service.JwtService;
import com.flavortales.auth.service.LoginAttemptService;
import com.flavortales.auth.service.PasswordResetService;
import com.flavortales.auth.service.TokenBlacklistService;
import com.flavortales.user.repository.UserRepository;
import com.flavortales.common.dto.ApiResponse;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-layer integration tests for {@code POST /api/auth/vendor/logout}.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>Requirement : FR-UM-003 – Logout</li>
 *   <li>Use Case    : UC-Logout-Vendor</li>
 *   <li>User Story  : US-004 – Vendor/Admin Logout</li>
 *   <li>Acceptance  : AC-003-01 Session token is invalidated</li>
 *   <li>Acceptance  : AC-003-02 Logout event is recorded</li>
 *   <li>Acceptance  : AC-003-03 Cookies are cleared on logout</li>
 *   <li>Acceptance  : AC-003-04 No token / expired session → still returns 200</li>
 * </ul>
 *
 * <p><b>Scope</b> – {@link WebMvcTest} loads only the web layer (controller +
 * exception handler). {@link AuthService} and {@link LoginAttemptService} are
 * replaced by Mockito stubs. Cookie-clearing logic, token resolution, and
 * response body format are exercised against the real controller code.
 *
 * <p><b>Preconditions</b>
 * <ul>
 *   <li>Vendor or admin is logged in and holds a valid HTTP-only cookie
 *       {@code access_token} or has sent an {@code Authorization: Bearer} header.</li>
 *   <li>The endpoint is publicly accessible (no authentication required to logout).</li>
 * </ul>
 *
 * <p><b>Coverage matrix</b>
 * <pre>
 *  Scenario                                                Priority  Type
 *  ────────────────────────────────────────────────────────────────────────
 *  Cookie token present → 200 OK, success body             P0       Positive
 *  Bearer header token  → 200 OK, success body             P0       Positive
 *  No token at all      → 200 OK (graceful expired path)   P0       Positive
 *  authService.logout() called with cookie token value     P0       Positive
 *  authService.logout() called with Bearer token value     P0       Positive
 *  authService.logout() called with null when no token     P0       Positive
 *  access_token cookie cleared (Max-Age=0)                 P0       Positive
 *  refresh_token cookie cleared (Max-Age=0)                P0       Positive
 *  Response body: success=true, message="Logout successful"P0       Positive
 *  Response body: data field is absent / null              P1       Positive
 * </pre>
 */
@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("POST /api/auth/vendor/logout | FR-UM-003 / US-004")
class LogoutControllerTest {

    private static final String URL = "/api/auth/vendor/logout";

    /** Raw token value stored in the access_token cookie. */
    private static final String ACCESS_TOKEN_VALUE  = "mock.access.token";
    /** Raw token value used in the Authorization header. */
    private static final String BEARER_TOKEN_VALUE  = "mock.bearer.token";

    @Autowired private MockMvc             mockMvc;
    @MockBean  private AuthService          authService;
    @MockBean  private LoginAttemptService  loginAttemptService;
    @MockBean  private PasswordResetService passwordResetService;
    // Required so JwtAuthenticationFilter @Component can be instantiated in the slice context
    @MockBean  private JwtService           jwtService;
    @MockBean  private TokenBlacklistService tokenBlacklistService;
    @MockBean  private UserRepository        userRepository;

    @BeforeEach
    void setUp() {
        // logout() is a void method; Mockito stubbed to do nothing by default,
        // but explicitly declared here for clarity.
        doNothing().when(authService).logout(org.mockito.ArgumentMatchers.any());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /** Performs POST /api/auth/vendor/logout with an access_token cookie. */
    private ResultActions logoutWithCookie(String tokenValue) throws Exception {
        return mockMvc.perform(post(URL)
                .cookie(new Cookie("access_token", tokenValue)));
    }

    /** Performs POST /api/auth/vendor/logout with an Authorization header. */
    private ResultActions logoutWithBearer(String tokenValue) throws Exception {
        return mockMvc.perform(post(URL)
                .header("Authorization", "Bearer " + tokenValue));
    }

    /** Performs POST /api/auth/vendor/logout with no credentials whatsoever. */
    private ResultActions logoutWithNoToken() throws Exception {
        return mockMvc.perform(post(URL));
    }

    /**
     * Asserts that the response's {@code Set-Cookie} headers contain a cookie
     * named {@code name} with {@code Max-Age=0} (cookie deletion directive).
     */
    private void assertCookieCleared(ResultActions result, String cookieName) throws Exception {
        result.andExpect(res -> {
            List<String> setCookies = res.getResponse().getHeaders("Set-Cookie");
            assertThat(setCookies)
                    .withFailMessage(
                            "Expected a Set-Cookie header clearing '%s' (Max-Age=0) but found: %s",
                            cookieName, setCookies)
                    .anyMatch(h -> h.contains(cookieName)
                            && h.contains("Max-Age=0"));
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-003-01 & AC-003-03: Happy path – cookie client
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Happy path – access_token cookie client")
    class CookieClient {

        /**
         * AC-003-01: Successful logout must return HTTP 200 with a JSON body
         * indicating success – regardless of how the token was delivered.
         */
        @Test
        @DisplayName("[AC-003-01][P0] Cookie token → 200 OK with success=true")
        void cookieLogoutReturns200WithSuccessBody() throws Exception {
            logoutWithCookie(ACCESS_TOKEN_VALUE)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Logout successful"));
        }

        /**
         * AC-003-01: The controller must pass the exact cookie token value to
         * {@link AuthService#logout(String)} so the service can blacklist it.
         */
        @Test
        @DisplayName("[AC-003-01][P0] authService.logout() is called with the cookie token value")
        void authServiceLogoutCalledWithCookieToken() throws Exception {
            logoutWithCookie(ACCESS_TOKEN_VALUE);

            verify(authService).logout(ACCESS_TOKEN_VALUE);
        }

        /**
         * AC-003-03: After logout the browser must discard the access_token cookie.
         * The server signals this by setting Max-Age=0 in the Set-Cookie response.
         */
        @Test
        @DisplayName("[AC-003-03][P0] access_token cookie is cleared (Max-Age=0) after logout")
        void accessTokenCookieClearedAfterLogout() throws Exception {
            ResultActions result = logoutWithCookie(ACCESS_TOKEN_VALUE);
            assertCookieCleared(result, "access_token");
        }

        /**
         * AC-003-03: The refresh_token cookie must also be invalidated so that
         * the client cannot obtain a new access token after logout.
         */
        @Test
        @DisplayName("[AC-003-03][P0] refresh_token cookie is cleared (Max-Age=0) after logout")
        void refreshTokenCookieClearedAfterLogout() throws Exception {
            ResultActions result = logoutWithCookie(ACCESS_TOKEN_VALUE);
            assertCookieCleared(result, "refresh_token");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-003-01 & AC-003-03: Happy path – Bearer header client
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Happy path – Authorization: Bearer header client")
    class BearerClient {

        /**
         * API / mobile clients send the token in the Authorization header.
         * The controller must extract and forward it to the service identically.
         */
        @Test
        @DisplayName("[AC-003-01][P0] Bearer header token → 200 OK with success=true")
        void bearerLogoutReturns200WithSuccessBody() throws Exception {
            logoutWithBearer(BEARER_TOKEN_VALUE)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Logout successful"));
        }

        /**
         * AC-003-01: Service must receive the exact bearer value (without the
         * "Bearer " prefix) so the blacklist lookup works correctly.
         */
        @Test
        @DisplayName("[AC-003-01][P0] authService.logout() is called with the raw Bearer token value")
        void authServiceLogoutCalledWithBearerToken() throws Exception {
            logoutWithBearer(BEARER_TOKEN_VALUE);

            verify(authService).logout(BEARER_TOKEN_VALUE);
        }

        /**
         * AC-003-03: Even API clients must have their cookies cleared on logout
         * to handle mixed browser/API usage sessions.
         */
        @Test
        @DisplayName("[AC-003-03][P0] Cookies are cleared even when token came from Authorization header")
        void cookiesClearedForBearerClient() throws Exception {
            ResultActions result = logoutWithBearer(BEARER_TOKEN_VALUE);
            assertCookieCleared(result, "access_token");
            assertCookieCleared(result, "refresh_token");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-003-04: Auto-logout / session-expired path (no token present)
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("No token – FR-UM-003 auto-logout / session-expired path")
    class NoToken {

        /**
         * AC-003-04: When no token is present (e.g. session already expired,
         * browser cleared cookies) the logout endpoint must still return 200 OK.
         * The frontend uses this response to confirm it can redirect to login
         * and show the "Session expired" message.
         */
        @Test
        @DisplayName("[AC-003-04][P0] No token in request → 200 OK (graceful expired session)")
        void noTokenReturns200WithSuccessBody() throws Exception {
            logoutWithNoToken()
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Logout successful"));
        }

        /**
         * AC-003-04: When no token is present the controller must still invoke
         * {@code authService.logout(null)} so the service can log the event.
         */
        @Test
        @DisplayName("[AC-003-04][P0] authService.logout(null) is called when no token is present")
        void authServiceLogoutCalledWithNullWhenNoToken() throws Exception {
            logoutWithNoToken();

            verify(authService).logout(isNull());
        }

        /**
         * AC-003-03: Cookies must be cleared even when no token was found,
         * ensuring the browser state is clean after an auto-logout.
         */
        @Test
        @DisplayName("[AC-003-03][P0] Cookies are cleared even when request has no token")
        void cookiesClearedEvenWithNoToken() throws Exception {
            ResultActions result = logoutWithNoToken();
            assertCookieCleared(result, "access_token");
            assertCookieCleared(result, "refresh_token");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Response format
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Response body format – AC-003-01")
    class ResponseFormat {

        /**
         * AC-003-01: The response body must strictly follow the {@link ApiResponse}
         * envelope with {@code success:true} and the expected message string.
         */
        @Test
        @DisplayName("[P0] Response body contains success=true and 'Logout successful' message")
        void responseBodyHasCorrectStructure() throws Exception {
            logoutWithCookie(ACCESS_TOKEN_VALUE)
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Logout successful"));
        }

        /**
         * AC-003-01: The {@code data} field must be absent (or null) in the
         * logout response since no payload other than the status message is needed.
         */
        @Test
        @DisplayName("[P1] Response body has no data payload (data field is absent)")
        void responseBodyHasNoData() throws Exception {
            logoutWithCookie(ACCESS_TOKEN_VALUE)
                    .andExpect(jsonPath("$.data").doesNotExist());
        }
    }
}
