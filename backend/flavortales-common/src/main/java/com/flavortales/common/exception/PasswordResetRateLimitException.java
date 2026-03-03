package com.flavortales.common.exception;

/**
 * Thrown when the password reset endpoint receives more than 3 requests
 * within a 1-hour window from the same IP address.
 *
 * <p>Maps to HTTP 429 Too Many Requests.
 */
public class PasswordResetRateLimitException extends RuntimeException {

    public PasswordResetRateLimitException() {
        super("Too many password reset requests. Please try again later.");
    }
}
