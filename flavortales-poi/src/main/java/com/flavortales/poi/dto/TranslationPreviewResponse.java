package com.flavortales.poi.dto;

import com.flavortales.common.dto.ShopLanguageResult;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Combined POI + shop translation preview result stored temporarily in Redis
 * and returned to the frontend for review before submission.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TranslationPreviewResponse {
    private List<PoiLanguageResult>  poiTranslations;
    private List<ShopLanguageResult> shopTranslations;
}
