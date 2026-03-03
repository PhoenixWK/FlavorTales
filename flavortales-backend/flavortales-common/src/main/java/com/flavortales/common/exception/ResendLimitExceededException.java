package com.flavortales.common.exception;

public class ResendLimitExceededException extends RuntimeException {
    public ResendLimitExceededException() {
        super("Resend limit reached. Maximum 3 resends are allowed per account.");
    }
}
