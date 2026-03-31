package com.flavortales.content.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopLanguageResult {
    private String language;
    private String languageCode;
    private boolean success;
    private String errorMessage;
    private String translatedName;
    private String translatedDescription;
    private String translatedCuisineStyle;
    private String translatedFeaturedDish;
}
