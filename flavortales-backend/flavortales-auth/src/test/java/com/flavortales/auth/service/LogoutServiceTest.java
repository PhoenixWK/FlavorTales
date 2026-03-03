package com.flavortales.auth.service;

import com.flavortales.auth.repository.EmailVerificationRepository;
import com.flavortales.notification.service.EmailService;
import com.flavortales.user.repository.UserRepository;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AuthService#logout(String)}.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>Requirement : FR-UM-003 – Logout</li>
 *   <li>Use Case    : UC-Logout-Vendor</li>
 *   <li>User Story  : US-004 – Vendor/Admin Logout</li>
 *   <li>Acceptance  : AC-003-01 Session token is invalidated</li>
 *   <li>Acceptance  : AC-003-02 Logout event is logged</li>
 * </ul>
 *
 * <p><b>Preconditions</b>
 * <ul>
 *   <li>A vendor or admin is authenticated and holds a valid access token.</li>
 *   <li>{@link TokenBlacklistService} bean is available in the application context.</li>
 * </ul>
 *
 * <p><b>Coverage matrix</b>
 * <pre>
 *  Scenario                                              Priority  Type
 *  ────────────────────────────────────────────────────────────────────
 *  Valid token → blacklist() is called with token         P0       Positive
 *  Valid token → extractSubject resolves the user email   P0       Positive
 *  Null token  → returns early, blacklist() not called    P0       Negative
 *  Blank token → returns early, blacklist() not called    P0       Negative
 *  whitespace-only token → treated as blank               P1       Edge
 *  JwtException on extractSubject → blacklist still runs  P0       Edge
 *  No exception is propagated to the caller               P0       Edge
 * </pre>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService – logout() | FR-UM-003 / US-004")
class LogoutServiceTest {

    // ── Mocked dependencies ───────────────────────────────────────────────────
    @Mock private UserRepository             userRepository;
    @Mock private EmailVerificationRepository emailVerificationRepository;
    @Mock private EmailService               emailService;
    @Mock private JwtService                 jwtService;
    @Mock private TokenBlacklistService      tokenBlacklistService;

    @InjectMocks
    private AuthService authService;

    /** Raw compact JWT string representing a real vendor session. */
    private static final String VALID_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
            + ".eyJzdWIiOiJ2ZW5kb3JAZXhhbXBsZS5jb20ifQ"
            + ".signature";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "expirationMinutes", 15);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-003-01: Token invalidation – happy path
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Happy path – token invalidation")
    class HappyPath {

        /**
         * AC-003-01: The primary contract of logout is that the token is added
         * to the blacklist so no further requests can use it.
         */
        @Test
        @DisplayName("[AC-003-01][P0] Valid token → tokenBlacklistService.blacklist() is called with the exact token")
        void validTokenIsBlacklisted() {
            when(jwtService.extractSubject(VALID_TOKEN)).thenReturn("vendor@example.com");

            authService.logout(VALID_TOKEN);

            verify(tokenBlacklistService).blacklist(VALID_TOKEN);
        }

        /**
         * AC-003-02: Logout event must record which user logged out. The service
         * attempts to extract the subject (email) from the token so the info can
         * be included in the audit log.
         */
        @Test
        @DisplayName("[AC-003-02][P0] Valid token → extractSubject is called for audit logging")
        void extractSubjectIsCalledForAuditLog() {
            when(jwtService.extractSubject(VALID_TOKEN)).thenReturn("vendor@example.com");

            authService.logout(VALID_TOKEN);

            verify(jwtService).extractSubject(VALID_TOKEN);
        }

        /**
         * AC-003-01: Logout must not propagate any exception to the caller
         * regardless of internal state; the endpoint must always return 200.
         */
        @Test
        @DisplayName("[P0] logout() does not throw an exception under normal conditions")
        void logoutDoesNotThrow() {
            when(jwtService.extractSubject(VALID_TOKEN)).thenReturn("vendor@example.com");

            assertThatCode(() -> authService.logout(VALID_TOKEN)).doesNotThrowAnyException();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-003-03: Auto-logout / session-expired path – null or blank token
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Null / blank token – FR-UM-003 auto-logout path")
    class NullOrBlankToken {

        /**
         * Auto-logout: when the browser sends no token (session already expired),
         * the service must return gracefully without attempting to blacklist or
         * call the JWT service.
         */
        @Test
        @DisplayName("[AC-003-03][P0] Null token → returns early; blacklist is not called")
        void nullTokenReturnsEarlyWithoutBlacklisting() {
            authService.logout(null);

            verify(tokenBlacklistService, never()).blacklist(anyString());
            verify(jwtService, never()).extractSubject(anyString());
        }

        /**
         * Auto-logout: an empty string token (e.g. cleared cookie) must be handled
         * the same as null.
         */
        @Test
        @DisplayName("[P0] Empty string token → returns early; blacklist is not called")
        void emptyTokenReturnsEarlyWithoutBlacklisting() {
            authService.logout("");

            verify(tokenBlacklistService, never()).blacklist(anyString());
            verify(jwtService, never()).extractSubject(anyString());
        }

        /**
         * Edge: a whitespace-only token must be treated as blank, not forwarded
         * to the blacklist service.
         */
        @Test
        @DisplayName("[Edge][P1] Whitespace-only token → treated as blank; blacklist not called")
        void whitespaceTokenReturnsEarly() {
            authService.logout("   ");

            verify(tokenBlacklistService, never()).blacklist(anyString());
        }

        /**
         * All null/blank variants must not throw, since they represent a normal
         * auto-logout scenario described in FR-UM-003.
         */
        @Test
        @DisplayName("[P0] Null or blank token → no exception is thrown")
        void noExceptionThrownForNullOrBlankToken() {
            assertThatCode(() -> authService.logout(null)).doesNotThrowAnyException();
            assertThatCode(() -> authService.logout("")).doesNotThrowAnyException();
            assertThatCode(() -> authService.logout("  ")).doesNotThrowAnyException();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Edge: JwtException during subject extraction
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("JwtException during subject extraction – resilience")
    class JwtExceptionDuringExtraction {

        /**
         * AC-003-01 (resilience): If the token's subject cannot be extracted
         * (e.g. token was tampered with after issuance), the blacklist call
         * must still proceed so the token is revoked. The exception must be
         * swallowed; only the email label in the log uses the fallback "unknown".
         */
        @Test
        @DisplayName("[Edge][P0] JwtException on extractSubject → blacklist() is still called")
        void blacklistCalledEvenWhenSubjectExtractionFails() {
            when(jwtService.extractSubject(VALID_TOKEN))
                    .thenThrow(new JwtException("signature mismatch"));

            authService.logout(VALID_TOKEN);

            verify(tokenBlacklistService).blacklist(VALID_TOKEN);
        }

        /**
         * Robustness: a JwtException during subject extraction must never surface
         * to the HTTP layer – the endpoint always returns 200 regardless.
         */
        @Test
        @DisplayName("[Edge][P0] JwtException on extractSubject → no exception propagated to caller")
        void noExceptionPropagatedWhenSubjectExtractionFails() {
            when(jwtService.extractSubject(VALID_TOKEN))
                    .thenThrow(new JwtException("invalid token"));

            assertThatCode(() -> authService.logout(VALID_TOKEN)).doesNotThrowAnyException();
        }
    }
}
