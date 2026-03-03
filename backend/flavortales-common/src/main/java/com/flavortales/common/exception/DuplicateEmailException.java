package com.flavortales.common.exception;

public class DuplicateEmailException extends RuntimeException {

    public DuplicateEmailException(String email) {
        super("Email is already in use: " + email);
    }

    public DuplicateEmailException() {
        super("Email is already in use");
    }
}
