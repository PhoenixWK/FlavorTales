package com.flavortales.common.exception;

public class VerificationCodeExpiredException extends RuntimeException {
    public VerificationCodeExpiredException() {
        super("Verification code has expired");
    }
}
