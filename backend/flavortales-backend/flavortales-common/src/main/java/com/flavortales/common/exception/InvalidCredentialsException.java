package com.flavortales.common.exception;

/**
 * Thrown when the supplied password does not match the stored hash,
 * or when no user exists for the given identifier.
 *
 * <p>Both cases return the same generic message intentionally – revealing
 * <em>which</em> field is wrong would aid credential-stuffing attacks.
 */
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException() {
        super("Invalid username/email or password");
    }
}
