package com.flavortales.poi.controller;

import com.flavortales.common.dto.ApiResponse;
import com.flavortales.common.exception.PoiNotFoundException;
import com.flavortales.poi.dto.PoiLanguageResult;
import com.flavortales.poi.dto.PoiTranslationResponse;
import com.flavortales.poi.entity.Poi;
import com.flavortales.poi.repository.PoiRepository;
import com.flavortales.poi.service.translation.PoiTranslationOrchestrator;
import com.flavortales.poi.service.translation.PoiTranslationQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints for POI information translation.
 * POST /api/poi/{poiId}/translate  — trigger (re-)translation into all languages
 * GET  /api/poi/{poiId}/translation/{lang} — fetch stored translation
 */
@RestController
@RequestMapping("/api/poi")
@RequiredArgsConstructor
public class PoiTranslationController {

    private final PoiRepository poiRepository;
    private final PoiTranslationOrchestrator orchestrator;
    private final PoiTranslationQueryService queryService;

    @PostMapping("/{poiId}/translate")
    public ResponseEntity<ApiResponse<List<PoiLanguageResult>>> translate(
            @PathVariable Integer poiId) {

        Poi poi = poiRepository.findById(poiId)
            .orElseThrow(() -> new PoiNotFoundException("POI not found: " + poiId));

        List<PoiLanguageResult> results = orchestrator.translateAndSave(poi);
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
