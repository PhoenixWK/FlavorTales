package com.flavortales.auth.service;

import com.flavortales.auth.entity.PasswordResetToken;
import com.flavortales.auth.repository.PasswordResetTokenRepository;
import com.flavortales.common.exception.InvalidResetTokenException;
import com.flavortales.common.exception.PasswordResetRateLimitException;
import com.flavortales.notification.service.EmailService;
import com.flavortales.user.entity.User;
import com.flavortales.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * FR-UM-004: Password Recovery
 *
 * <h3>Two-step flow</h3>
 * <ol>
 *   <li>{@link #requestReset} – validates the IP rate limit, generates a
 *       one-time 6-digit numeric reset code, persists it, and emails it to the user.
 *       Always returns normally, even when the email is not found, so that
 *       attackers cannot enumerate registered addresses.</li>
 *   <li>{@link #resetPassword} – validates the token (valid, not expired, not
 *       used), hashes the new password, updates the user, marks the token used,
 *       and sets {@code passwordChangedAt} to invalidate all prior sessions.</li>
 * </ol>
 *
 * <h3>Security</h3>
 * <ul>
 *   <li>Rate limit: 3 requests per hour per source IP (in-memory sliding window).</li>
 *   <li>Token expiry: 30 minutes (configurable via
 *       {@code app.password-reset.expiration-minutes}).</li>
 *   <li>One-time use: the token is marked {@code used} immediately on success.</li>
 *   <li>Session invalidation: {@code User.passwordChangedAt} is stamped so the
 *       JWT filter rejects tokens issued before the password change.</li>
 * </ul>
 *
 * <h3>Datasource routing</h3>
 * <pre>
 *  requestReset  → @Transactional → MASTER (INSERT password_reset_token)
 *  resetPassword → @Transactional → MASTER (UPDATE user + password_reset_token)
 * </pre>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private final UserRepository               userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService                 emailService;

    /** Token lifetime in minutes (default: 30). */
    @Value("${app.password-reset.expiration-minutes:30}")
    private int expirationMinutes;

    /** Maximum reset requests per IP per hour (default: 3). */
    @Value("${app.password-reset.rate-limit-max:3}")
    private int rateLimitMax;

    // -------------------------------------------------------------------------
    // In-memory IP rate limiter  –  IP → deque of request timestamps
    // -------------------------------------------------------------------------

    private final ConcurrentHashMap<String, Deque<Instant>> ipRequestLog =
            new ConcurrentHashMap<>();

    // BCrypt with the same cost factor used by AuthService
    private static final BCryptPasswordEncoder passwordEncoder =
            new BCryptPasswordEncoder(12);

    // =========================================================================
    // Step 1 – Request a reset
    // =========================================================================

    /**
     * Initiates a password reset for the given email from the given IP address.
     *
     * <p>Security: always responds successfully, whether the email exists or not,
     * to prevent account enumeration.
     *
     * @param email     the email address submitted by the user
     * @param ipAddress the source IP from the HTTP request (for rate limiting)
     * @throws PasswordResetRateLimitException when the IP exceeds 3 requests/hour
     */
    @Transactional
    public void requestReset(String email, String ipAddress) {
        // 1. IP-based rate limiting (enforced before the email lookup)
        checkIpRateLimit(ipAddress);

        // 2. Look up user – silently ignore if not found (security: enumeration prevention)
        Optional<User> optUser = userRepository.findByEmail(email.trim().toLowerCase());
        if (optUser.isEmpty()) {
            log.info("[PasswordReset] Reset requested for non-existent email – silent OK");
            return;
        }

        User user = optUser.get();

        // 3. Generate a cryptographically random 6-digit numeric code
        String rawToken = String.format("%06d", new SecureRandom().nextInt(1_000_000));

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .user(user)
                .token(rawToken)
                .expiresAt(LocalDateTime.now().plusMinutes(expirationMinutes))
                .build();

        passwordResetTokenRepository.save(resetToken);

        // 4. Send the reset email asynchronously
        emailService.sendPasswordResetEmail(user.getEmail(), rawToken, expirationMinutes);

        log.info("[PasswordReset] Reset token issued for: {}", user.getEmail());
    }

    // =========================================================================
    // Step 2 – Apply the new password
    // =========================================================================

    /**
     * Validates the reset token and updates the user's password.
     *
     * <ol>
     *   <li>Token must exist, not be used, and not be expired.</li>
     *   <li>User password is re-hashed with BCrypt (cost 12).</li>
     *   <li>Token is marked used; all other pending tokens for the user are
     *       also invalidated.</li>
     *   <li>{@code User.passwordChangedAt} is set to {@code now()} so that
     *       the JWT filter rejects all previously-issued access tokens.</li>
     * </ol>
     *
     * @param rawToken    the one-time reset token string from the email
     * @param newPassword the new plain-text password (already validated by the DTO)
     * @throws InvalidResetTokenException when the token is missing, used, or expired
     */
    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        // 1. Locate the token
        PasswordResetToken resetToken = passwordResetTokenRepository
                .findByToken(rawToken)
                .orElseThrow(InvalidResetTokenException::new);

        // 2. Already-used check
        if (resetToken.isUsed()) {
            throw new InvalidResetTokenException();
        }

        // 3. Expiry check
        if (LocalDateTime.now().isAfter(resetToken.getExpiresAt())) {
            throw new InvalidResetTokenException(
                    "The password reset link has expired. Please request a new one.");
        }

        User user = resetToken.getUser();

        // 4. Hash and persist new password
        user.setPasswordHash(passwordEncoder.encode(newPassword));

        // 5. Stamp passwordChangedAt → invalidates all prior JWT sessions
        user.setPasswordChangedAt(LocalDateTime.now());
        userRepository.save(user);

        // 6. Invalidate all pending reset tokens for this user (one-time use)
        passwordResetTokenRepository.invalidateAllForUser(user.getEmail());

        log.info("[PasswordReset] Password successfully reset for: {}", user.getEmail());
    }

    // =========================================================================
    // IP rate-limit helpers
    // =========================================================================

    private void checkIpRateLimit(String ip) {
        Instant oneHourAgo = Instant.now().minusSeconds(3600);

        ipRequestLog.compute(ip, (key, timestamps) -> {
            if (timestamps == null) {
                timestamps = new ArrayDeque<>();
            }
            // Prune entries older than 1 hour
            Iterator<Instant> it = timestamps.iterator();
            while (it.hasNext() && it.next().isBefore(oneHourAgo)) {
                it.remove();
            }
            return timestamps;
        });

        Deque<Instant> window = ipRequestLog.get(ip);
        if (window != null && window.size() >= rateLimitMax) {
            log.warn("[PasswordReset] Rate-limit hit for IP: {}", ip);
            throw new PasswordResetRateLimitException();
        }

        // Record this request
        ipRequestLog.computeIfAbsent(ip, k -> new ArrayDeque<>()).add(Instant.now());
    }

    /**
     * Hourly cleanup of the in-memory rate-limit map to avoid unbounded growth.
     */
    @Scheduled(fixedDelay = 3_600_000)
    public void purgeExpiredIpWindows() {
        Instant oneHourAgo = Instant.now().minusSeconds(3600);
        ipRequestLog.entrySet().removeIf(entry -> {
            Deque<Instant> q = entry.getValue();
            q.removeIf(ts -> ts.isBefore(oneHourAgo));
            return q.isEmpty();
        });
    }
}
