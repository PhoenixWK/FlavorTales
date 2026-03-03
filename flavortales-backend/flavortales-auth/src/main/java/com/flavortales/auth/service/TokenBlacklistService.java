package com.flavortales.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * FR-UM-003: Logout – Token Invalidation
 *
 * <p>Maintains an in-memory blacklist of revoked JWT access tokens keyed by the
 * compact token string.  Each entry stores the token's natural expiry so that
 * the background cleanup task can prune stale entries and keep memory bounded.
 *
 * <h3>Lifecycle</h3>
 * <ol>
 *   <li>On logout, {@link #blacklist(String)} is called with the raw token.</li>
 *   <li>All subsequent requests carrying the same token are rejected by
 *       {@link com.flavortales.auth.security.JwtAuthenticationFilter}.</li>
 *   <li>Every hour, expired entries are pruned via
 *       {@link #purgeExpiredTokens()}.</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TokenBlacklistService {

    /** token → expiry instant */
    private final ConcurrentHashMap<String, Instant> blacklist = new ConcurrentHashMap<>();

    private final JwtService jwtService;

    /**
     * Adds the given access token to the blacklist until it naturally expires.
     * If the token cannot be parsed (e.g. already malformed), a 24-hour fallback
     * TTL is applied so the entry is still cleaned up eventually.
     *
     * @param token raw compact JWT string
     */
    public void blacklist(String token) {
        Instant expiry;
        try {
            Claims claims = jwtService.extractAllClaims(token);
            expiry = claims.getExpiration().toInstant();
        } catch (JwtException | IllegalArgumentException e) {
            // Malformed or already-expired token – use a safe 24 h fallback TTL
            log.warn("[Blacklist] Could not parse token expiry; using 24 h fallback TTL");
            expiry = Instant.now().plusSeconds(86_400);
        }

        blacklist.put(token, expiry);
        log.debug("[Blacklist] Token blacklisted, effective until {}", expiry);
    }

    /**
     * Returns {@code true} if the given token has been explicitly revoked.
     *
     * @param token raw compact JWT string
     */
    public boolean isBlacklisted(String token) {
        return blacklist.containsKey(token);
    }

    /**
     * Scheduled housekeeping task – removes entries whose natural expiry has
     * already passed.  Runs every hour (fixed delay).
     */
    @Scheduled(fixedDelay = 3_600_000)
    public void purgeExpiredTokens() {
        Instant now = Instant.now();
        int before = blacklist.size();
        blacklist.entrySet().removeIf(entry -> entry.getValue().isBefore(now));
        int removed = before - blacklist.size();
        if (removed > 0) {
            log.debug("[Blacklist] Purged {} expired token(s)", removed);
        }
    }
}
