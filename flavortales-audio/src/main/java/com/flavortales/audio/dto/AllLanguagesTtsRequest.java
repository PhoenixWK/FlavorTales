package com.flavortales.audio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request body for the /tts/preview-all endpoint.
 * Vendor provides Vietnamese text only; the backend translates and synthesises
 * all supported languages in parallel.
 */
@Data
public class AllLanguagesTtsRequest {

    @NotBlank(message = "Vietnamese text is required")
    @Size(max = 5000, message = "Text must be at most 5000 characters")
    private String text;
}
