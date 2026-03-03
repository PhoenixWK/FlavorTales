package com.flavortales.auth.security;

import com.flavortales.auth.service.JwtService;
import com.flavortales.auth.service.TokenBlacklistService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import jakarta.servlet.http.Cookie;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link JwtAuthenticationFilter}.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>Requirement : FR-UM-003 – Logout (invalidate session token on all requests)</li>
 *   <li>Use Case    : UC-Logout-Vendor</li>
 *   <li>User Story  : US-004 – Vendor/Admin Logout</li>
 *   <li>Acceptance  : AC-003-01 Revoked token is rejected on subsequent requests</li>
 *   <li>Acceptance  : AC-003-04 Expired session triggers "Session expired" response</li>
 * </ul>
 *
 * <p><b>Preconditions</b>
 * <ul>
 *   <li>A JWT has been issued by the server and is held by the client
 *       (cookie or Authorization header).</li>
 *   <li>{@link TokenBlacklistService} is initialised and its blacklist is
 *       consistent with previously executed logout calls.</li>
 * </ul>
 *
 * <p><b>Coverage matrix</b>
 * <pre>
 *  Scenario                                                  Priority  Type
 *  ──────────────────────────────────────────────────────────────────────────
 *  Valid cookie token, not blacklisted → auth populated       P0       Positive
 *  Valid Bearer header token → auth populated                 P0       Positive
 *  Blacklisted token → SecurityContext remains empty          P0       Negative
 *  Expired token (isTokenValid=false) → SecurityContext empty P0       Negative
 *  No token in request → SecurityContext remains empty        P0       Negative
 *  Malformed JWT (JwtException) → no exception, empty auth    P0       Edge
 *  filter always calls chain.doFilter()                       P0       Positive
 *  Cookie takes priority over Authorization header            P1       Edge
 *  Role is set correctly in GrantedAuthority                  P1       Positive
 * </pre>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("JwtAuthenticationFilter | FR-UM-003 / US-004")
class JwtAuthenticationFilterTest {

    @Mock private JwtService            jwtService;
    @Mock private TokenBlacklistService tokenBlacklistService;

    @InjectMocks
    private JwtAuthenticationFilter filter;

    private static final String VALID_TOKEN = "header.payload.signature";
    private static final String USER_EMAIL  = "vendor@example.com";
    private static final String USER_ROLE   = "vendor";

    // ─────────────────────────────────────────────────────────────────────────
    // Setup / teardown
    // ─────────────────────────────────────────────────────────────────────────

