package com.flavortales.auth.service;

import com.flavortales.auth.entity.PasswordResetToken;
import com.flavortales.auth.repository.PasswordResetTokenRepository;
import com.flavortales.common.exception.InvalidResetTokenException;
import com.flavortales.common.exception.PasswordResetRateLimitException;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link PasswordResetService}.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>Use Case   : UC-PasswordRecovery (Steps 2–9)</li>
 *   <li>User Story : US-PasswordRecovery – FR-UM-004</li>
 *   <li>Requirement: FR-UM-004 – Password Recovery</li>
 *   <li>Acceptance : AC-PR-001 … AC-PR-011</li>
 * </ul>
 *
 * <p><b>Coverage matrix</b>
 * <pre>
 *  ID          Scenario                                          Priority  Type
 *  ─────────────────────────────────────────────────────────────────────────────
 *  AC-PR-001   Request reset – registered email token persisted   P0       Positive
 *  AC-PR-002   Request reset – reset email is dispatched          P0       Positive
 *  AC-PR-003   Request reset – unregistered email silent OK        P0       Security
 *  AC-PR-004   Request reset – no email sent for unknown address   P0       Security
 *  AC-PR-005   Request reset – 4th request from same IP →  429    P0       Negative
 *  AC-PR-006   Request reset – exactly 3 requests succeed          P1       Edge
 *  AC-PR-007   Reset password – happy path updates password hash   P0       Positive
 *  AC-PR-008   Reset password – passwordChangedAt stamped          P0       Positive
 *  AC-PR-009   Reset password – all tokens invalidated             P0       Positive
 *  AC-PR-010   Reset password – token not found → 400              P0       Negative
 *  AC-PR-011   Reset password – already-used token → 400           P0       Negative
 *  AC-PR-012   Reset password – expired token → 400                P0       Negative
 * </pre>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PasswordResetService | FR-UM-004 / US-PasswordRecovery")
class PasswordResetServiceTest {

    // ── Mocks ────────────────────────────────────────────────────────────────
    @Mock private UserRepository               userRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private EmailService                 emailService;

    @InjectMocks
    private PasswordResetService passwordResetService;

    // ── Test constants ────────────────────────────────────────────────────────
    private static final String VALID_EMAIL  = "vendor@example.com";
    private static final String UNKNOWN_EMAIL = "ghost@nowhere.com";
    private static final String VALID_IP     = "192.168.1.10";
    private static final String RAW_TOKEN    = "847291";
    private static final String NEW_PASSWORD = "NewPass@2025";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(passwordResetService, "expirationMinutes", 30);
        ReflectionTestUtils.setField(passwordResetService, "rateLimitMax", 3);
        // Clear the internal IP rate-limit map between tests
        ReflectionTestUtils.setField(passwordResetService, "ipRequestLog",
                new java.util.concurrent.ConcurrentHashMap<>());
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User activeVendor() {
        return User.builder()
                .userId(1)
                .email(VALID_EMAIL)
                .fullName("Shop Owner")
                .passwordHash("$2a$12$hashed")
                .role(Role.vendor)
                .status(UserStatus.active)
                .build();
    }

    /** Builds a valid, unused, non-expired reset token linked to {@code user}. */
    private PasswordResetToken validToken(User user) {
        return PasswordResetToken.builder()
                .id(1L)
                .user(user)
                .token(RAW_TOKEN)
                .expiresAt(LocalDateTime.now().plusMinutes(25))
                .used(false)
                .build();
    }

    /** Stubs userRepository to return {@code user} for its email. */
    private void stubUserFound(User user) {
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
    }

    /** Stubs emailService to accept any reset-email call (void, async). */
    private void stubEmailSent() {
        // sendPasswordResetEmail is @Async void; Mockito does nothing by default, which is correct.
    }

    // =========================================================================
    // Step 1 – requestReset
    // =========================================================================

    @Nested
    @DisplayName("requestReset() – Step 1: generate and email token")
    class RequestReset {

