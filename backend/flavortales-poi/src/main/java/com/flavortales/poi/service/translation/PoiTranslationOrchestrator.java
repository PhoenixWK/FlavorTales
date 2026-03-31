package com.flavortales.poi.service.translation;

import com.flavortales.common.service.GoogleTranslationService;
import com.flavortales.poi.dto.PoiLanguageResult;
import com.flavortales.poi.entity.Poi;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

/**
 * Translates POI name and address into all 4 supported languages in parallel.
 * Each language is independent: failure in one does not affect others.
 */
@Service
@Slf4j
public class PoiTranslationOrchestrator {

    private static final String SOURCE_LANG = "vi";

    private final GoogleTranslationService translationService;
    private final PoiEnglishService englishService;
    private final PoiKoreanService koreanService;
    private final PoiChineseService chineseService;
    private final PoiRussianService russianService;
    private final PoiJapaneseService japaneseService;
    private final Executor taskExecutor;

    public PoiTranslationOrchestrator(
            GoogleTranslationService translationService,
            PoiEnglishService englishService,
            PoiKoreanService koreanService,
            PoiChineseService chineseService,
            PoiRussianService russianService,
            PoiJapaneseService japaneseService,
            @Qualifier("applicationTaskExecutor") Executor taskExecutor) {
        this.translationService = translationService;
        this.englishService = englishService;
        this.koreanService = koreanService;
        this.chineseService = chineseService;
        this.russianService = russianService;
        this.japaneseService = japaneseService;
        this.taskExecutor = taskExecutor;
    }

    /**
     * Translates and persists the POI into all supported languages in parallel.
     * Returns a result list; entries with {@code success=false} carry the English error message.
     * Does NOT throw even if all translations fail.
     */
    public List<PoiLanguageResult> translateAndSave(Poi poi) {
        CompletableFuture<PoiLanguageResult> enFuture =
            CompletableFuture.supplyAsync(() -> translate(poi, "english", "en"), taskExecutor);
        CompletableFuture<PoiLanguageResult> koFuture =
            CompletableFuture.supplyAsync(() -> translate(poi, "korean", "ko"), taskExecutor);
        CompletableFuture<PoiLanguageResult> zhFuture =
            CompletableFuture.supplyAsync(() -> translate(poi, "chinese", "zh"), taskExecutor);
        CompletableFuture<PoiLanguageResult> ruFuture =
            CompletableFuture.supplyAsync(() -> translate(poi, "russian", "ru"), taskExecutor);
        CompletableFuture<PoiLanguageResult> jaFuture =
            CompletableFuture.supplyAsync(() -> translate(poi, "japanese", "ja"), taskExecutor);

        return List.of(
            enFuture.join(),
            koFuture.join(),
            zhFuture.join(),
            ruFuture.join(),
            jaFuture.join()
        );
    }

    private PoiLanguageResult translate(Poi poi, String language, String langCode) {
        try {
            String translatedName = translationService.translate(poi.getName(), SOURCE_LANG, langCode);
            String translatedAddress = poi.getAddress() != null && !poi.getAddress().isBlank()
                ? translationService.translate(poi.getAddress(), SOURCE_LANG, langCode)
                : null;

            persist(language, poi, translatedName, translatedAddress);

            return PoiLanguageResult.builder()
                .language(language)
                .languageCode(langCode)
                .success(true)
                .translatedName(translatedName)
                .translatedAddress(translatedAddress)
                .build();
        } catch (Exception e) {
            log.error("POI translation failed for language '{}' (poiId={}): {}", language, poi.getPoiId(), e.getMessage());
            return PoiLanguageResult.builder()
                .language(language)
                .languageCode(langCode)
                .success(false)
                .errorMessage("Translation to " + language + " failed: " + e.getMessage())
                .build();
        }
    }

    private void persist(String language, Poi poi, String name, String address) {
        switch (language) {
            case "english" -> englishService.upsert(poi, name, address);
            case "korean"  -> koreanService.upsert(poi, name, address);
            case "chinese" -> chineseService.upsert(poi, name, address);
            case "russian"  -> russianService.upsert(poi, name, address);
            case "japanese" -> japaneseService.upsert(poi, name, address);
            default -> throw new IllegalArgumentException("Unknown language: " + language);
        }
    }
}
