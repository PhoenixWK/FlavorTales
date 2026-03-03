package com.flavortales.common.exception;

public class AccountAlreadyVerifiedException extends RuntimeException {
    public AccountAlreadyVerifiedException() {
        super("Account is already verified");
    }
}
