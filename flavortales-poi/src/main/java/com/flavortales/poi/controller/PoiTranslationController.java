package com.flavortales.poi.controller;

import com.flavortales.common.dto.ApiResponse;
import com.flavortales.common.exception.PoiNotFoundException;
import com.flavortales.poi.dto.PoiLanguageResult;
import com.flavortales.poi.dto.TranslationPreviewResponse;
import com.flavortales.poi.dto.PoiTranslationResponse;
import com.flavortales.poi.entity.Poi;
import com.flavortales.poi.repository.PoiRepository;
import com.flavortales.poi.service.translation.PoiTranslationOrchestrator;
import com.flavortales.poi.service.translation.PoiTranslationQueryService;
import com.flavortales.poi.service.translation.TranslationDraftCacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints for POI information translation.
 * POST /api/poi/{poiId}/translate          — trigger (re-)translation into all languages
 * GET  /api/poi/{poiId}/translation/{lang} — fetch stored translation
 *
 * Note: POST /api/poi/translate/preview is hosted in ShopTranslationController (flavortales-content)
 * because it also calls ShopTranslationOrchestrator; content already depends on poi.
 */
@RestController
@RequestMapping("/api/poi")
@RequiredArgsConstructor
public class PoiTranslationController {

    private final PoiRepository poiRepository;
    private final PoiTranslationOrchestrator poiOrchestrator;
    private final PoiTranslationQueryService queryService;
    private final TranslationDraftCacheService draftCacheService;

    @PostMapping("/{poiId}/translate")
    public ResponseEntity<ApiResponse<List<PoiLanguageResult>>> translate(
            @PathVariable Integer poiId,
            Authentication authentication) {

        Poi poi = poiRepository.findById(poiId)
            .orElseThrow(() -> new PoiNotFoundException("POI not found: " + poiId));

        List<PoiLanguageResult> results;
        if (authentication != null) {
            TranslationPreviewResponse cached = draftCacheService.get(authentication.getName());
            if (cached != null && cached.getPoiTranslations() != null) {
                poiOrchestrator.saveFromResults(poi, cached.getPoiTranslations());
                results = cached.getPoiTranslations();
            } else {
                results = poiOrchestrator.translateAndSave(poi);
            }
        } else {
            results = poiOrchestrator.translateAndSave(poi);
        }

        boolean anyFailed = results.stream().anyMatch(r -> !r.isSuccess());
        String message = anyFailed
            ? "Translation completed with some errors"
            : "Translation completed successfully";

        return ResponseEntity.ok(ApiResponse.success(message, results));
    }

    @GetMapping("/{poiId}/translation/{lang}")
    public ResponseEntity<ApiResponse<PoiTranslationResponse>> getTranslation(
            @PathVariable Integer poiId,
            @PathVariable String lang) {

        PoiTranslationResponse response = queryService.getTranslation(poiId, lang);
        return ResponseEntity.ok(ApiResponse.success("OK", response));
    }
}
