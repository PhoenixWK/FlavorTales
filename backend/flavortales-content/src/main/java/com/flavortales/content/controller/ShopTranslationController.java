package com.flavortales.content.controller;

import com.flavortales.common.dto.ApiResponse;
import com.flavortales.content.dto.ShopLanguageResult;
import com.flavortales.content.dto.ShopTranslationResponse;
import com.flavortales.content.service.translation.ShopTranslationOrchestrator;
import com.flavortales.content.service.translation.ShopTranslationQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints for shop information translation.
 * POST /api/shop/{shopId}/translate       — trigger (re-)translation into all languages
 * GET  /api/shop/{shopId}/translation/{lang} — fetch stored translation
 */
@RestController
@RequestMapping("/api/shop")
@RequiredArgsConstructor
public class ShopTranslationController {

    private final ShopTranslationOrchestrator orchestrator;
    private final ShopTranslationQueryService queryService;

    @PostMapping("/{shopId}/translate")
    public ResponseEntity<ApiResponse<List<ShopLanguageResult>>> translate(
            @PathVariable Integer shopId) {

        List<ShopLanguageResult> results = orchestrator.translateAndSave(shopId);
        boolean anyFailed = results.stream().anyMatch(r -> !r.isSuccess());
        String message = anyFailed
            ? "Translation completed with some errors"
            : "Translation completed successfully";

        return ResponseEntity.ok(ApiResponse.success(message, results));
    }

    @GetMapping("/{shopId}/translation/{lang}")
    public ResponseEntity<ApiResponse<ShopTranslationResponse>> getTranslation(
            @PathVariable Integer shopId,
            @PathVariable String lang) {

        ShopTranslationResponse response = queryService.getTranslation(shopId, lang);
        return ResponseEntity.ok(ApiResponse.success("OK", response));
    }
}
