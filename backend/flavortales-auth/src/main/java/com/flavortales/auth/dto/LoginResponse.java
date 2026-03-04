package com.flavortales.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

/**
 * Payload returned after a successful login.
 *
 * <p>The access and refresh tokens are also delivered via HTTP-only cookies by
 * the controller – the body copy is provided for API clients (e.g. mobile apps)
 * that cannot access cookie values.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LoginResponse {

    private Integer userId;
    private String email;
    private String username;
    private String role;

    /** Short-lived JWT access token (24 h, or 7 days when rememberMe = true). */
    private String accessToken;

    /** Long-lived refresh token (30 days); use POST /api/auth/refresh to renew. */
    private String refreshToken;

    /** Token type string, always "Bearer". */
    @Builder.Default
    private String tokenType = "Bearer";
}
