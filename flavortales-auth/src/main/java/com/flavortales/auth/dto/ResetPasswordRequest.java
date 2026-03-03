package com.flavortales.auth.dto;

import com.flavortales.common.validation.PasswordMatch;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * FR-UM-004: Password Recovery – Step 2 request body.
 *
 * <p>Carries the one-time reset token (from the email link) plus the new
 * password pair.  The {@code @PasswordMatch} class-level constraint verifies
 * that {@code newPassword} and {@code confirmPassword} are identical.
 */
@Data
@PasswordMatch(passwordField = "newPassword", confirmPasswordField = "confirmPassword",
               message = "Passwords do not match")
public class ResetPasswordRequest {

    @NotBlank(message = "Reset code is required")
    @Pattern(regexp = "\\d{6}", message = "Reset code must be exactly 6 digits")
    private String token;

    @NotBlank(message = "New password is required")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&_\\-#])[A-Za-z\\d@$!%*?&_\\-#]{8,}$",
        message = "Password must be at least 8 characters and include uppercase, lowercase, number and special character"
    )
    private String newPassword;

    @NotBlank(message = "Confirm password is required")
    private String confirmPassword;
}
