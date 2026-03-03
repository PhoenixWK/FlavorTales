package com.flavortales.common.exception;

/**
 * Thrown when a login identifier receives more than the maximum number of
 * attempts within the configured rate-limit window (default: 5 attempts / 15 min).
 *
 * <p>Maps to HTTP 429 Too Many Requests.
 */
public class TooManyLoginAttemptsException extends RuntimeException {

    public TooManyLoginAttemptsException() {
        super("Too many login attempts. Please try again later.");
    }
}
