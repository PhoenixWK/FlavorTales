package com.flavortales.common.exception;

public class PoiNotFoundException extends RuntimeException {
    public PoiNotFoundException(String message) {
        super(message);
    }
}
