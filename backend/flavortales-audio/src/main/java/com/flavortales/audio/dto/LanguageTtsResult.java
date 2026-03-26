package com.flavortales.audio.dto;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Encapsulates the outcome of a single-language TTS synthesis.
 * Either audioBytes is populated (success) or errorMessage is populated (failure).
 */
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class LanguageTtsResult {

    private final String language;
    private final byte[] audioBytes;    // non-null on success
    private final String errorMessage;  // non-null on failure

    public static LanguageTtsResult success(String language, byte[] audioBytes) {
        return new LanguageTtsResult(language, audioBytes, null);
    }

    public static LanguageTtsResult failure(String language, String errorMessage) {
        return new LanguageTtsResult(language, null, errorMessage);
    }

    public boolean isSuccess() {
        return errorMessage == null;
    }
}
