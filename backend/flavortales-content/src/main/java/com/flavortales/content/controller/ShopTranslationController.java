package com.flavortales.content.controller;

import com.flavortales.common.dto.ApiResponse;
import com.flavortales.common.dto.ShopLanguageResult;
import com.flavortales.content.dto.ShopTranslationResponse;
import com.flavortales.content.service.translation.ShopTranslationOrchestrator;
import com.flavortales.content.service.translation.ShopTranslationQueryService;
import com.flavortales.poi.dto.TranslationPreviewRequest;
import com.flavortales.poi.dto.TranslationPreviewResponse;
import com.flavortales.poi.dto.PoiLanguageResult;
import com.flavortales.poi.service.translation.PoiTranslationOrchestrator;
import com.flavortales.poi.service.translation.TranslationDraftCacheService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints for shop information translation.
 * POST /api/shop/{shopId}/translate          — trigger (re-)translation into all languages
 * GET  /api/shop/{shopId}/translation/{lang} — fetch stored translation
 * POST /api/poi/translate/preview            — translate draft fields for preview (vendor JWT required)
 */
@RestController
@RequiredArgsConstructor
public class ShopTranslationController {

    private final ShopTranslationOrchestrator orchestrator;
    private final PoiTranslationOrchestrator poiOrchestrator;
    private final ShopTranslationQueryService queryService;
    private final TranslationDraftCacheService draftCacheService;

    @PostMapping("/api/shop/{shopId}/translate")
    public ResponseEntity<ApiResponse<List<ShopLanguageResult>>> translate(
            @PathVariable Integer shopId,
            Authentication authentication) {

        List<ShopLanguageResult> results;
        if (authentication != null) {
            TranslationPreviewResponse cached = draftCacheService.get(authentication.getName());
            if (cached != null && cached.getShopTranslations() != null) {
                orchestrator.saveFromResults(shopId, cached.getShopTranslations());
                draftCacheService.delete(authentication.getName());
                results = cached.getShopTranslations();
            } else {
                results = orchestrator.translateAndSave(shopId);
            }
        } else {
            results = orchestrator.translateAndSave(shopId);
        }

        boolean anyFailed = results.stream().anyMatch(r -> !r.isSuccess());
        String message = anyFailed
            ? "Translation completed with some errors"
            : "Translation completed successfully";

        return ResponseEntity.ok(ApiResponse.success(message, results));
    }

    @GetMapping("/api/shop/{shopId}/translation/{lang}")
    public ResponseEntity<ApiResponse<ShopTranslationResponse>> getTranslation(
            @PathVariable Integer shopId,
            @PathVariable String lang) {

        ShopTranslationResponse response = queryService.getTranslation(shopId, lang);
        return ResponseEntity.ok(ApiResponse.success("OK", response));
    }

    /**
     * Translates POI + shop draft fields and caches the result in Redis (TTL 30 min).
     * Requires vendor JWT. URL kept as /api/poi/translate/preview for frontend compatibility.
     */
    @PostMapping("/api/poi/translate/preview")
    public ResponseEntity<ApiResponse<TranslationPreviewResponse>> previewTranslation(
            @Valid @RequestBody TranslationPreviewRequest request,
            Authentication authentication) {

        String vendorEmail = authentication.getName();

        List<PoiLanguageResult> poiResults = poiOrchestrator.translateOnly(
                request.getPoiName(), request.getPoiAddress());
        List<ShopLanguageResult> shopResults = orchestrator.translateOnly(
                request.getShopName(), request.getShopDescription(),
                request.getCuisineStyle(), request.getFeaturedDish());

        TranslationPreviewResponse preview = TranslationPreviewResponse.builder()
                .poiTranslations(poiResults)
                .shopTranslations(shopResults)
                .build();

        draftCacheService.save(vendorEmail, preview);

        boolean anyFailed = poiResults.stream().anyMatch(r -> !r.isSuccess())
                         || shopResults.stream().anyMatch(r -> !r.isSuccess());
        String message = anyFailed ? "Preview completed with some errors" : "Preview completed successfully";

        return ResponseEntity.ok(ApiResponse.success(message, preview));
    }
}
