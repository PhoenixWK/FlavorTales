package com.flavortales.common.exception;

/**
 * Thrown during login when the account has been rejected by an administrator
 * (status = {@code rejected}).
 */
public class AccountRejectedException extends RuntimeException {

    public AccountRejectedException() {
        super("Account rejected. Please contact support for more information.");
    }
}