        /**
         * AC-PR-001: A reset token row is persisted for a registered email.
         * UC-PasswordRecovery step 3 – "Create a password reset token with a time limit".
         */
        @Test
        @DisplayName("[AC-PR-001][P0] Persists a reset token when the email is registered")
        void persistsResetTokenForRegisteredEmail() {
            User user = activeVendor();
            stubUserFound(user);
            when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            passwordResetService.requestReset(VALID_EMAIL, VALID_IP);

            ArgumentCaptor<PasswordResetToken> captor =
                    ArgumentCaptor.forClass(PasswordResetToken.class);
            verify(passwordResetTokenRepository).save(captor.capture());

            PasswordResetToken saved = captor.getValue();
            assertThat(saved.getToken()).isNotBlank();
            assertThat(saved.getToken()).hasSize(6);           // 6-digit numeric code
            assertThat(saved.getToken()).matches("\\d{6}");   // must be all digits
            assertThat(saved.isUsed()).isFalse();
            assertThat(saved.getExpiresAt()).isAfter(LocalDateTime.now());
            assertThat(saved.getExpiresAt())
                    .isBefore(LocalDateTime.now().plusMinutes(31));   // ≤ 30 min from now
            assertThat(saved.getUser().getEmail()).isEqualTo(VALID_EMAIL);
        }

        /**
         * AC-PR-002: A reset email is dispatched to the registered address.
         * UC-PasswordRecovery step 4 – "Send a password reset link/OTP to the email".
         */
        @Test
        @DisplayName("[AC-PR-002][P0] Dispatches password reset email for a registered address")
        void sendsResetEmailForRegisteredAddress() {
            User user = activeVendor();
            stubUserFound(user);
            when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            passwordResetService.requestReset(VALID_EMAIL, VALID_IP);

            verify(emailService).sendPasswordResetEmail(eq(VALID_EMAIL), anyString(), eq(30));
        }

        /**
         * AC-PR-003: Requesting reset for an unregistered email always returns silently.
         * FR-UM-004 Security – "Always show 'Email sent' regardless of whether the email exists".
         * UC-PasswordRecovery E1 – "Email does not exist → general message".
         */
        @Test
        @DisplayName("[AC-PR-003][P0] Returns silently (no exception) when email is not registered")
        void returnsNormallyForUnknownEmail() {
            when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

            // Must not throw – same observable behaviour as successful path
            passwordResetService.requestReset(UNKNOWN_EMAIL, VALID_IP);
        }

        /**
         * AC-PR-004: No reset email is sent when the address is not registered.
         * Prevents attackers from learning which addresses are enrolled.
         */
        @Test
        @DisplayName("[AC-PR-004][P0] Does NOT send an email when email is not registered")
        void doesNotSendEmailForUnknownAddress() {
            when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

            passwordResetService.requestReset(UNKNOWN_EMAIL, VALID_IP);

            verify(emailService, never())
                    .sendPasswordResetEmail(anyString(), anyString(), anyInt());
        }

        /**
         * AC-PR-005: The 4th request from the same IP within one hour is rejected.
         * FR-UM-004 Security – "Rate limit: 3 requests/hour per IP".
         */
        @Test
        @DisplayName("[AC-PR-005][P0] Throws PasswordResetRateLimitException on 4th request from same IP")
        void rejectsRequestExceedingRateLimit() {
            when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
            // Note: passwordResetTokenRepository.save is NOT stubbed here because the
            // rate-limit check fires before any DB write (user not found → no token saved).

            // Three requests are allowed
            passwordResetService.requestReset(UNKNOWN_EMAIL, VALID_IP);
            passwordResetService.requestReset(UNKNOWN_EMAIL, VALID_IP);
            passwordResetService.requestReset(UNKNOWN_EMAIL, VALID_IP);

            // Fourth must be rejected
            assertThatThrownBy(() ->
                    passwordResetService.requestReset(UNKNOWN_EMAIL, VALID_IP))
                    .isInstanceOf(PasswordResetRateLimitException.class)
                    .hasMessageContaining("Too many password reset requests");
        }

