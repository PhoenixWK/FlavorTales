package com.flavortales.auth.service;

import com.flavortales.auth.entity.EmailVerification;
import com.flavortales.auth.repository.EmailVerificationRepository;
import com.flavortales.common.exception.AccountAlreadyVerifiedException;
import com.flavortales.common.exception.InvalidVerificationCodeException;
import com.flavortales.common.exception.ResendLimitExceededException;
import com.flavortales.common.exception.UserNotFoundException;
import com.flavortales.common.exception.VerificationCodeExpiredException;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AuthService#verifyEmail} and
 * {@link AuthService#resendVerificationCode}.
 *
 * Requirement traceability:
 *   FR-UM-002 – Vendor Email Verification
 *   FR-UM-003 – Resend Verification Code
 *
 * Test categories covered per requirement:
 *   ✓ Preconditions included    ✓ Clear steps
 *   ✓ Measurable results        ✓ Traceability
 *   ✓ Happy / Negative / Edge   ✓ Real data
 *   ✓ No duplication            ✓ Prioritization
 *   ✓ Bug-finding (boundaries, side-effects)
 *
 * Priority legend: [P1] critical, [P2] important, [P3] edge/boundary
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService – Email Verification & Resend Code")
class EmailVerificationServiceTest {

    // ── Mocks ────────────────────────────────────────────────────────────────

    @Mock private UserRepository                 userRepository;
    @Mock private EmailVerificationRepository    emailVerificationRepository;
    @Mock private EmailService                   emailService;

    @InjectMocks private AuthService authService;

    // ── Shared test data ─────────────────────────────────────────────────────

    private static final String VALID_EMAIL      = "phovendor@example.com";
    private static final String VALID_CODE       = "847291";
    private static final String WRONG_CODE       = "000000";
    private static final int    EXPIRY_MINUTES   = 15;

    @BeforeEach
    void injectExpirationMinutes() {
        ReflectionTestUtils.setField(authService, "expirationMinutes", EXPIRY_MINUTES);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Inactive vendor — the normal pre-verification state. */
    private User inactiveVendor() {
        return User.builder()
                .userId(10)
                .email(VALID_EMAIL)
                .fullName("phovendor01")
                .phone("0987654321")
                .role(Role.vendor)
                .status(UserStatus.inactive)
                .build();
    }

    /** Already-active vendor — should never be allowed to re-verify. */
    private User activeVendor() {
        return User.builder()
                .userId(10)
                .email(VALID_EMAIL)
                .fullName("phovendor01")
                .phone("0987654321")
                .role(Role.vendor)
                .status(UserStatus.active)
                .build();
    }

    /** Creates an {@link EmailVerification} with the given code and expiry offset. */
    private EmailVerification verification(String code, LocalDateTime expiresAt) {
        return EmailVerification.builder()
                .verificationId(1)
                .user(inactiveVendor())
                .verificationCode(code)
                .expiresAt(expiresAt)
                .isVerified(false)
                .build();
    }

    /** Not-yet-expired verification with the correct code. */
    private EmailVerification validVerification() {
        return verification(VALID_CODE, LocalDateTime.now().plusMinutes(EXPIRY_MINUTES));
    }

    /** Tightly-bound stub: user found + one valid verification record. */
    private void stubUserAndVerification(User user, EmailVerification ev) {
        when(userRepository.findByEmail(VALID_EMAIL)).thenReturn(Optional.of(user));
        when(emailVerificationRepository.findTopByUserEmailOrderByCreatedAtDesc(VALID_EMAIL))
                .thenReturn(Optional.of(ev));
    }

    // =========================================================================
    // FR-UM-002 : verifyEmail()
    // =========================================================================

    @Nested
    @DisplayName("FR-UM-002 | verifyEmail()")
    class VerifyEmail {

        // ── [P1] Happy path ───────────────────────────────────────────────────

        @Nested
        @DisplayName("[P1] Happy path – correct code, within expiry")
        class HappyPath {

            @Test
            @DisplayName("Marks EmailVerification.isVerified = true after successful verification")
            void setsVerificationRecordAsVerified() {
                // Precondition: inactive vendor, valid non-expired code
                EmailVerification ev = validVerification();
                stubUserAndVerification(inactiveVendor(), ev);

                authService.verifyEmail(VALID_EMAIL, VALID_CODE);

                ArgumentCaptor<EmailVerification> captor =
                        ArgumentCaptor.forClass(EmailVerification.class);
                verify(emailVerificationRepository).save(captor.capture());
                assertThat(captor.getValue().isVerified()).isTrue();
            }

            @Test
            @DisplayName("Upgrades user status from inactive to active after successful verification")
            void activatesUserAccount() {
                // Precondition: inactive vendor, valid non-expired code
                User vendor = inactiveVendor();
                stubUserAndVerification(vendor, validVerification());

                authService.verifyEmail(VALID_EMAIL, VALID_CODE);

                ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
                verify(userRepository).save(captor.capture());
                assertThat(captor.getValue().getStatus()).isEqualTo(UserStatus.active);
            }

            @Test
            @DisplayName("Both user and verification record are persisted exactly once on success")
            void persistsExactlyOnce() {
                stubUserAndVerification(inactiveVendor(), validVerification());

                authService.verifyEmail(VALID_EMAIL, VALID_CODE);

                verify(userRepository).save(any(User.class));
                verify(emailVerificationRepository).save(any(EmailVerification.class));
            }

            @Test
            @DisplayName("Code valid exactly at the expiry boundary (1 second before expiry) is accepted")
            void codeAtExpiryBoundaryIsAccepted() {
                // Edge: expiresAt = now + 1 second
                EmailVerification ev = verification(VALID_CODE, LocalDateTime.now().plusSeconds(1));
                stubUserAndVerification(inactiveVendor(), ev);

                // Should NOT throw
                authService.verifyEmail(VALID_EMAIL, VALID_CODE);

                verify(userRepository).save(any(User.class));
            }
        }

        // ── [P1] Negative – user not found ───────────────────────────────────

        @Nested
        @DisplayName("[P1] Negative – user does not exist")
        class UserNotFound {

            @Test
            @DisplayName("Throws UserNotFoundException when email is not registered")
            void unknownEmailThrows() {
                // Precondition: no user with this email in the system
                when(userRepository.findByEmail(VALID_EMAIL)).thenReturn(Optional.empty());

                assertThatThrownBy(() -> authService.verifyEmail(VALID_EMAIL, VALID_CODE))
                        .isInstanceOf(UserNotFoundException.class);
            }

            @Test
            @DisplayName("Does not touch verification repository when user is not found")
            void doesNotQueryVerificationTableOnMissingUser() {
                when(userRepository.findByEmail(VALID_EMAIL)).thenReturn(Optional.empty());

                assertThatThrownBy(() -> authService.verifyEmail(VALID_EMAIL, VALID_CODE))
                        .isInstanceOf(UserNotFoundException.class);

                verify(emailVerificationRepository, never()).findTopByUserEmailOrderByCreatedAtDesc(anyString());
            }
        }

        // ── [P1] Negative – already verified ─────────────────────────────────

        @Nested
        @DisplayName("[P1] Negative – account already active")
        class AlreadyVerified {

            @Test
            @DisplayName("Throws AccountAlreadyVerifiedException when user status is active")
            void activeUserThrows() {
                // Precondition: vendor previously verified — status = active
                when(userRepository.findByEmail(VALID_EMAIL)).thenReturn(Optional.of(activeVendor()));

                assertThatThrownBy(() -> authService.verifyEmail(VALID_EMAIL, VALID_CODE))
                        .isInstanceOf(AccountAlreadyVerifiedException.class)
                        .hasMessageContaining("already verified");
            }

            @Test
            @DisplayName("Does not re-save an active user or verification record on duplicate attempt")
            void doesNotSaveOnDuplicateVerification() {
                when(userRepository.findByEmail(VALID_EMAIL)).thenReturn(Optional.of(activeVendor()));

                assertThatThrownBy(() -> authService.verifyEmail(VALID_EMAIL, VALID_CODE))
                        .isInstanceOf(AccountAlreadyVerifiedException.class);

                verify(userRepository, never()).save(any());
                verify(emailVerificationRepository, never()).save(any());
            }
        }

        // ── [P1] Negative – wrong code ────────────────────────────────────────

        @Nested
        @DisplayName("[P1] Negative – wrong verification code")
        class WrongCode {

            @Test
            @DisplayName("Throws InvalidVerificationCodeException when submitted code does not match stored code")
            void wrongCodeThrows() {
                // Precondition: vendor is inactive; stored code is VALID_CODE but WRONG_CODE is submitted
                stubUserAndVerification(inactiveVendor(), validVerification());

                assertThatThrownBy(() -> authService.verifyEmail(VALID_EMAIL, WRONG_CODE))
                        .isInstanceOf(InvalidVerificationCodeException.class)
                        .hasMessageContaining("Invalid verification code");
            }

            @Test
            @DisplayName("Does not update user status when code is wrong")
            void doesNotActivateUserOnWrongCode() {
                stubUserAndVerification(inactiveVendor(), validVerification());

                assertThatThrownBy(() -> authService.verifyEmail(VALID_EMAIL, WRONG_CODE))
                        .isInstanceOf(InvalidVerificationCodeException.class);

                verify(userRepository, never()).save(any());
            }

            @Test
            @DisplayName("Throws InvalidVerificationCodeException when no verification record exists")
            void noRecordThrowsInvalidCode() {
                // Precondition: user exists but no EmailVerification row (shouldn't happen normally — finds bugs)
                when(userRepository.findByEmail(VALID_EMAIL)).thenReturn(Optional.of(inactiveVendor()));
                when(emailVerificationRepository.findTopByUserEmailOrderByCreatedAtDesc(VALID_EMAIL))
                        .thenReturn(Optional.empty());

                assertThatThrownBy(() -> authService.verifyEmail(VALID_EMAIL, VALID_CODE))
                        .isInstanceOf(InvalidVerificationCodeException.class);
            }
        }

        // ── [P1] Negative – expired code ─────────────────────────────────────

        @Nested
        @DisplayName("[P1] Negative – code has expired")
        class ExpiredCode {

            @Test
            @DisplayName("Throws VerificationCodeExpiredException when code TTL has passed")
            void expiredCodeThrows() {
                // Precondition: code was issued 20 minutes ago (expiry = 15 min)
                EmailVerification expired = verification(VALID_CODE, LocalDateTime.now().minusMinutes(5));
                stubUserAndVerification(inactiveVendor(), expired);

                assertThatThrownBy(() -> authService.verifyEmail(VALID_EMAIL, VALID_CODE))
                        .isInstanceOf(VerificationCodeExpiredException.class)
                        .hasMessageContaining("expired");
            }

            @Test
            @DisplayName("Does not activate user when code is expired, even if the code itself is correct")
            void doesNotActivateOnExpiredCode() {
                EmailVerification expired = verification(VALID_CODE, LocalDateTime.now().minusMinutes(1));
                stubUserAndVerification(inactiveVendor(), expired);

                assertThatThrownBy(() -> authService.verifyEmail(VALID_EMAIL, VALID_CODE))
                        .isInstanceOf(VerificationCodeExpiredException.class);

                verify(userRepository, never()).save(any());
                verify(emailVerificationRepository, never()).save(any());
            }

            @Test
            @DisplayName("[P3] Code that expired exactly 1 second ago is rejected")
            void codeExpiredOneSecondAgoIsRejected() {
                // Edge: expiresAt = exactly 1 second in the past
                EmailVerification justExpired = verification(VALID_CODE, LocalDateTime.now().minusSeconds(1));
                stubUserAndVerification(inactiveVendor(), justExpired);

                assertThatThrownBy(() -> authService.verifyEmail(VALID_EMAIL, VALID_CODE))
                        .isInstanceOf(VerificationCodeExpiredException.class);
            }
        }
    }

    // =========================================================================
    // FR-UM-003 : resendVerificationCode()
    // =========================================================================

    @Nested
    @DisplayName("FR-UM-003 | resendVerificationCode()")
    class ResendVerificationCode {

        /** Stubs: user found (inactive) + given count of existing records. */
        private void stubInactiveUserWithCount(long count) {
            when(userRepository.findByEmail(VALID_EMAIL)).thenReturn(Optional.of(inactiveVendor()));
            when(emailVerificationRepository.countByUserEmail(VALID_EMAIL)).thenReturn(count);
            when(emailVerificationRepository.save(any(EmailVerification.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
        }

        // ── [P1] Happy path ───────────────────────────────────────────────────

        @Nested
        @DisplayName("[P1] Happy path – resend allowed")
        class HappyPath {

            @Test
            @DisplayName("First resend (1 record exists): saves a new EmailVerification with a 6-digit code")
            void firstResendSavesNewVerification() {
                // Precondition: 1 existing record (the original sent at registration)
                stubInactiveUserWithCount(1L);

                authService.resendVerificationCode(VALID_EMAIL);

                ArgumentCaptor<EmailVerification> captor =
                        ArgumentCaptor.forClass(EmailVerification.class);
                verify(emailVerificationRepository).save(captor.capture());
                EmailVerification saved = captor.getValue();

                assertThat(saved.getVerificationCode())
                        .hasSize(6)
                        .containsOnlyDigits();
                assertThat(saved.isVerified()).isFalse();
            }

            @Test
            @DisplayName("First resend: sends email to the vendor's registered address")
            void firstResendSendsEmail() {
                stubInactiveUserWithCount(1L);

                authService.resendVerificationCode(VALID_EMAIL);

                verify(emailService).sendVendorVerificationEmail(eq(VALID_EMAIL), anyString());
            }

            @Test
            @DisplayName("New verification code carries the configured expiry window")
            void newCodeExpiryIsCorrect() {
                stubInactiveUserWithCount(1L);
                LocalDateTime before = LocalDateTime.now().plusMinutes(EXPIRY_MINUTES - 1);

                authService.resendVerificationCode(VALID_EMAIL);

                LocalDateTime after = LocalDateTime.now().plusMinutes(EXPIRY_MINUTES + 1);
                ArgumentCaptor<EmailVerification> captor =
                        ArgumentCaptor.forClass(EmailVerification.class);
                verify(emailVerificationRepository).save(captor.capture());
                assertThat(captor.getValue().getExpiresAt()).isBetween(before, after);
            }

            @Test
            @DisplayName("Third resend (3 records exist, count == MAX_RESEND_COUNT): still allowed")
            void thirdResendIsAllowed() {
                // Edge: count = MAX_RESEND_COUNT (3) — the condition is > 3, so 3 is still valid
                stubInactiveUserWithCount(3L);

                // Must NOT throw
                authService.resendVerificationCode(VALID_EMAIL);

                verify(emailVerificationRepository).save(any(EmailVerification.class));
                verify(emailService).sendVendorVerificationEmail(anyString(), anyString());
            }

            @Test
            @DisplayName("Resent code for a different vendor does not leak or reuse codes")
            void differentVendorEmailsGetIndependentCodes() {
                // Precondition: two separate vendors; only second is being resent
                String secondEmail = "banhmivendor@example.com";
                User secondVendor = User.builder()
                        .userId(20).email(secondEmail).fullName("banhmivendor01")
                        .phone("0911222333").role(Role.vendor).status(UserStatus.inactive)
                        .build();

                when(userRepository.findByEmail(secondEmail)).thenReturn(Optional.of(secondVendor));
                when(emailVerificationRepository.countByUserEmail(secondEmail)).thenReturn(1L);
                when(emailVerificationRepository.save(any(EmailVerification.class)))
                        .thenAnswer(inv -> inv.getArgument(0));

                authService.resendVerificationCode(secondEmail);

                verify(emailService).sendVendorVerificationEmail(eq(secondEmail), anyString());
                verify(emailVerificationRepository, never()).countByUserEmail(VALID_EMAIL);
            }
        }

        // ── [P1] Negative – user not found ───────────────────────────────────

        @Nested
        @DisplayName("[P1] Negative – user does not exist")
        class UserNotFound {

            @Test
            @DisplayName("Throws UserNotFoundException for an unregistered email")
            void unknownEmailThrows() {
                when(userRepository.findByEmail(VALID_EMAIL)).thenReturn(Optional.empty());

                assertThatThrownBy(() -> authService.resendVerificationCode(VALID_EMAIL))
                        .isInstanceOf(UserNotFoundException.class);
            }

            @Test
            @DisplayName("Does not query verification count or send email when user is not found")
            void noSideEffectsOnMissingUser() {
                when(userRepository.findByEmail(VALID_EMAIL)).thenReturn(Optional.empty());

                assertThatThrownBy(() -> authService.resendVerificationCode(VALID_EMAIL))
                        .isInstanceOf(UserNotFoundException.class);

                verify(emailVerificationRepository, never()).countByUserEmail(anyString());
                verify(emailService, never()).sendVendorVerificationEmail(anyString(), anyString());
            }
        }

        // ── [P1] Negative – already active ────────────────────────────────────

        @Nested
        @DisplayName("[P1] Negative – account already active")
        class AlreadyActive {

            @Test
            @DisplayName("Throws AccountAlreadyVerifiedException when vendor is already active")
            void activeVendorThrows() {
                when(userRepository.findByEmail(VALID_EMAIL)).thenReturn(Optional.of(activeVendor()));

                assertThatThrownBy(() -> authService.resendVerificationCode(VALID_EMAIL))
                        .isInstanceOf(AccountAlreadyVerifiedException.class)
                        .hasMessageContaining("already verified");
            }

            @Test
            @DisplayName("Does not send email or save a code when account is already active")
            void noSideEffectsOnActiveAccount() {
                when(userRepository.findByEmail(VALID_EMAIL)).thenReturn(Optional.of(activeVendor()));

                assertThatThrownBy(() -> authService.resendVerificationCode(VALID_EMAIL))
                        .isInstanceOf(AccountAlreadyVerifiedException.class);

                verify(emailVerificationRepository, never()).save(any());
                verify(emailService, never()).sendVendorVerificationEmail(anyString(), anyString());
            }
        }

        // ── [P1] Negative – resend limit ──────────────────────────────────────

        @Nested
        @DisplayName("[P1] Negative – resend limit exceeded")
        class ResendLimit {

            @Test
            @DisplayName("Throws ResendLimitExceededException when 4 records already exist (limit is 3 resends)")
            void fourRecordsBlocksNextResend() {
                // Precondition: 1 original + 3 resends = 4 records → 4th resend blocked
                when(userRepository.findByEmail(VALID_EMAIL)).thenReturn(Optional.of(inactiveVendor()));
                when(emailVerificationRepository.countByUserEmail(VALID_EMAIL)).thenReturn(4L);

                assertThatThrownBy(() -> authService.resendVerificationCode(VALID_EMAIL))
                        .isInstanceOf(ResendLimitExceededException.class)
                        .hasMessageContaining("3");
            }

            @Test
            @DisplayName("Does not save a new code or send email when limit is exceeded")
            void noEmailSentWhenLimitExceeded() {
                when(userRepository.findByEmail(VALID_EMAIL)).thenReturn(Optional.of(inactiveVendor()));
                when(emailVerificationRepository.countByUserEmail(VALID_EMAIL)).thenReturn(5L);

                assertThatThrownBy(() -> authService.resendVerificationCode(VALID_EMAIL))
                        .isInstanceOf(ResendLimitExceededException.class);

                verify(emailVerificationRepository, never()).save(any());
                verify(emailService, never()).sendVendorVerificationEmail(anyString(), anyString());
            }

            @Test
            @DisplayName("[P3] Edge – count=3 passes, count=4 fails (boundary around MAX_RESEND_COUNT)")
            void boundaryAroundMaxResendCount() {
                // count=3 → allowed (checked in HappyPath.thirdResendIsAllowed)
                // count=4 → blocked
                when(userRepository.findByEmail(VALID_EMAIL)).thenReturn(Optional.of(inactiveVendor()));
                when(emailVerificationRepository.countByUserEmail(VALID_EMAIL)).thenReturn(4L);

                assertThatThrownBy(() -> authService.resendVerificationCode(VALID_EMAIL))
                        .isInstanceOf(ResendLimitExceededException.class);
            }
        }
    }
}
