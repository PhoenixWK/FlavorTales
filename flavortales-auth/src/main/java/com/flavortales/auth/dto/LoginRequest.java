package com.flavortales.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * FR-UM-004: Vendor / Admin Login Request
 */
@Data
public class LoginRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    /**
     * When {@code true} the access-token cookie lifetime is extended to 7 days.
     * Defaults to {@code false} (24-hour session).
     */
    private boolean rememberMe = false;
}