        /**
         * AC-PR-006 (edge): Exactly three requests from the same IP all succeed.
         * Verifies the boundary is inclusive (≤ 3 allowed, not < 3).
         */
        @Test
        @DisplayName("[AC-PR-006][P1] Allows exactly 3 requests from the same IP within one hour")
        void allowsExactlyThreeRequestsFromSameIp() {
            when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

            // All three must complete without throwing
            passwordResetService.requestReset(UNKNOWN_EMAIL, VALID_IP);
            passwordResetService.requestReset(UNKNOWN_EMAIL, VALID_IP);
            passwordResetService.requestReset(UNKNOWN_EMAIL, VALID_IP);

            // Verify rate limit was NOT hit
            verify(passwordResetTokenRepository, never()).save(any());
        }

        /**
         * AC-PR-006b (edge): Different IPs have independent rate-limit windows.
         */
        @Test
        @DisplayName("[AC-PR-006b][P1] Different IP addresses have independent rate-limit windows")
        void differentIpsHaveIndependentWindows() {
            when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

            String ip1 = "10.0.0.1";
            String ip2 = "10.0.0.2";

            // Exhaust the limit for IP1
            passwordResetService.requestReset(UNKNOWN_EMAIL, ip1);
            passwordResetService.requestReset(UNKNOWN_EMAIL, ip1);
            passwordResetService.requestReset(UNKNOWN_EMAIL, ip1);

            // IP2 must still be allowed on its first request
            passwordResetService.requestReset(UNKNOWN_EMAIL, ip2);
        }
    }

    // =========================================================================
    // Step 2 – resetPassword
    // =========================================================================

    @Nested
    @DisplayName("resetPassword() – Step 2: validate token and update password")
    class ResetPassword {

        /**
         * AC-PR-007: Providing a valid token replaces the stored password hash.
         * UC-PasswordRecovery step 9 – "Update the new password, cancel the recovery token".
         */
        @Test
        @DisplayName("[AC-PR-007][P0] Hashes and persists the new password for a valid token")
        void updatesPasswordHashForValidToken() {
            User user = activeVendor();
            PasswordResetToken token = validToken(user);
            when(passwordResetTokenRepository.findByToken(RAW_TOKEN))
                    .thenReturn(Optional.of(token));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            passwordResetService.resetPassword(RAW_TOKEN, NEW_PASSWORD);

            ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(userCaptor.capture());

            String savedHash = userCaptor.getValue().getPasswordHash();
            assertThat(savedHash).isNotBlank();
            assertThat(savedHash).isNotEqualTo(NEW_PASSWORD);          // must be hashed
            assertThat(savedHash).startsWith("$2a$");                  // BCrypt prefix
        }

        /**
         * AC-PR-008: {@code passwordChangedAt} is set to invalidate prior sessions.
         * FR-UM-004 Security – "Invalidate all old sessions".
         * UC-PasswordRecovery step 9.
         */
        @Test
        @DisplayName("[AC-PR-008][P0] Stamps passwordChangedAt to invalidate prior JWT sessions")
        void stampsPasswordChangedAt() {
            User user = activeVendor();
            PasswordResetToken token = validToken(user);
            when(passwordResetTokenRepository.findByToken(RAW_TOKEN))
                    .thenReturn(Optional.of(token));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            LocalDateTime before = LocalDateTime.now().minusSeconds(1);
            passwordResetService.resetPassword(RAW_TOKEN, NEW_PASSWORD);
            LocalDateTime after  = LocalDateTime.now().plusSeconds(1);

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());

            LocalDateTime changedAt = captor.getValue().getPasswordChangedAt();
            assertThat(changedAt).isNotNull();
            assertThat(changedAt).isAfterOrEqualTo(before);
            assertThat(changedAt).isBeforeOrEqualTo(after);
        }

        /**
         * AC-PR-009: All pending reset tokens for the user are invalidated after a
         * successful reset (one-time use enforcement).
         * FR-UM-004 Security – "Token is for one-time use only".
         */
        @Test
        @DisplayName("[AC-PR-009][P0] Invalidates all pending reset tokens for the user after success")
        void invalidatesAllPendingTokensForUser() {
            User user = activeVendor();
            PasswordResetToken token = validToken(user);
            when(passwordResetTokenRepository.findByToken(RAW_TOKEN))
                    .thenReturn(Optional.of(token));
            when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            passwordResetService.resetPassword(RAW_TOKEN, NEW_PASSWORD);

            verify(passwordResetTokenRepository).invalidateAllForUser(VALID_EMAIL);
        }

