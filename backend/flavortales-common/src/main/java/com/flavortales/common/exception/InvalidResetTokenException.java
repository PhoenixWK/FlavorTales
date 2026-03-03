package com.flavortales.common.exception;

/**
 * Thrown when a password reset token is invalid, already used, or expired.
 *
 * <p>Maps to HTTP 400 Bad Request (invalid / used) or 410 Gone (expired).
 * A single exception type is used here so that error messages do not reveal
 * whether a token was simply wrong vs. expired.
 */
public class InvalidResetTokenException extends RuntimeException {

    public InvalidResetTokenException() {
        super("The password reset link is invalid or has already been used.");
    }

    public InvalidResetTokenException(String message) {
        super(message);
    }
}
