package com.flavortales.auth.security;

import com.flavortales.auth.service.JwtService;
import com.flavortales.auth.service.TokenBlacklistService;
import com.flavortales.user.entity.User;
import com.flavortales.user.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;
import java.util.Optional;

/**
 * FR-UM-003: Logout – Session Token Validation
 *
 * <p>Intercepts every request and validates the JWT access token.  Token
 * resolution order:
 * <ol>
 *   <li>HTTP-only {@code access_token} cookie (preferred for browser clients).</li>
 *   <li>{@code Authorization: Bearer <token>} header (for API / mobile clients).</li>
 * </ol>
 *
 * <p>A token is accepted only when it is:
 * <ul>
 *   <li>Cryptographically valid (correct signature).</li>
 *   <li>Not yet expired.</li>
 *   <li>Not present in the {@link TokenBlacklistService} (i.e. not revoked
 *       by a prior logout call).</li>
 * </ul>
 *
 * <p>When the token is expired or blacklisted the filter simply does not set
 * the {@link SecurityContextHolder} and lets Spring Security's
 * {@code authenticationEntryPoint} return {@code 401 Unauthorized} with the
 * message {@code "Session expired"}.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final TokenBlacklistService tokenBlacklistService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String token = resolveToken(request);

        if (token != null) {
            try {
                if (tokenBlacklistService.isBlacklisted(token)) {
                    // Token was explicitly revoked via logout
                    log.debug("[JWT] Rejected blacklisted token for {}", request.getRequestURI());

                } else if (jwtService.isTokenValid(token)) {
                    Claims claims = jwtService.extractAllClaims(token);
                    String email = claims.getSubject();
                    String role  = claims.get("role", String.class);

                    // FR-UM-004: Reject tokens issued before a password reset
                    if (isIssuedBeforePasswordChange(email, claims.getIssuedAt())) {
                        log.debug("[JWT] Token predates password change – rejected for {}", email);
                    } else {
                        UsernamePasswordAuthenticationToken auth =
                                new UsernamePasswordAuthenticationToken(
                                        email,
                                        null,
                                        List.of(new SimpleGrantedAuthority("ROLE_" + role))
                                );
                        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    }

                } else {
                    log.debug("[JWT] Token expired for {}", request.getRequestURI());
                }

            } catch (JwtException e) {
                log.debug("[JWT] Invalid token on {}: {}", request.getRequestURI(), e.getMessage());
            }
        }

        chain.doFilter(request, response);
    }

    // -------------------------------------------------------------------------
    // Token resolution helpers
    // -------------------------------------------------------------------------

    /**
     * Resolves the raw JWT string from the request.
     * Cookie is preferred; the Authorization header is used as a fallback.
     */
    private String resolveToken(HttpServletRequest request) {
        // 1. HTTP-only cookie
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("access_token".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }

        // 2. Authorization: Bearer <token>
        String bearer = request.getHeader("Authorization");
        if (bearer != null && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }

        return null;
    }

    /**
     * Returns {@code true} when the user has changed their password after the
     * token was issued, meaning the token should no longer be trusted.
     *
     * <p>Only performs a DB lookup when the user record actually has a
     * {@code passwordChangedAt} timestamp – new accounts or accounts that
     * have never used password recovery will skip this check entirely.
     */
    private boolean isIssuedBeforePasswordChange(String email, Date issuedAt) {
        if (issuedAt == null) {
            return false;
        }
        Optional<User> opt = userRepository.findByEmail(email);
        if (opt.isEmpty()) {
            return false;
        }
        LocalDateTime passwordChangedAt = opt.get().getPasswordChangedAt();
        if (passwordChangedAt == null) {
            return false;
        }
        LocalDateTime tokenIssuedAt = issuedAt.toInstant()
                .atZone(ZoneId.systemDefault())
                .toLocalDateTime();
        return tokenIssuedAt.isBefore(passwordChangedAt);
    }
}
