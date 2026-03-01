package com.flavortales.common.exception;

/**
 * Thrown during login when the account has been submitted and is waiting for
 * admin review / email verification (status = {@code pending}).
 */
public class AccountPendingException extends RuntimeException {

    public AccountPendingException() {
        super("Account pending approval. Please wait for administrator review.");
    }
}
