package com.flavortales.common.exception;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Thrown when a login identifier is locked out due to too many consecutive
 * failed login attempts (default: 10 failures → 30-minute lockout).
 *
 * <p>Maps to HTTP 403 Forbidden.
 */
public class AccountLockedException extends RuntimeException {

    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("HH:mm:ss");

    public AccountLockedException(LocalDateTime lockedUntil) {
        super("Account temporarily locked due to too many failed login attempts. "
                + "Please try again after " + lockedUntil.format(FMT) + ".");
    }

    public AccountLockedException() {
        super("Account temporarily locked due to too many failed login attempts. "
                + "Please try again later.");
    }
}
