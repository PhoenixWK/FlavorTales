package com.flavortales.auth.service;

import io.jsonwebtoken.Claims;
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

import java.time.Instant;
import java.util.Date;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link TokenBlacklistService}.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>Requirement : FR-UM-003 – Logout (Invalidate session token)</li>
 *   <li>Use Case    : UC-Logout-Vendor</li>
 *   <li>User Story  : US-004 – Vendor/Admin Logout</li>
 *   <li>Acceptance  : AC-003-01 Session token is invalidated on logout</li>
 * </ul>
 *
 * <p><b>Coverage matrix</b>
 * <pre>
 *  Scenario                                           Priority  Type
 *  ──────────────────────────────────────────────────────────────────
 *  Blacklist a valid token → isBlacklisted = true      P0       Positive
 *  Non-blacklisted token  → isBlacklisted = false      P0       Positive
 *  Multiple distinct tokens are blacklisted correctly  P1       Positive
 *  Malformed/unparseable token → fallback TTL applied  P0       Edge
 *  purgeExpiredTokens removes long-past entries        P0       Positive
 *  purgeExpiredTokens retains not-yet-expired entries  P0       Positive
 *  purgeExpiredTokens on empty blacklist → no error    P1       Edge
 *  Re-blacklisting same token    → idempotent          P1       Edge
 * </pre>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("TokenBlacklistService | FR-UM-003 / US-004")
class TokenBlacklistServiceTest {

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private TokenBlacklistService tokenBlacklistService;

