package com.flavortales.poi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request body for POST /api/poi/translate/preview.
 * Carries POI and shop fields that need translation before the vendor submits.
 */
@Data
public class TranslationPreviewRequest {

    @NotBlank
    @Size(max = 200)
    private String poiName;

    @Size(max = 500)
    private String poiAddress;

    @NotBlank
    @Size(max = 200)
    private String shopName;

    @Size(max = 1000)
    private String shopDescription;

    @Size(max = 200)
    private String cuisineStyle;

    @Size(max = 200)
    private String featuredDish;
}
