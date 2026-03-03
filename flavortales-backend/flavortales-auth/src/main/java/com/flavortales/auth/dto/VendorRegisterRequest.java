package com.flavortales.auth.dto;

import com.flavortales.common.validation.PasswordMatch;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
@PasswordMatch
public class VendorRegisterRequest {

    @NotBlank(message = "Username is required")
    @Pattern(
        regexp = "^[a-zA-Z0-9]{4,32}$",
        message = "Username must be 4-32 characters and contain only letters and numbers"
    )
    private String username;

    @NotBlank(message = "Email is required")
    @Email(
        regexp = "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$",
        message = "Invalid email format"
    )
    private String email;

    @NotBlank(message = "Password is required")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&_\\-#])[A-Za-z\\d@$!%*?&_\\-#]{8,}$",
        message = "Password must be at least 8 characters and include uppercase, lowercase, number and special character"
    )
    private String password;

    @NotBlank(message = "Confirm password is required")
    private String confirmPassword;

    @NotBlank(message = "Phone number is required")
    @Pattern(
        regexp = "^0\\d{9,10}$",
        message = "Phone number must be in Vietnamese format (10-11 digits starting with 0)"
    )
    private String phone;
}
