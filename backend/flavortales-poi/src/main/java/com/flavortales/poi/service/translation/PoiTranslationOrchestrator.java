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
import java.util.function.Function;

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
        return runInParallel(lang -> translateAndPersist(poi, lang));
    }

    /**
     * Translates POI name and address without persisting to the database.
     * Used for preview before the vendor submits the form.
     */
    public List<PoiLanguageResult> translateOnly(String name, String address) {
        return runInParallel(lang -> translateFields(name, address, lang));
    }

    private List<PoiLanguageResult> runInParallel(
            java.util.function.Function<String[], PoiLanguageResult> task) {
        record LangPair(String name, String code) {}
        var langs = List.of(
            new LangPair("english", "en"),
            new LangPair("korean",  "ko"),
            new LangPair("chinese", "zh"),
            new LangPair("russian", "ru"),
            new LangPair("japanese","ja")
        );
        var futures = langs.stream()
            .map(l -> CompletableFuture.supplyAsync(
                    () -> task.apply(new String[]{l.name(), l.code()}), taskExecutor))
            .toList();
        return futures.stream().map(CompletableFuture::join).toList();
    }

    private PoiLanguageResult translateAndPersist(Poi poi, String[] lang) {
        String language = lang[0];
        String langCode = lang[1];
        try {
            String translatedName    = translationService.translate(poi.getName(), SOURCE_LANG, langCode);
            String translatedAddress = poi.getAddress() != null && !poi.getAddress().isBlank()
                ? translationService.translate(poi.getAddress(), SOURCE_LANG, langCode) : null;
            persist(language, poi, translatedName, translatedAddress);
            return PoiLanguageResult.builder()
                .language(language).languageCode(langCode).success(true)
                .translatedName(translatedName).translatedAddress(translatedAddress).build();
        } catch (Exception e) {
            log.error("POI translation failed for language '{}' (poiId={}): {}", language, poi.getPoiId(), e.getMessage());
            return PoiLanguageResult.builder()
                .language(language).languageCode(langCode).success(false)
                .errorMessage("Translation to " + language + " failed: " + e.getMessage()).build();
        }
    }

    private PoiLanguageResult translateFields(String name, String address, String[] lang) {
        String language = lang[0];
        String langCode = lang[1];
        try {
            String translatedName    = translationService.translate(name, SOURCE_LANG, langCode);
            String translatedAddress = address != null && !address.isBlank()
                ? translationService.translate(address, SOURCE_LANG, langCode) : null;
            return PoiLanguageResult.builder()
                .language(language).languageCode(langCode).success(true)
                .translatedName(translatedName).translatedAddress(translatedAddress).build();
        } catch (Exception e) {
            log.error("POI preview translation failed for language '{}': {}", language, e.getMessage());
            return PoiLanguageResult.builder()
                .language(language).languageCode(langCode).success(false)
                .errorMessage("Translation to " + language + " failed: " + e.getMessage()).build();
        }
    }

    /**
     * Persists pre-translated results (e.g. from Redis cache) without calling Google API.
     */
    public void saveFromResults(Poi poi, List<PoiLanguageResult> results) {
        for (PoiLanguageResult r : results) {
            if (r.isSuccess()) {
                try {
                    persist(r.getLanguage(), poi, r.getTranslatedName(), r.getTranslatedAddress());
                } catch (Exception e) {
                    log.error("Failed to persist cached POI translation lang={} poiId={}: {}",
                              r.getLanguage(), poi.getPoiId(), e.getMessage());
                }
            }
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
