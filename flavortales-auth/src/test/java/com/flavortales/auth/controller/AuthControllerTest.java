package com.flavortales.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flavortales.auth.dto.RegisterResponse;
import com.flavortales.auth.dto.VendorRegisterRequest;
import com.flavortales.auth.service.AuthService;
import com.flavortales.auth.service.JwtService;
import com.flavortales.auth.service.LoginAttemptService;
import com.flavortales.auth.service.TokenBlacklistService;
import com.flavortales.common.exception.DuplicateEmailException;
import com.flavortales.common.exception.DuplicateUsernameException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for {@link AuthController} (web layer only).
 * Covers US-007 / AC-007: Vendor Account Registration.
 *
 * Spring Security filters are disabled so that only Bean Validation,
 * controller mapping, and exception-handler wiring are tested.
 */
@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("POST /api/auth/vendor/register")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean  private AuthService          authService;
    @MockBean  private LoginAttemptService  loginAttemptService;
    // Required so JwtAuthenticationFilter @Component can be instantiated in the slice context
    @MockBean  private JwtService           jwtService;
    @MockBean  private TokenBlacklistService tokenBlacklistService;

    private static final String URL = "/api/auth/vendor/register";

    /** Fully valid request body – adjust individual fields per test. */
    private VendorRegisterRequest validRequest;

    @BeforeEach
    void setUp() {
        validRequest = new VendorRegisterRequest();
        validRequest.setUsername("shopowner1");
        validRequest.setEmail("shopowner@example.com");
        validRequest.setPassword("Pass@1234");
        validRequest.setConfirmPassword("Pass@1234");
        validRequest.setPhone("0912345678");
    }

    /** Stub a successful service call with the given email/username. */
    private void stubSuccess() {
        RegisterResponse resp = RegisterResponse.builder()
                .userId(1)
                .username(validRequest.getUsername())
                .email(validRequest.getEmail())
                .status("inactive")
                .message("Registration successful. Please check your email to verify your account.")
                .build();
        when(authService.registerVendor(any())).thenReturn(resp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario 2 – Happy Path
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Happy path – valid registration")
    class HappyPath {

        @Test
        @DisplayName("Returns 201 Created with success=true and registration data")
        void returns201WithSuccessBody() throws Exception {
            stubSuccess();

            mockMvc.perform(post(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Registration successful"))
                    .andExpect(jsonPath("$.data.userId").value(1))
                    .andExpect(jsonPath("$.data.username").value("shopowner1"))
                    .andExpect(jsonPath("$.data.email").value("shopowner@example.com"))
                    .andExpect(jsonPath("$.data.status").value("inactive"));
        }

        @Test
        @DisplayName("Accepts username with numeric characters (edge: all-digits within length)")
        void acceptsNumericUsername() throws Exception {
            stubSuccess();
            validRequest.setUsername("1234");   // 4 chars, digits only — valid

            mockMvc.perform(post(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("Accepts password that meets all security requirements")
        void acceptsComplexPassword() throws Exception {
            stubSuccess();
            validRequest.setPassword("C0mplex!Pass");
            validRequest.setConfirmPassword("C0mplex!Pass");

            mockMvc.perform(post(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isCreated());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario 1 – Field Validation (required fields & format rules)
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Field validation – username")
    class UsernameValidation {

        @Test
        @DisplayName("Returns 400 when username is blank")
        void blankUsernameFails() throws Exception {
            validRequest.setUsername("");
            performExpect400("username");
        }

        @Test
        @DisplayName("Returns 400 when username is shorter than 4 characters")
        void usernameTooShortFails() throws Exception {
            validRequest.setUsername("ab");
            performExpect400("username");
        }

        @Test
        @DisplayName("Returns 400 when username is longer than 32 characters")
        void usernameTooLongFails() throws Exception {
            validRequest.setUsername("a".repeat(33));
            performExpect400("username");
        }

        @Test
        @DisplayName("Returns 400 when username contains special characters")
        void usernameWithSpecialCharsFails() throws Exception {
            validRequest.setUsername("shop@owner");
            performExpect400("username");
        }

        @Test
        @DisplayName("Returns 400 when username contains spaces")
        void usernameWithSpaceFails() throws Exception {
            validRequest.setUsername("shop owner");
            performExpect400("username");
        }
    }

    @Nested
    @DisplayName("Field validation – email")
    class EmailValidation {

        @Test
        @DisplayName("Returns 400 when email is blank")
        void blankEmailFails() throws Exception {
            validRequest.setEmail("");
            performExpect400("email");
        }

        @Test
        @DisplayName("Returns 400 when email has no @ symbol")
        void emailMissingAtSymbolFails() throws Exception {
            validRequest.setEmail("notanemail.com");
            performExpect400("email");
        }

        @Test
        @DisplayName("Returns 400 when email has no domain extension")
        void emailNoDomainExtensionFails() throws Exception {
            validRequest.setEmail("user@domain");
            performExpect400("email");
        }

        @Test
        @DisplayName("Returns 400 when email has consecutive dots in domain")
        void emailConsecutiveDotsFails() throws Exception {
            validRequest.setEmail("user@do..main.com");
            performExpect400("email");
        }
    }

    @Nested
    @DisplayName("Field validation – password security requirements")
    class PasswordValidation {

        @Test
        @DisplayName("Returns 400 when password is blank")
        void blankPasswordFails() throws Exception {
            validRequest.setPassword("");
            validRequest.setConfirmPassword("");
            performExpect400("password");
        }

        @Test
        @DisplayName("Returns 400 when password is shorter than 8 characters")
        void passwordTooShortFails() throws Exception {
            validRequest.setPassword("Pa@1");
            validRequest.setConfirmPassword("Pa@1");
            performExpect400("password");
        }

        @Test
        @DisplayName("Returns 400 when password has no uppercase letter")
        void passwordNoUpperCaseFails() throws Exception {
            validRequest.setPassword("pass@1234");
            validRequest.setConfirmPassword("pass@1234");
            performExpect400("password");
        }

        @Test
        @DisplayName("Returns 400 when password has no lowercase letter")
        void passwordNoLowerCaseFails() throws Exception {
            validRequest.setPassword("PASS@1234");
            validRequest.setConfirmPassword("PASS@1234");
            performExpect400("password");
        }

        @Test
        @DisplayName("Returns 400 when password has no digit")
        void passwordNoDigitFails() throws Exception {
            validRequest.setPassword("Pass@word");
            validRequest.setConfirmPassword("Pass@word");
            performExpect400("password");
        }

        @Test
        @DisplayName("Returns 400 when password has no special character")
        void passwordNoSpecialCharFails() throws Exception {
            validRequest.setPassword("Password1");
            validRequest.setConfirmPassword("Password1");
            performExpect400("password");
        }
    }

    @Nested
    @DisplayName("Field validation – password confirmation")
    class PasswordConfirmation {

        @Test
        @DisplayName("Returns 400 when confirmPassword is blank")
        void blankConfirmPasswordFails() throws Exception {
            validRequest.setConfirmPassword("");
            performExpect400("confirmPassword");
        }

        @Test
        @DisplayName("Returns 400 when password and confirmPassword do not match")
        void passwordMismatchFails() throws Exception {
            validRequest.setConfirmPassword("Different@9");
            performExpect400("confirmPassword");
        }
    }

    @Nested
    @DisplayName("Field validation – contact phone")
    class PhoneValidation {

        @Test
        @DisplayName("Returns 400 when phone is blank")
        void blankPhoneFails() throws Exception {
            validRequest.setPhone("");
            performExpect400("phone");
        }

        @Test
        @DisplayName("Returns 400 when phone does not start with 0")
        void phoneNotStartingWith0Fails() throws Exception {
            validRequest.setPhone("1912345678");
            performExpect400("phone");
        }

        @Test
        @DisplayName("Returns 400 when phone has fewer than 10 digits")
        void phoneTooShortFails() throws Exception {
            validRequest.setPhone("091234");
            performExpect400("phone");
        }

        @Test
        @DisplayName("Returns 400 when phone has more than 11 digits")
        void phoneTooLongFails() throws Exception {
            validRequest.setPhone("099123456789");
            performExpect400("phone");
        }

        @Test
        @DisplayName("Returns 400 when phone contains non-digit characters")
        void phoneNonDigitFails() throws Exception {
            validRequest.setPhone("091234567a");
            performExpect400("phone");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario 1 – Uniqueness check (conflict responses)
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Uniqueness – duplicate email / username")
    class UniquenessCheck {

        @Test
        @DisplayName("Returns 409 Conflict when email is already registered")
        void duplicateEmailReturns409() throws Exception {
            when(authService.registerVendor(any())).thenThrow(new DuplicateEmailException());

            mockMvc.perform(post(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Email is already in use"));
        }

        @Test
        @DisplayName("Returns 409 Conflict when username is already taken")
        void duplicateUsernameReturns409() throws Exception {
            when(authService.registerVendor(any())).thenThrow(new DuplicateUsernameException());

            mockMvc.perform(post(URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Username is already taken"));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Posts {@code validRequest} (as mutated by the test) and asserts HTTP 400
     * with the validation failure structure returned by GlobalExceptionHandler.
     */
    private void performExpect400(String expectedField) throws Exception {
        mockMvc.perform(post(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.data." + expectedField).exists());
    }
}
