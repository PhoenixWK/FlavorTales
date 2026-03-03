package com.flavortales.common.exception;

/**
 * Thrown during login when the account has been permanently disabled
 * (status = {@code disabled} or {@code inactive} without a pending verification).
 */
public class AccountDisabledException extends RuntimeException {

    public AccountDisabledException() {
        super("Account is inactive. Please contact support.");
    }
}
