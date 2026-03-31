package com.flavortales.poi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoiLanguageResult {
    private String language;      // "english" | "korean" | "chinese" | "russian"
    private String languageCode;  // "en" | "ko" | "zh" | "ru"
    private boolean success;
    private String errorMessage;  // English error message if !success
    private String translatedName;
    private String translatedAddress;
}
