package com.flavortales.poi.service.translation;

import com.flavortales.common.exception.PoiNotFoundException;
import com.flavortales.poi.dto.PoiTranslationResponse;
import com.flavortales.poi.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Reads persisted translations for a given POI and language.
 */
@Service
@RequiredArgsConstructor
public class PoiTranslationQueryService {

    private final PoiEnglishService englishService;
    private final PoiKoreanService koreanService;
    private final PoiChineseService chineseService;
    private final PoiRussianService russianService;
    private final PoiJapaneseService japaneseService;

    public PoiTranslationResponse getTranslation(Integer poiId, String language) {
        return switch (language.toLowerCase()) {
            case "english", "en" -> toResponse(
                englishService.findByPoiId(poiId).orElseThrow(() -> notFound(poiId, language)),
                "english", "en");
            case "korean", "ko" -> toResponse(
                koreanService.findByPoiId(poiId).orElseThrow(() -> notFound(poiId, language)),
                "korean", "ko");
            case "chinese", "zh" -> toResponse(
                chineseService.findByPoiId(poiId).orElseThrow(() -> notFound(poiId, language)),
                "chinese", "zh");
            case "russian", "ru" -> toResponse(
                russianService.findByPoiId(poiId).orElseThrow(() -> notFound(poiId, language)),
                "russian", "ru");
            case "japanese", "ja" -> toResponse(
                japaneseService.findByPoiId(poiId).orElseThrow(() -> notFound(poiId, language)),
                "japanese", "ja");
            default -> throw new IllegalArgumentException("Unsupported language: " + language);
        };
    }

    private PoiNotFoundException notFound(Integer poiId, String language) {
        return new PoiNotFoundException("No " + language + " translation found for POI " + poiId);
    }

    private PoiTranslationResponse toResponse(PoiEnglish e, String language, String langCode) {
        PoiTranslationResponse r = new PoiTranslationResponse();
        r.setPoiId(e.getPoiId()); r.setLanguage(language); r.setLanguageCode(langCode);
        r.setName(e.getName()); r.setLatitude(e.getLatitude()); r.setLongitude(e.getLongitude());
        r.setRadius(e.getRadius()); r.setAddress(e.getAddress());
        r.setStatus(e.getStatus() != null ? e.getStatus().name() : null);
        r.setLikesCount(e.getLikesCount()); r.setCreatedAt(e.getCreatedAt()); r.setUpdatedAt(e.getUpdatedAt());
        return r;
    }

    private PoiTranslationResponse toResponse(PoiKorean e, String language, String langCode) {
        PoiTranslationResponse r = new PoiTranslationResponse();
        r.setPoiId(e.getPoiId()); r.setLanguage(language); r.setLanguageCode(langCode);
        r.setName(e.getName()); r.setLatitude(e.getLatitude()); r.setLongitude(e.getLongitude());
        r.setRadius(e.getRadius()); r.setAddress(e.getAddress());
        r.setStatus(e.getStatus() != null ? e.getStatus().name() : null);
        r.setLikesCount(e.getLikesCount()); r.setCreatedAt(e.getCreatedAt()); r.setUpdatedAt(e.getUpdatedAt());
        return r;
    }

    private PoiTranslationResponse toResponse(PoiChinese e, String language, String langCode) {
        PoiTranslationResponse r = new PoiTranslationResponse();
        r.setPoiId(e.getPoiId()); r.setLanguage(language); r.setLanguageCode(langCode);
        r.setName(e.getName()); r.setLatitude(e.getLatitude()); r.setLongitude(e.getLongitude());
        r.setRadius(e.getRadius()); r.setAddress(e.getAddress());
        r.setStatus(e.getStatus() != null ? e.getStatus().name() : null);
        r.setLikesCount(e.getLikesCount()); r.setCreatedAt(e.getCreatedAt()); r.setUpdatedAt(e.getUpdatedAt());
        return r;
    }

    private PoiTranslationResponse toResponse(PoiRussian e, String language, String langCode) {
        PoiTranslationResponse r = new PoiTranslationResponse();
        r.setPoiId(e.getPoiId()); r.setLanguage(language); r.setLanguageCode(langCode);
        r.setName(e.getName()); r.setLatitude(e.getLatitude()); r.setLongitude(e.getLongitude());
        r.setRadius(e.getRadius()); r.setAddress(e.getAddress());
        r.setStatus(e.getStatus() != null ? e.getStatus().name() : null);
        r.setLikesCount(e.getLikesCount()); r.setCreatedAt(e.getCreatedAt()); r.setUpdatedAt(e.getUpdatedAt());
        return r;
    }

    private PoiTranslationResponse toResponse(PoiJapanese e, String language, String langCode) {
        PoiTranslationResponse r = new PoiTranslationResponse();
        r.setPoiId(e.getPoiId()); r.setLanguage(language); r.setLanguageCode(langCode);
        r.setName(e.getName()); r.setLatitude(e.getLatitude()); r.setLongitude(e.getLongitude());
        r.setRadius(e.getRadius()); r.setAddress(e.getAddress());
        r.setStatus(e.getStatus() != null ? e.getStatus().name() : null);
        r.setLikesCount(e.getLikesCount()); r.setCreatedAt(e.getCreatedAt()); r.setUpdatedAt(e.getUpdatedAt());
        return r;
    }
}