        /**
         * AC-PR-010: A token that does not exist in the database is rejected.
         * UC-PasswordRecovery E2 – "Token expires → system requests a restart".
         */
        @Test
        @DisplayName("[AC-PR-010][P0] Throws InvalidResetTokenException when token is not found")
        void throwsForNonExistentToken() {
            when(passwordResetTokenRepository.findByToken(anyString()))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                    passwordResetService.resetPassword("nonexistent-token", NEW_PASSWORD))
                    .isInstanceOf(InvalidResetTokenException.class);
        }

        /**
         * AC-PR-011: A token that has already been used is rejected.
         * FR-UM-004 Security – "Token is for one-time use only".
         */
        @Test
        @DisplayName("[AC-PR-011][P0] Throws InvalidResetTokenException for an already-used token")
        void throwsForAlreadyUsedToken() {
            User user = activeVendor();
            PasswordResetToken usedToken = PasswordResetToken.builder()
                    .id(2L)
                    .user(user)
                    .token(RAW_TOKEN)
                    .expiresAt(LocalDateTime.now().plusMinutes(10))
                    .used(true)                                     // already consumed
                    .build();
            when(passwordResetTokenRepository.findByToken(RAW_TOKEN))
                    .thenReturn(Optional.of(usedToken));

            assertThatThrownBy(() ->
                    passwordResetService.resetPassword(RAW_TOKEN, NEW_PASSWORD))
                    .isInstanceOf(InvalidResetTokenException.class);
        }

        /**
         * AC-PR-012: An expired token (past its 30-minute TTL) is rejected.
         * UC-PasswordRecovery E2 – "Token expires → system requests a restart".
         */
        @Test
        @DisplayName("[AC-PR-012][P0] Throws InvalidResetTokenException for an expired token")
        void throwsForExpiredToken() {
            User user = activeVendor();
            PasswordResetToken expiredToken = PasswordResetToken.builder()
                    .id(3L)
                    .user(user)
                    .token(RAW_TOKEN)
                    .expiresAt(LocalDateTime.now().minusMinutes(1))  // expired 1 min ago
                    .used(false)
                    .build();
            when(passwordResetTokenRepository.findByToken(RAW_TOKEN))
                    .thenReturn(Optional.of(expiredToken));

            assertThatThrownBy(() ->
                    passwordResetService.resetPassword(RAW_TOKEN, NEW_PASSWORD))
                    .isInstanceOf(InvalidResetTokenException.class)
                    .hasMessageContaining("expired");
        }

        /**
         * AC-PR-012b (edge): A token expiring exactly at the current moment.
         * Verifies the boundary condition {@code now > expiresAt} (strictly after).
         */
        @Test
        @DisplayName("[AC-PR-012b][P1] Rejects a token whose expiresAt is in the past by 1 second")
        void rejectsTokenExpiredByOneSecond() {
            User user = activeVendor();
            PasswordResetToken borderToken = PasswordResetToken.builder()
                    .id(4L)
                    .user(user)
                    .token(RAW_TOKEN)
                    .expiresAt(LocalDateTime.now().minusSeconds(1))
                    .used(false)
                    .build();
            when(passwordResetTokenRepository.findByToken(RAW_TOKEN))
                    .thenReturn(Optional.of(borderToken));

            assertThatThrownBy(() ->
                    passwordResetService.resetPassword(RAW_TOKEN, NEW_PASSWORD))
                    .isInstanceOf(InvalidResetTokenException.class);
        }

        /**
         * AC-PR-007b (negative interaction): No DB write occurs when the token check fails.
         * Prevents partial state mutations on invalid input.
         */
        @Test
        @DisplayName("[AC-PR-007b][P1] Does not update the user when the token is invalid")
        void doesNotUpdateUserOnInvalidToken() {
            when(passwordResetTokenRepository.findByToken(anyString()))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                    passwordResetService.resetPassword("bad-token", NEW_PASSWORD))
                    .isInstanceOf(InvalidResetTokenException.class);

            verify(userRepository, never()).save(any());
            verify(passwordResetTokenRepository, never()).invalidateAllForUser(anyString());
        }
    }
}
