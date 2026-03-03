package com.flavortales.auth.service;

import com.flavortales.auth.entity.LoginAttempt;
import com.flavortales.auth.repository.LoginAttemptRepository;
import com.flavortales.common.exception.AccountLockedException;
import com.flavortales.common.exception.TooManyLoginAttemptsException;
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
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link LoginAttemptService}.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>Use Case  : UC-Login-Vendor (Security section)</li>
 *   <li>User Story: US-002 – Authentication / Vendor Login</li>
 *   <li>Acceptance: AC-002-04, AC-002-05 (temporarily locked / disabled accounts)</li>
 * </ul>
 *
 * <p><b>Coverage matrix</b>
 * <pre>
 *  Scenario                                     Priority  Type
 *  ─────────────────────────────────────────────────────────────
 *  No prior attempts → passes check              P0       Positive
 *  Active lockout → AccountLockedException        P0       Negative
 *  Expired lockout → passes check                P1       Edge
 *  Rate window full → TooManyLoginAttemptsException P0    Negative
 *  Failure recorded; lockout not yet triggered   P0       Positive
 *  10th consecutive failure triggers lockout      P0       Negative
 *  Success clears all history and records success P0       Positive
 *  Identifier is normalised to lower-case         P1       Edge
 * </pre>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("LoginAttemptService | US-002 / AC-002-04, AC-002-05")
class LoginAttemptServiceTest {

    @Mock
    private LoginAttemptRepository loginAttemptRepository;

    @InjectMocks
    private LoginAttemptService loginAttemptService;

    // Configurable thresholds (mirroring security.yml defaults)
    private static final int WINDOW_MINUTES       = 15;
    private static final int RATE_MAX_ATTEMPTS    = 5;
    private static final int LOCKOUT_MAX_FAILURES = 10;
    private static final int LOCKOUT_DURATION_MIN = 30;

    private static final String EMAIL = "vendor@example.com";

