package com.flavortales.audio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TtsRequest {

    @NotBlank(message = "Text content is required")
    @Size(max = 5000, message = "Text must be at most 5000 characters")
    private String text;

    /** Language to synthesize: "vi" (FPT AI) or "en" (Google Cloud TTS) */
    @NotBlank(message = "Language is required")
    @Pattern(regexp = "vi|en", message = "Language must be 'vi' or 'en'")
    private String language;
}
