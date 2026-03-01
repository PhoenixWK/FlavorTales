package com.flavortales.auth.controller;

import com.flavortales.auth.dto.LoginRequest;
import com.flavortales.auth.dto.LoginResponse;
import com.flavortales.auth.dto.RegisterResponse;
import com.flavortales.auth.dto.ResendCodeRequest;
import com.flavortales.auth.dto.VendorRegisterRequest;
import com.flavortales.auth.dto.VerifyEmailRequest;
import com.flavortales.auth.service.AuthService;
import com.flavortales.auth.service.LoginAttemptService;
import com.flavortales.common.dto.ApiResponse;
import com.flavortales.common.exception.InvalidCredentialsException;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final LoginAttemptService loginAttemptService;

    /** Whether to mark cookies as Secure (set to {@code true} in production over HTTPS). */
    @Value("${app.security.cookie-secure:false}")
    private boolean cookieSecure;

    /**
     * FR-UM-001: Vendor Account Registration
     * POST /api/auth/vendor/register
     */
    @PostMapping("/vendor/register")
    public ResponseEntity<ApiResponse<RegisterResponse>> registerVendor(
            @Valid @RequestBody VendorRegisterRequest request) {

        RegisterResponse response = authService.registerVendor(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Registration successful", response));
    }

    /**
     * FR-UM-002: Vendor Email Verification
     * POST /api/auth/vendor/verify
     */
    @PostMapping("/vendor/verify")
    public ResponseEntity<ApiResponse<Void>> verifyVendorEmail(
            @Valid @RequestBody VerifyEmailRequest request) {

        authService.verifyEmail(request.getEmail(), request.getCode());
        return ResponseEntity.ok(ApiResponse.success("Email verified successfully. You can now log in.", null));
    }

    /**
     * FR-UM-003: Resend Verification Code (max 3 times)
     * POST /api/auth/vendor/resend-code
     */
    @PostMapping("/vendor/resend-code")
    public ResponseEntity<ApiResponse<Void>> resendVerificationCode(
            @Valid @RequestBody ResendCodeRequest request) {

        authService.resendVerificationCode(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("A new verification code has been sent to your email.", null));
    }

    /**
     * FR-UM-004: Vendor / Admin Login
     * POST /api/auth/vendor/login
     *
     * <h3>Security flow</h3>
     * <ol>
     *   <li>Rate-limit and lockout check against the SLAVE DB
     *       ({@link LoginAttemptService#checkRateLimitAndLockout}).</li>
     *   <li>Credential validation, status check, and JWT issuance against the
     *       SLAVE DB ({@link AuthService#login}).</li>
     *   <li>On success – clear attempt history and record success on MASTER.</li>
     *   <li>On credential failure – record failed attempt on MASTER (may
     *       trigger lockout) then re-throw so the global handler returns 401.</li>
     *   <li>Access and refresh tokens are delivered both in HTTP-only cookies
     *       (for browser clients) and in the JSON response body (for API / mobile
     *       clients).</li>
     * </ol>
     */
    @PostMapping("/vendor/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response) {

        String email = request.getEmail();

        // 1. Pre-flight: rate-limit + lockout (reads SLAVE)
        loginAttemptService.checkRateLimitAndLockout(email);

        // 2. Authenticate (reads SLAVE)
        LoginResponse loginResponse;
        try {
            loginResponse = authService.login(request);
        } catch (InvalidCredentialsException ex) {
            // 3a. On bad credentials – record failure (writes MASTER, may lock)
            loginAttemptService.recordFailedAttempt(email);
            throw ex;
        }

        // 3b. On success – reset attempt history (writes MASTER)
        loginAttemptService.recordSuccessAndClear(email);

        // 4. Set HTTP-only cookies
        int regularMaxAge     = 24 * 3600;           // 1 day
        int rememberMeMaxAge  = 7 * 24 * 3600;       // 7 days
        int refreshMaxAge     = 30 * 24 * 3600;      // 30 days

        int accessMaxAge = request.isRememberMe() ? rememberMeMaxAge : regularMaxAge;

        ResponseCookie accessCookie = ResponseCookie.from("access_token", loginResponse.getAccessToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(accessMaxAge)
                .sameSite("Strict")
                .build();

        ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", loginResponse.getRefreshToken())
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/api/auth/refresh")
                .maxAge(refreshMaxAge)
                .sameSite("Strict")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

        return ResponseEntity.ok(ApiResponse.success("Login successful", loginResponse));
    }
}
