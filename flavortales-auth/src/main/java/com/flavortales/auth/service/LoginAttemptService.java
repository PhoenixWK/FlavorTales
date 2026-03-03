package com.flavortales.auth.service;

import com.flavortales.auth.entity.LoginAttempt;
import com.flavortales.auth.repository.LoginAttemptRepository;
import com.flavortales.common.annotation.ReadOnly;
import com.flavortales.common.exception.AccountLockedException;
import com.flavortales.common.exception.TooManyLoginAttemptsException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Enforces per-identifier rate limiting and account lockout for the login flow.
 *
 * <h3>Rules (configurable via {@code app.security.*})</h3>
 * <ul>
 *   <li><b>Rate limit</b>  – at most {@code rate-limit-max-attempts} login
 *       attempts (any outcome) within a sliding {@code rate-limit-window-minutes}
 *       window before a {@link TooManyLoginAttemptsException} is thrown.</li>
 *   <li><b>Lockout</b>     – {@code lockout-max-failures} consecutive failed
 *       attempts within the rate-limit window triggers a
 *       {@code lockout-duration-minutes}-minute lockout stored in the DB.</li>
 * </ul>
 *
 * <h3>Datasource routing</h3>
 * <ul>
 *   <li>{@link #checkRateLimitAndLockout} – read-only check → {@code @ReadOnly}
 *       → routed to <b>SLAVE</b> (replica).</li>
 *   <li>{@link #recordFailedAttempt} / {@link #recordSuccessAndClear} – write
 *       operations → {@code @Transactional} → routed to <b>MASTER</b>.</li>
 * </ul>
 *
 * <p>These methods are called directly from {@link com.flavortales.auth.controller.AuthController},
 * outside any enclosing {@code @ReadOnly} context, so each call enters through
 * its own AOP proxy and routing is applied independently.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LoginAttemptService {

    private final LoginAttemptRepository loginAttemptRepository;

    @Value("${app.security.rate-limit-window-minutes:15}")
    private int rateLimitWindowMinutes;

    @Value("${app.security.rate-limit-max-attempts:5}")
    private int rateLimitMaxAttempts;

    @Value("${app.security.lockout-max-failures:10}")
    private int lockoutMaxFailures;

    @Value("${app.security.lockout-duration-minutes:30}")
    private int lockoutDurationMinutes;

    // -------------------------------------------------------------------------
    // Read-only check (SLAVE)
    // -------------------------------------------------------------------------

    /**
     * Reads lock and rate-limit state from the replica and throws the
     * appropriate exception if the identifier is blocked.
     *
     * <p>Datasource routing: {@code @ReadOnly} → AOP routes to <b>SLAVE</b>.
     *
     * @param identifier the login identifier (email or username) to check
     * @throws AccountLockedException        when a lockout is still active
     * @throws TooManyLoginAttemptsException when the rate-limit window is full
     */
    @ReadOnly
    public void checkRateLimitAndLockout(String identifier) {
        String normalised = normalise(identifier);

        // 1. Active lockout check
        loginAttemptRepository
                .findTopByIdentifierAndLockedUntilIsNotNullOrderByAttemptedAtDesc(normalised)
                .ifPresent(latest -> {
                    if (latest.getLockedUntil() != null
                            && LocalDateTime.now().isBefore(latest.getLockedUntil())) {
                        log.warn("[LoginAttempt] Blocked – {} is locked until {}",
                                normalised, latest.getLockedUntil());
                        throw new AccountLockedException(latest.getLockedUntil());
                    }
                });

        // 2. Sliding-window rate limit (all attempts, success or failure)
        LocalDateTime windowStart = LocalDateTime.now().minusMinutes(rateLimitWindowMinutes);
        long attemptsInWindow = loginAttemptRepository
                .countByIdentifierAndAttemptedAtAfter(normalised, windowStart);

        if (attemptsInWindow >= rateLimitMaxAttempts) {
            log.warn("[LoginAttempt] Rate-limited – {} made {} attempts in the last {} min",
                    normalised, attemptsInWindow, rateLimitWindowMinutes);
            throw new TooManyLoginAttemptsException();
        }
    }

    // -------------------------------------------------------------------------
    // Write operations (MASTER)
    // -------------------------------------------------------------------------

    /**
     * Persists a failed attempt row and, if the failure threshold is reached
     * within the current window, inserts a lockout sentinel row.
     *
     * <p>Datasource routing: {@code @Transactional} (readOnly = false) →
     * AOP routes to <b>MASTER</b>.
     *
     * @param identifier the login identifier that failed
     */
    @Transactional
    public void recordFailedAttempt(String identifier) {
        String normalised = normalise(identifier);

        loginAttemptRepository.save(LoginAttempt.builder()
                .identifier(normalised)
                .success(false)
                .build());

        // Check whether total failures in window reach the lockout threshold
        LocalDateTime windowStart = LocalDateTime.now().minusMinutes(rateLimitWindowMinutes);
        long recentFailures = loginAttemptRepository
                .countRecentFailuresExcludingLockout(normalised, windowStart);

        if (recentFailures >= lockoutMaxFailures) {
            LocalDateTime lockedUntil = LocalDateTime.now().plusMinutes(lockoutDurationMinutes);
            loginAttemptRepository.save(LoginAttempt.builder()
                    .identifier(normalised)
                    .success(false)
                    .lockedUntil(lockedUntil)
                    .build());
            log.warn("[LoginAttempt] Lockout triggered for {} until {}", normalised, lockedUntil);
        }

        log.debug("[LoginAttempt] Failed attempt recorded for {}", normalised);
    }

    /**
     * Records a successful login and clears all prior attempt records for the
     * identifier so the rate-limit and lockout windows are reset.
     *
     * <p>Datasource routing: {@code @Transactional} (readOnly = false) →
     * AOP routes to <b>MASTER</b>.
     *
     * @param identifier the login identifier that succeeded
     */
    @Transactional
    public void recordSuccessAndClear(String identifier) {
        String normalised = normalise(identifier);

        loginAttemptRepository.deleteAllByIdentifier(normalised);

        loginAttemptRepository.save(LoginAttempt.builder()
                .identifier(normalised)
                .success(true)
                .build());

        log.debug("[LoginAttempt] Success recorded and history cleared for {}", normalised);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static String normalise(String identifier) {
        return identifier == null ? "" : identifier.trim().toLowerCase();
    }
}