    @AfterEach
    void clearSecurityContext() {
        // Prevent SecurityContext state from leaking between tests
        SecurityContextHolder.clearContext();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Creates a {@link Claims} stub with the given email as subject and the given
     * role stored under the {@code "role"} claim.
     */
    private Claims stubValidClaims(String email, String role) {
        Claims claims = mock(Claims.class);
        when(claims.getSubject()).thenReturn(email);
        when(claims.get("role", String.class)).thenReturn(role);
        return claims;
    }

    /**
     * Stubs {@link JwtService} to report the token as valid and return prepared claims.
     */
    private void stubValidToken(String token, Claims claims) {
        when(tokenBlacklistService.isBlacklisted(token)).thenReturn(false);
        when(jwtService.isTokenValid(token)).thenReturn(true);
        when(jwtService.extractAllClaims(token)).thenReturn(claims);
    }

    /**
     * Runs the filter with the given request and returns the authentication set
     * on the {@link SecurityContextHolder}.
     */
    private Authentication runFilter(MockHttpServletRequest request) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = new MockFilterChain();
        filter.doFilter(request, response, chain);
        return SecurityContextHolder.getContext().getAuthentication();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-003-01: Valid token flows
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Valid token – SecurityContext population")
    class ValidToken {

        /**
         * AC-003-01: A valid, non-blacklisted token supplied via the HTTP-only
         * cookie must result in an authenticated {@link SecurityContextHolder}.
         */
        @Test
        @DisplayName("[AC-003-01][P0] Valid access_token cookie → SecurityContext is populated")
        void validCookieTokenPopulatesSecurityContext() throws Exception {
            Claims claims = stubValidClaims(USER_EMAIL, USER_ROLE);
            stubValidToken(VALID_TOKEN, claims);

            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setCookies(new Cookie("access_token", VALID_TOKEN));

            Authentication auth = runFilter(request);

            assertThat(auth).isNotNull();
            assertThat(auth.isAuthenticated()).isTrue();
            assertThat(auth.getPrincipal()).isEqualTo(USER_EMAIL);
        }

        /**
         * Mobile / API clients send the token in the Authorization header.
         * The filter must accept this fallback and populate the SecurityContext.
         */
        @Test
        @DisplayName("[P0] Valid Bearer header token → SecurityContext is populated")
        void validBearerHeaderTokenPopulatesSecurityContext() throws Exception {
            Claims claims = stubValidClaims(USER_EMAIL, USER_ROLE);
            stubValidToken(VALID_TOKEN, claims);

            MockHttpServletRequest request = new MockHttpServletRequest();
            request.addHeader("Authorization", "Bearer " + VALID_TOKEN);

            Authentication auth = runFilter(request);

            assertThat(auth).isNotNull();
            assertThat(auth.isAuthenticated()).isTrue();
            assertThat(auth.getPrincipal()).isEqualTo(USER_EMAIL);
        }

        /**
         * AC-003-01: The role must be propagated as a Spring-Security
         * {@code GrantedAuthority} prefixed with "ROLE_".
         */
        @Test
        @DisplayName("[P1] Role is stored as ROLE_<role> GrantedAuthority")
        void roleIsPrefixedCorrectly() throws Exception {
            Claims claims = stubValidClaims(USER_EMAIL, USER_ROLE);
            stubValidToken(VALID_TOKEN, claims);

            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setCookies(new Cookie("access_token", VALID_TOKEN));

            Authentication auth = runFilter(request);

            assertThat(auth.getAuthorities())
                    .extracting(a -> a.getAuthority())
                    .containsExactly("ROLE_" + USER_ROLE);
        }

        /**
         * Edge: when both a cookie and an Authorization header are present,
         * the cookie must always be preferred (browser-client precedence).
         */
        @Test
        @DisplayName("[Edge][P1] Cookie takes priority over Authorization header when both present")
        void cookiePriorityOverHeader() throws Exception {
            String cookieToken = VALID_TOKEN;
            Claims claims = stubValidClaims(USER_EMAIL, USER_ROLE);
            stubValidToken(cookieToken, claims);

            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setCookies(new Cookie("access_token", cookieToken));
            request.addHeader("Authorization", "Bearer different.token");

            Authentication auth = runFilter(request);

            // Verify the cookie token was used (extractAllClaims called with cookieToken)
            verify(jwtService).extractAllClaims(cookieToken);
            assertThat(auth).isNotNull();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-003-01: Blacklisted token (post-logout requests)
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Blacklisted token – AC-003-01 (post-logout guard)")
    class BlacklistedToken {

        /**
         * AC-003-01: The primary security contract of the logout feature –
         * a token that was revoked via {@code POST /api/auth/vendor/logout}
         * must be rejected on all subsequent requests.
         */
        @Test
        @DisplayName("[AC-003-01][P0] Blacklisted token in cookie → SecurityContext is NOT populated")
        void blacklistedTokenIsRejected() throws Exception {
            when(tokenBlacklistService.isBlacklisted(VALID_TOKEN)).thenReturn(true);

            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setCookies(new Cookie("access_token", VALID_TOKEN));

            Authentication auth = runFilter(request);

            assertThat(auth).isNull();
        }

        /**
         * Security: when a token is blacklisted, the JWT service must not even
         * be consulted for validation (short-circuit evaluation).
         */
        @Test
        @DisplayName("[Security][P0] isTokenValid() is not called for blacklisted token")
        void jwtValidationSkippedForBlacklistedToken() throws Exception {
            when(tokenBlacklistService.isBlacklisted(VALID_TOKEN)).thenReturn(true);

            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setCookies(new Cookie("access_token", VALID_TOKEN));

            runFilter(request);

            verify(jwtService, never()).isTokenValid(VALID_TOKEN);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-003-04: Expired token (auto-logout path)
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Expired token – AC-003-04 auto-logout response")
    class ExpiredToken {

        /**
         * AC-003-04: An expired token that is not blacklisted (e.g. TTL elapsed
         * naturally) must not authenticate the request. Spring Security's entry
         * point will then return the "Session expired" message.
         */
        @Test
        @DisplayName("[AC-003-04][P0] Expired token → SecurityContext remains empty")
        void expiredTokenDoesNotAuthenticate() throws Exception {
            when(tokenBlacklistService.isBlacklisted(VALID_TOKEN)).thenReturn(false);
            when(jwtService.isTokenValid(VALID_TOKEN)).thenReturn(false);

            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setCookies(new Cookie("access_token", VALID_TOKEN));

            Authentication auth = runFilter(request);

            assertThat(auth).isNull();
        }

        /**
         * AC-003-04: The filter must not call extractAllClaims for an expired
         * token – there is no need to parse its payload.
         */
        @Test
        @DisplayName("[AC-003-04][P0] extractAllClaims() not called for expired token")
        void claimsNotParsedForExpiredToken() throws Exception {
            when(tokenBlacklistService.isBlacklisted(VALID_TOKEN)).thenReturn(false);
            when(jwtService.isTokenValid(VALID_TOKEN)).thenReturn(false);

            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setCookies(new Cookie("access_token", VALID_TOKEN));

            runFilter(request);

            verify(jwtService, never()).extractAllClaims(VALID_TOKEN);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // No token present in request
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("No token in request")
    class NoToken {

        /**
         * When an unauthenticated request arrives (no cookie, no header), the
         * filter must leave the SecurityContext empty. Spring Security's protected
         * routes will then challenge the client with 401.
         */
        @Test
        @DisplayName("[P0] No token anywhere → SecurityContext is empty")
        void noTokenLeavesContextEmpty() throws Exception {
            MockHttpServletRequest request = new MockHttpServletRequest();

            Authentication auth = runFilter(request);

            assertThat(auth).isNull();
        }

        /**
         * With no token, the blacklist and JWT service must not be consulted.
         */
        @Test
        @DisplayName("[P0] No token → blacklist and JWT service are not invoked")
        void noTokenSkipsAllServiceCalls() throws Exception {
            MockHttpServletRequest request = new MockHttpServletRequest();

            runFilter(request);

            verify(tokenBlacklistService, never()).isBlacklisted(org.mockito.ArgumentMatchers.anyString());
            verify(jwtService, never()).isTokenValid(org.mockito.ArgumentMatchers.anyString());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Edge: malformed JWT token
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Malformed token – resilience")
    class MalformedToken {

        /**
         * Edge: a malformed or tampered token that passes the blacklist check but
         * then throws {@link JwtException} during claim parsing must leave the
         * SecurityContext empty WITHOUT propagating the exception. The filter
         * must always call chain.doFilter() so that Spring Security's normal
         * 401 path is triggered.
         */
        @Test
        @DisplayName("[Edge][P0] JwtException on extractAllClaims → SecurityContext empty, no exception thrown")
        void malformedTokenDoesNotThrow() throws Exception {
            when(tokenBlacklistService.isBlacklisted(VALID_TOKEN)).thenReturn(false);
            when(jwtService.isTokenValid(VALID_TOKEN)).thenReturn(true);
            when(jwtService.extractAllClaims(VALID_TOKEN))
                    .thenThrow(new JwtException("tampered payload"));

            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setCookies(new Cookie("access_token", VALID_TOKEN));

            assertThatCode(() -> runFilter(request)).doesNotThrowAnyException();
            assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Filter chain continuity
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Filter chain – chain.doFilter() always called")
    class FilterChainContinuity {

        /**
         * Regardless of the token state, the filter must always delegate to the
         * next filter in the chain.  Failure to call chain.doFilter() would hang
         * the request.
         */
        @Test
        @DisplayName("[P0] chain.doFilter() is called after valid token processing")
        void chainCalledForValidToken() throws Exception {
            Claims claims = stubValidClaims(USER_EMAIL, USER_ROLE);
            stubValidToken(VALID_TOKEN, claims);

            MockHttpServletRequest  request  = new MockHttpServletRequest();
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain         chain    = new MockFilterChain();

            request.setCookies(new Cookie("access_token", VALID_TOKEN));
            filter.doFilter(request, response, chain);

            // MockFilterChain records the last request/response – non-null means doFilter was called
            assertThat(chain.getRequest()).isNotNull();
        }

        @Test
        @DisplayName("[P0] chain.doFilter() is called even when no token is present")
        void chainCalledWithNoToken() throws Exception {
            MockHttpServletRequest  request  = new MockHttpServletRequest();
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain         chain    = new MockFilterChain();

            filter.doFilter(request, response, chain);

            assertThat(chain.getRequest()).isNotNull();
        }

        @Test
        @DisplayName("[P0] chain.doFilter() is called even when the token is blacklisted")
        void chainCalledForBlacklistedToken() throws Exception {
            when(tokenBlacklistService.isBlacklisted(VALID_TOKEN)).thenReturn(true);

            MockHttpServletRequest  request  = new MockHttpServletRequest();
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain         chain    = new MockFilterChain();

            request.setCookies(new Cookie("access_token", VALID_TOKEN));
            filter.doFilter(request, response, chain);

            assertThat(chain.getRequest()).isNotNull();
        }
    }
}
