package com.flavortales.audio.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Response from the /tts/preview-all endpoint.
 * audioBase64 contains base64-encoded MP3 bytes keyed by language code.
 * errors lists languages that could not be synthesised, with their error messages.
 */
@Data
@Builder
public class AllLanguagesTtsResponse {

    /** language code → Base64-encoded MP3 bytes (only for languages that succeeded). */
    private Map<String, String> audioBase64;

    /** Languages that failed synthesis, with human-readable error messages. */
    private List<TtsError> errors;

    @Data
    @Builder
    public static class TtsError {
        private String language;
        private String message;
    }
}
