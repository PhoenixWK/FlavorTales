package com.flavortales.common.exception;

/**
 * Thrown during login when the account has been suspended by an administrator
 * (status = {@code suspended}).
 */
public class AccountSuspendedException extends RuntimeException {

    public AccountSuspendedException() {
        super("Account temporarily suspended. Please contact support.");
    }
}
