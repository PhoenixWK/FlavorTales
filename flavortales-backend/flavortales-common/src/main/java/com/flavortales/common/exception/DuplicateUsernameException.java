package com.flavortales.common.exception;

public class DuplicateUsernameException extends RuntimeException {

    public DuplicateUsernameException(String username) {
        super("Username is already taken: " + username);
    }

    public DuplicateUsernameException() {
        super("Username is already taken");
    }
}
