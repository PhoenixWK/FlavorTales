package com.flavortales.auth.controller;

import com.flavortales.auth.dto.RegisterResponse;
import com.flavortales.auth.dto.ResendCodeRequest;
import com.flavortales.auth.dto.VendorRegisterRequest;
import com.flavortales.auth.dto.VerifyEmailRequest;
import com.flavortales.auth.service.AuthService;
import com.flavortales.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

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
}