    @BeforeEach
    void injectConfig() {
        ReflectionTestUtils.setField(loginAttemptService, "rateLimitWindowMinutes", WINDOW_MINUTES);
        ReflectionTestUtils.setField(loginAttemptService, "rateLimitMaxAttempts",   RATE_MAX_ATTEMPTS);
        ReflectionTestUtils.setField(loginAttemptService, "lockoutMaxFailures",     LOCKOUT_MAX_FAILURES);
        ReflectionTestUtils.setField(loginAttemptService, "lockoutDurationMinutes", LOCKOUT_DURATION_MIN);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // checkRateLimitAndLockout
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("checkRateLimitAndLockout()")
    class CheckRateLimitAndLockout {

        /**
         * AC-002 (positive): A fresh identifier with no history passes immediately.
         */
        @Test
        @DisplayName("[Positive] No prior attempts – check passes without exception")
        void passesWhenNoHistory() {
            when(loginAttemptRepository
                    .findTopByIdentifierAndLockedUntilIsNotNullOrderByAttemptedAtDesc(anyString()))
                    .thenReturn(Optional.empty());
            when(loginAttemptRepository
                    .countByIdentifierAndAttemptedAtAfter(anyString(), any(LocalDateTime.class)))
                    .thenReturn(0L);

            // Must not throw
            loginAttemptService.checkRateLimitAndLockout(EMAIL);
        }

        /**
         * AC-002-04: Account temporarily locked → login must be blocked.
         */
        @Test
        @DisplayName("[AC-002-04] Active lockout → AccountLockedException")
        void throwsWhenActiveLockoutExists() {
            LoginAttempt lockout = LoginAttempt.builder()
                    .identifier(EMAIL)
                    .lockedUntil(LocalDateTime.now().plusMinutes(20))   // still in future
                    .build();
            when(loginAttemptRepository
                    .findTopByIdentifierAndLockedUntilIsNotNullOrderByAttemptedAtDesc(anyString()))
                    .thenReturn(Optional.of(lockout));

            assertThatThrownBy(() -> loginAttemptService.checkRateLimitAndLockout(EMAIL))
                    .isInstanceOf(AccountLockedException.class)
                    .hasMessageContaining("locked");
        }

        /**
         * Edge: An expired lockout must be ignored and the check must pass
         * (the account recovers automatically after the lockout window).
         */
        @Test
        @DisplayName("[Edge] Expired lockout is ignored – check passes")
        void passesWhenLockoutHasExpired() {
            LoginAttempt expiredLockout = LoginAttempt.builder()
                    .identifier(EMAIL)
                    .lockedUntil(LocalDateTime.now().minusMinutes(1))   // already in past
                    .build();
            when(loginAttemptRepository
                    .findTopByIdentifierAndLockedUntilIsNotNullOrderByAttemptedAtDesc(anyString()))
                    .thenReturn(Optional.of(expiredLockout));
            when(loginAttemptRepository
                    .countByIdentifierAndAttemptedAtAfter(anyString(), any(LocalDateTime.class)))
                    .thenReturn(0L);

            // Must not throw
            loginAttemptService.checkRateLimitAndLockout(EMAIL);
        }

        /**
         * AC-002 (negative): 5 attempts within 15 minutes triggers rate limiting.
         */
        @Test
        @DisplayName("[AC-002] 5 attempts in window → TooManyLoginAttemptsException (rate limit)")
        void throwsWhenRateLimitWindowIsFull() {
            when(loginAttemptRepository
                    .findTopByIdentifierAndLockedUntilIsNotNullOrderByAttemptedAtDesc(anyString()))
                    .thenReturn(Optional.empty());
            when(loginAttemptRepository
                    .countByIdentifierAndAttemptedAtAfter(anyString(), any(LocalDateTime.class)))
                    .thenReturn((long) RATE_MAX_ATTEMPTS);   // exactly at threshold

            assertThatThrownBy(() -> loginAttemptService.checkRateLimitAndLockout(EMAIL))
                    .isInstanceOf(TooManyLoginAttemptsException.class)
                    .hasMessageContaining("Too many login attempts");
        }

        /**
         * Edge: 4 attempts (below threshold) must not trigger rate limiting.
         */
        @Test
        @DisplayName("[Edge] 4 attempts in window (below threshold) → passes")
        void passesWhenAttemptsBelowRateLimit() {
            when(loginAttemptRepository
                    .findTopByIdentifierAndLockedUntilIsNotNullOrderByAttemptedAtDesc(anyString()))
                    .thenReturn(Optional.empty());
            when(loginAttemptRepository
                    .countByIdentifierAndAttemptedAtAfter(anyString(), any(LocalDateTime.class)))
                    .thenReturn((long) (RATE_MAX_ATTEMPTS - 1));

            loginAttemptService.checkRateLimitAndLockout(EMAIL);  // no exception
        }

        /**
         * Edge: Identifier casing must not bypass the check.
         * "Vendor@Example.COM" and "vendor@example.com" must be treated as the same key.
         */
        @Test
        @DisplayName("[Edge] Identifier is normalised to lower-case before checking")
        void normalisesIdentifierToLowerCase() {
            String mixedCase = "Vendor@EXAMPLE.com";
            when(loginAttemptRepository
                    .findTopByIdentifierAndLockedUntilIsNotNullOrderByAttemptedAtDesc(EMAIL))
                    .thenReturn(Optional.empty());
            when(loginAttemptRepository
                    .countByIdentifierAndAttemptedAtAfter(eq(EMAIL), any(LocalDateTime.class)))
                    .thenReturn(0L);

            loginAttemptService.checkRateLimitAndLockout(mixedCase);

            verify(loginAttemptRepository)
                    .findTopByIdentifierAndLockedUntilIsNotNullOrderByAttemptedAtDesc(EMAIL);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // recordFailedAttempt
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("recordFailedAttempt()")
    class RecordFailedAttempt {

        /**
         * AC-002 (positive): Each failed login must be persisted.
         */
        @Test
        @DisplayName("[Positive] Saves a failed attempt row with success=false")
        void savesFailedAttemptRow() {
            when(loginAttemptRepository
                    .countRecentFailuresExcludingLockout(anyString(), any(LocalDateTime.class)))
                    .thenReturn(1L);

            loginAttemptService.recordFailedAttempt(EMAIL);

            ArgumentCaptor<LoginAttempt> captor = ArgumentCaptor.forClass(LoginAttempt.class);
            verify(loginAttemptRepository, times(1)).save(captor.capture());

            LoginAttempt saved = captor.getAllValues().get(0);   // first save = attempt row
            assertThat(saved.isSuccess()).isFalse();
            assertThat(saved.getLockedUntil()).isNull();
            assertThat(saved.getIdentifier()).isEqualTo(EMAIL);
        }

        /**
         * AC-002-04: After 10 consecutive failures a lockout sentinel row must be
         * written with a future {@code lockedUntil} timestamp.
         */
        @Test
        @DisplayName("[AC-002-04] 10th consecutive failure creates a lockout sentinel row")
        void createsLockoutSentinelOnTenthFailure() {
            when(loginAttemptRepository
                    .countRecentFailuresExcludingLockout(anyString(), any(LocalDateTime.class)))
                    .thenReturn((long) LOCKOUT_MAX_FAILURES);   // threshold reached

            loginAttemptService.recordFailedAttempt(EMAIL);

            ArgumentCaptor<LoginAttempt> captor = ArgumentCaptor.forClass(LoginAttempt.class);
            verify(loginAttemptRepository, times(2)).save(captor.capture());

            LoginAttempt lockoutRow = captor.getAllValues().get(1);
            assertThat(lockoutRow.getLockedUntil()).isNotNull();
            assertThat(lockoutRow.getLockedUntil()).isAfter(LocalDateTime.now());
            assertThat(lockoutRow.getLockedUntil())
                    .isBefore(LocalDateTime.now().plusMinutes(LOCKOUT_DURATION_MIN + 1));
        }

        /**
         * AC-002-04: 9 failures (below threshold) must NOT trigger a lockout.
         */
        @Test
        @DisplayName("[AC-002-04] 9 consecutive failures – no lockout sentinel created")
        void noLockoutBeforeThreshold() {
            when(loginAttemptRepository
                    .countRecentFailuresExcludingLockout(anyString(), any(LocalDateTime.class)))
                    .thenReturn((long) (LOCKOUT_MAX_FAILURES - 1));

            loginAttemptService.recordFailedAttempt(EMAIL);

            // Only the attempt row is saved; no lockout row
            ArgumentCaptor<LoginAttempt> captor = ArgumentCaptor.forClass(LoginAttempt.class);
            verify(loginAttemptRepository, times(1)).save(captor.capture());
            assertThat(captor.getValue().getLockedUntil()).isNull();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // recordSuccessAndClear
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("recordSuccessAndClear()")
    class RecordSuccessAndClear {

        /**
         * AC-002-06 + security: On successful login the failed-attempt history must
         * be cleared so the next failed-login window starts fresh.
         */
        @Test
        @DisplayName("[AC-002-06] Deletes all prior attempt rows for the identifier")
        void deletesAllPriorAttempts() {
            loginAttemptService.recordSuccessAndClear(EMAIL);

            verify(loginAttemptRepository).deleteAllByIdentifier(EMAIL);
        }

        /**
         * AC-002-06: A success row is persisted after clearing.
         */
        @Test
        @DisplayName("[AC-002-06] Saves a success row (success=true, lockedUntil=null)")
        void savesSuccessRow() {
            loginAttemptService.recordSuccessAndClear(EMAIL);

            ArgumentCaptor<LoginAttempt> captor = ArgumentCaptor.forClass(LoginAttempt.class);
            verify(loginAttemptRepository).save(captor.capture());

            LoginAttempt saved = captor.getValue();
            assertThat(saved.isSuccess()).isTrue();
            assertThat(saved.getLockedUntil()).isNull();
            assertThat(saved.getIdentifier()).isEqualTo(EMAIL);
        }

        /**
         * Ordering: delete must happen before the success row is saved.
         */
        @Test
        @DisplayName("[Edge] Delete happens before save (ordering)")
        void deleteBeforeSave() {
            org.mockito.InOrder inOrder =
                    org.mockito.Mockito.inOrder(loginAttemptRepository);

            loginAttemptService.recordSuccessAndClear(EMAIL);

            inOrder.verify(loginAttemptRepository).deleteAllByIdentifier(EMAIL);
            inOrder.verify(loginAttemptRepository).save(any(LoginAttempt.class));
        }
    }
}
