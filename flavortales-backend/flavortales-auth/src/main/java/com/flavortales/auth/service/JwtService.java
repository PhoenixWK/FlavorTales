package com.flavortales.auth.service;

import com.flavortales.user.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;

/**
 * Issues and validates HMAC-SHA256–signed JWT tokens (JJWT 0.12.x API).
 *
 * <h3>Token types</h3>
 * <ul>
 *   <li><b>Access token</b> – short-lived (24 h by default, 7 days with
 *       rememberMe).  Carries {@code userId}, {@code email}, {@code role}.</li>
 *   <li><b>Refresh token</b> – long-lived (30 days).  Contains only the
 *       subject (email) and a {@code type=refresh} claim so it cannot be
 *       mistaken for an access token.</li>
 * </ul>
 *
 * <h3>Datasource routing</h3>
 * This service performs no database I/O, so no datasource routing annotation
 * is needed.
 */
@Service
@Slf4j
public class JwtService {

    /** Base64-encoded 256-bit secret shared for all HMAC-SHA-256 tokens. */
    @Value("${app.jwt.secret}")
    private String secret;

    /** Access-token lifetime in hours for a regular session (default: 24). */
    @Value("${app.jwt.expiration-hours:24}")
    private int expirationHours;

    /** Access-token lifetime when "Remember me" is checked (default: 168 = 7 days). */
    @Value("${app.jwt.remember-me-expiration-hours:168}")
    private int rememberMeExpirationHours;

    /** Refresh-token lifetime in days (default: 30). */
    @Value("${app.jwt.refresh-expiration-days:30}")
    private int refreshExpirationDays;

    // -------------------------------------------------------------------------
    // Token generation
    // -------------------------------------------------------------------------

    /**
     * Generates an access token carrying the user's identity and role.
     *
     * @param user       the authenticated user
     * @param rememberMe {@code true} → longer expiry (7 days)
     * @return compact, signed JWT string
     */
    public String generateAccessToken(User user, boolean rememberMe) {
        int hours = rememberMe ? rememberMeExpirationHours : expirationHours;
        long expiryMs = (long) hours * 3_600_000L;

        return Jwts.builder()
                .subject(user.getEmail())
                .claims(Map.of(
                        "userId", user.getUserId(),
                        "role",   user.getRole().name()
                ))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiryMs))
                .signWith(signingKey())
                .compact();
    }

    /**
     * Generates a refresh token for the given user.
     *
     * @param user the authenticated user
     * @return compact, signed JWT refresh token
     */
    public String generateRefreshToken(User user) {
        long expiryMs = (long) refreshExpirationDays * 86_400_000L;

        return Jwts.builder()
                .subject(user.getEmail())
                .claims(Map.of("type", "refresh"))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiryMs))
                .signWith(signingKey())
                .compact();
    }

    // -------------------------------------------------------------------------
    // Token validation / extraction
    // -------------------------------------------------------------------------

    /**
     * Parses and validates a JWT token, returning its claims payload.
     *
     * @param token the compact JWT string
     * @return parsed {@link Claims}
     * @throws io.jsonwebtoken.JwtException on any signature or expiry violation
     */
    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Extracts the subject (email) from a token without throwing on expiry –
     * useful for refresh-token flows where expiry is checked separately.
     */
    public String extractSubject(String token) {
        return extractAllClaims(token).getSubject();
    }

    /**
     * Returns {@code true} if the token has not yet expired.
     */
    public boolean isTokenValid(String token) {
        try {
            return !extractAllClaims(token).getExpiration().before(new Date());
        } catch (Exception e) {
            log.debug("[JWT] Token validation failed: {}", e.getMessage());
            return false;
        }
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private SecretKey signingKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