    private static final String VALID_TOKEN   = "header.payload.signature";
    private static final String ANOTHER_TOKEN = "header2.payload2.signature2";

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Stubs {@link JwtService#extractAllClaims(String)} so the token appears
     * to expire {@code secondsFromNow} seconds in the future (positive) or in
     * the past (negative).
     */
    private void stubExpiry(String token, long secondsFromNow) {
        Claims claims = mock(Claims.class);
        Date expiry = Date.from(Instant.now().plusSeconds(secondsFromNow));
        when(claims.getExpiration()).thenReturn(expiry);
        when(jwtService.extractAllClaims(token)).thenReturn(claims);
    }

    /** Returns the live blacklist map via reflection for inspection. */
    @SuppressWarnings("unchecked")
    private ConcurrentHashMap<String, Instant> blacklistMap() {
        return (ConcurrentHashMap<String, Instant>)
                ReflectionTestUtils.getField(tokenBlacklistService, "blacklist");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AC-003-01: blacklist() / isBlacklisted()
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("blacklist() and isBlacklisted() – AC-003-01")
    class BlacklistAndCheck {

        /**
         * AC-003-01 – Core contract: after blacklisting a token it must be
         * recognised as revoked on all subsequent requests.
         */
        @Test
        @DisplayName("[AC-003-01][P0] Blacklisted token → isBlacklisted returns true")
        void blacklistedTokenIsDetected() {
            stubExpiry(VALID_TOKEN, 3600);    // expires in 1 hour

            tokenBlacklistService.blacklist(VALID_TOKEN);

            assertThat(tokenBlacklistService.isBlacklisted(VALID_TOKEN)).isTrue();
        }

        /**
         * AC-003-01 – Token that was never revoked must not be treated as
         * blacklisted (prevents false denials).
         */
        @Test
        @DisplayName("[AC-003-01][P0] Non-revoked token → isBlacklisted returns false")
        void nonBlacklistedTokenIsAccepted() {
            assertThat(tokenBlacklistService.isBlacklisted(VALID_TOKEN)).isFalse();
        }

        /**
         * AC-003-01 – Each user's token must be tracked independently; blacklisting
         * one must not affect another.
         */
        @Test
        @DisplayName("[P1] Multiple distinct tokens are blacklisted independently")
        void multipleTokensAreTrackedSeparately() {
            stubExpiry(VALID_TOKEN,   3600);
            stubExpiry(ANOTHER_TOKEN, 7200);

            tokenBlacklistService.blacklist(VALID_TOKEN);
            tokenBlacklistService.blacklist(ANOTHER_TOKEN);

            assertThat(tokenBlacklistService.isBlacklisted(VALID_TOKEN)).isTrue();
            assertThat(tokenBlacklistService.isBlacklisted(ANOTHER_TOKEN)).isTrue();
        }

        /**
         * AC-003-01 – Only the blacklisted token must be flagged; a third token
         * that was never revoked must remain clean.
         */
        @Test
        @DisplayName("[P1] Blacklisting one token does not affect a different token")
        void blacklistingOneDoesNotAffectOther() {
            stubExpiry(VALID_TOKEN, 3600);

            tokenBlacklistService.blacklist(VALID_TOKEN);

            assertThat(tokenBlacklistService.isBlacklisted(ANOTHER_TOKEN)).isFalse();
        }

        /**
         * Idempotency: re-blacklisting the same token must not throw or create
         * duplicate state; subsequent checks still return true.
         */
        @Test
        @DisplayName("[Edge][P1] Re-blacklisting the same token is idempotent")
        void reBlacklistingSameTokenIsIdempotent() {
            stubExpiry(VALID_TOKEN, 3600);

            tokenBlacklistService.blacklist(VALID_TOKEN);
            tokenBlacklistService.blacklist(VALID_TOKEN);

            assertThat(tokenBlacklistService.isBlacklisted(VALID_TOKEN)).isTrue();
            assertThat(blacklistMap()).hasSize(1);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Edge: unparseable / malformed token
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Malformed token – fallback TTL")
    class MalformedToken {

        /**
         * When the JWT cannot be parsed (e.g. already expired, tampered), the
         * service must still add the token to the blacklist using a 24 h fallback
         * TTL so the entry is cleaned up eventually.
         */
        @Test
        @DisplayName("[Edge][P0] JwtException during parsing → token still blacklisted with fallback TTL")
        void malformedTokenIsBlacklistedWithFallbackTtl() {
            when(jwtService.extractAllClaims(VALID_TOKEN))
                    .thenThrow(new JwtException("bad signature"));

            tokenBlacklistService.blacklist(VALID_TOKEN);

            // The token must be in the map despite the parse failure
            assertThat(tokenBlacklistService.isBlacklisted(VALID_TOKEN)).isTrue();

            // Fallback TTL should be approximately 24 h from now (within a 5 s tolerance)
            Instant stored = blacklistMap().get(VALID_TOKEN);
            Instant lowerBound = Instant.now().plusSeconds(86_395);
            Instant upperBound = Instant.now().plusSeconds(86_405);
            assertThat(stored).isBetween(lowerBound, upperBound);
        }

        /**
         * Edge: an already-expired token (JwtException thrown by parser for
         * expiry) is passed at logout.  The blacklist must accept it so that
         * the cleared cookie state is consistent with the server side.
         */
        @Test
        @DisplayName("[Edge][P0] Already-expired token passed at logout → accepted with fallback TTL")
        void expiredTokenAtLogoutIsBlacklisted() {
            when(jwtService.extractAllClaims(VALID_TOKEN))
                    .thenThrow(new io.jsonwebtoken.ExpiredJwtException(null, null, "expired"));

            tokenBlacklistService.blacklist(VALID_TOKEN);

            assertThat(tokenBlacklistService.isBlacklisted(VALID_TOKEN)).isTrue();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Housekeeping: purgeExpiredTokens()
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("purgeExpiredTokens() – housekeeping")
    class PurgeExpiredTokens {

        /**
         * AC-003-01: Tokens whose natural expiry has passed must be removed from
         * the blacklist by the scheduled cleanup task so memory is bounded.
         */
        @Test
        @DisplayName("[P0] Tokens with elapsed expiry are removed from the blacklist")
        void removesLongExpiredEntry() {
            // Inject a past instant directly – simulates a token that expired long ago
            blacklistMap().put(VALID_TOKEN, Instant.now().minusSeconds(3600));

            tokenBlacklistService.purgeExpiredTokens();

            assertThat(blacklistMap()).doesNotContainKey(VALID_TOKEN);
            assertThat(tokenBlacklistService.isBlacklisted(VALID_TOKEN)).isFalse();
        }

        /**
         * Tokens whose expiry is still in the future must NOT be purged; they are
         * still actively blocking revoked tokens.
         */
        @Test
        @DisplayName("[P0] Token with future expiry is retained after purge")
        void retainsFutureExpiryEntry() {
            blacklistMap().put(VALID_TOKEN, Instant.now().plusSeconds(3600));

            tokenBlacklistService.purgeExpiredTokens();

            assertThat(tokenBlacklistService.isBlacklisted(VALID_TOKEN)).isTrue();
        }

        /**
         * Mixed case: one expired, one still valid → only the expired one is removed.
         */
        @Test
        @DisplayName("[P1] Only expired entries are purged; live entries are retained")
        void onlyExpiredEntriesPurged() {
            blacklistMap().put(VALID_TOKEN,   Instant.now().minusSeconds(1));   // expired
            blacklistMap().put(ANOTHER_TOKEN, Instant.now().plusSeconds(3600)); // live

            tokenBlacklistService.purgeExpiredTokens();

            assertThat(tokenBlacklistService.isBlacklisted(VALID_TOKEN)).isFalse();
            assertThat(tokenBlacklistService.isBlacklisted(ANOTHER_TOKEN)).isTrue();
        }

        /**
         * Edge: calling purge on an empty blacklist must not throw any exception.
         */
        @Test
        @DisplayName("[Edge][P1] Purge on empty blacklist completes without error")
        void purgeOnEmptyBlacklistIsaSafe() {
            assertThat(blacklistMap()).isEmpty();
            // Must not throw
            tokenBlacklistService.purgeExpiredTokens();
            assertThat(blacklistMap()).isEmpty();
        }
    }
}
