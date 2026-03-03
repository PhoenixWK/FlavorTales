package com.flavortales.auth.service;

import com.flavortales.auth.dto.RegisterResponse;
import com.flavortales.auth.dto.VendorRegisterRequest;
import com.flavortales.auth.entity.EmailVerification;
import com.flavortales.auth.repository.EmailVerificationRepository;
import com.flavortales.common.exception.DuplicateEmailException;
import com.flavortales.common.exception.DuplicateUsernameException;
import com.flavortales.notification.service.EmailService;
import com.flavortales.user.entity.Role;
import com.flavortales.user.entity.User;
import com.flavortales.user.entity.UserStatus;
import com.flavortales.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AuthService#registerVendor(VendorRegisterRequest)}.
 * Covers US-007 / AC-007: Vendor Account Registration.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService – registerVendor()")
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailVerificationRepository emailVerificationRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    /** Reusable valid request matching all constraint rules. */
    private VendorRegisterRequest validRequest;

    @BeforeEach
    void setUp() {
        // Inject @Value field bypassed by Mockito
        ReflectionTestUtils.setField(authService, "expirationMinutes", 15);

        validRequest = new VendorRegisterRequest();
        validRequest.setUsername("shopowner1");
        validRequest.setEmail("shopowner@example.com");
        validRequest.setPassword("Pass@1234");
        validRequest.setConfirmPassword("Pass@1234");
        validRequest.setPhone("0912345678");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper – builds a saved User returned by the mocked repository
    // ─────────────────────────────────────────────────────────────────────────
    private User mockSavedUser() {
        return User.builder()
                .userId(1)
                .email(validRequest.getEmail())
                .fullName(validRequest.getUsername())
                .phone(validRequest.getPhone())
                .role(Role.vendor)
                .status(UserStatus.inactive)
                .build();
    }

    private void stubHappyPath(User savedUser) {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByFullName(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(emailVerificationRepository.save(any(EmailVerification.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario 2 – Happy Path: valid registration
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Happy path – valid registration")
    class HappyPath {

        @Test
        @DisplayName("Returns a response with correct userId, username, email and status")
        void returnsCorrectResponse() {
            stubHappyPath(mockSavedUser());

            RegisterResponse response = authService.registerVendor(validRequest);

            assertThat(response.getUserId()).isEqualTo(1);
            assertThat(response.getUsername()).isEqualTo("shopowner1");
            assertThat(response.getEmail()).isEqualTo("shopowner@example.com");
            assertThat(response.getStatus()).isEqualTo("inactive");
            assertThat(response.getMessage()).contains("Registration successful");
        }

        @Test
        @DisplayName("Saves user with role=vendor and status=inactive (Pending Approval)")
        void savesUserWithVendorRoleAndInactiveStatus() {
            stubHappyPath(mockSavedUser());

            authService.registerVendor(validRequest);

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            User saved = captor.getValue();

            assertThat(saved.getRole()).isEqualTo(Role.vendor);
            assertThat(saved.getStatus()).isEqualTo(UserStatus.inactive);
        }

        @Test
        @DisplayName("Stores a BCrypt-hashed password, not the raw password")
        void storesHashedPassword() {
            stubHappyPath(mockSavedUser());

            authService.registerVendor(validRequest);

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            String storedHash = captor.getValue().getPasswordHash();

            assertThat(storedHash)
                    .isNotBlank()
                    .isNotEqualTo(validRequest.getPassword())
                    .startsWith("$2a$");   // BCrypt identifier
        }

        @Test
        @DisplayName("Saves an EmailVerification record with 6-digit code, isVerified=false, correct expiry")
        void savesEmailVerificationRecord() {
            User savedUser = mockSavedUser();
            stubHappyPath(savedUser);

            LocalDateTime before = LocalDateTime.now().plusMinutes(14);
            authService.registerVendor(validRequest);
            LocalDateTime after = LocalDateTime.now().plusMinutes(16);

            ArgumentCaptor<EmailVerification> captor = ArgumentCaptor.forClass(EmailVerification.class);
            verify(emailVerificationRepository).save(captor.capture());
            EmailVerification ev = captor.getValue();

            assertThat(ev.getVerificationCode())
                    .hasSize(6)
                    .containsOnlyDigits();
            assertThat(ev.isVerified()).isFalse();
            assertThat(ev.getExpiresAt()).isBetween(before, after);
            assertThat(ev.getUser()).isEqualTo(savedUser);
        }

        @Test
        @DisplayName("Sends a verification email to the registered email address")
        void sendsVerificationEmail() {
            stubHappyPath(mockSavedUser());

            authService.registerVendor(validRequest);

            verify(emailService).sendVendorVerificationEmail(
                    eq(validRequest.getEmail()), anyString());
        }

        @Test
        @DisplayName("Persists the user's email, fullName and phone exactly as provided")
        void persistsContactInformation() {
            stubHappyPath(mockSavedUser());

            authService.registerVendor(validRequest);

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            User saved = captor.getValue();

            assertThat(saved.getEmail()).isEqualTo(validRequest.getEmail());
            assertThat(saved.getFullName()).isEqualTo(validRequest.getUsername());
            assertThat(saved.getPhone()).isEqualTo(validRequest.getPhone());
        }

        @Test
        @DisplayName("Generated verification code is a 6-digit number (100000–999999)")
        void verificationCodeIsInValidRange() {
            stubHappyPath(mockSavedUser());

            authService.registerVendor(validRequest);

            ArgumentCaptor<EmailVerification> captor = ArgumentCaptor.forClass(EmailVerification.class);
            verify(emailVerificationRepository).save(captor.capture());
            int code = Integer.parseInt(captor.getValue().getVerificationCode());

            assertThat(code).isBetween(100_000, 999_999);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario 1 – Duplicate email (uniqueness check)
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Duplicate email")
    class DuplicateEmail {

        @Test
        @DisplayName("Throws DuplicateEmailException when email is already registered")
        void throwsDuplicateEmailException() {
            when(userRepository.existsByEmail(validRequest.getEmail())).thenReturn(true);

            assertThatThrownBy(() -> authService.registerVendor(validRequest))
                    .isInstanceOf(DuplicateEmailException.class);
        }

        @Test
        @DisplayName("Does not save a user or send an email when email is duplicate")
        void doesNotPersistOrSendEmail() {
            when(userRepository.existsByEmail(validRequest.getEmail())).thenReturn(true);

            assertThatThrownBy(() -> authService.registerVendor(validRequest))
                    .isInstanceOf(DuplicateEmailException.class);

            verify(userRepository, never()).save(any());
            verify(emailService, never()).sendVendorVerificationEmail(anyString(), anyString());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Scenario 1 – Duplicate username (uniqueness check)
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Duplicate username")
    class DuplicateUsername {

        @Test
        @DisplayName("Throws DuplicateUsernameException when username is already taken")
        void throwsDuplicateUsernameException() {
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(userRepository.existsByFullName(validRequest.getUsername())).thenReturn(true);

            assertThatThrownBy(() -> authService.registerVendor(validRequest))
                    .isInstanceOf(DuplicateUsernameException.class);
        }

        @Test
        @DisplayName("Does not save a user or send an email when username is duplicate")
        void doesNotPersistOrSendEmail() {
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(userRepository.existsByFullName(validRequest.getUsername())).thenReturn(true);

            assertThatThrownBy(() -> authService.registerVendor(validRequest))
                    .isInstanceOf(DuplicateUsernameException.class);

            verify(userRepository, never()).save(any());
            verify(emailService, never()).sendVendorVerificationEmail(anyString(), anyString());
        }
    }
}
