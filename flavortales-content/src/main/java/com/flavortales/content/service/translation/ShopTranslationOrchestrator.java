package com.flavortales.content.service.translation;

import com.flavortales.common.dto.ShopLanguageResult;
import com.flavortales.common.service.GoogleTranslationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

/**
 * Translates Shop translatable fields into all 4 supported languages in parallel.
 * Each language is independent: failure in one does not affect others.
 */
@Service
@Slf4j
public class ShopTranslationOrchestrator {

    private static final String SOURCE_LANG = "vi";

    private final GoogleTranslationService translationService;
    private final ShopEnglishService englishService;
    private final ShopKoreanService koreanService;
    private final ShopChineseService chineseService;
    private final ShopRussianService russianService;
    private final ShopJapaneseService japaneseService;
    private final JdbcTemplate jdbcTemplate;
    private final Executor taskExecutor;

    public ShopTranslationOrchestrator(
            GoogleTranslationService translationService,
            ShopEnglishService englishService,
            ShopKoreanService koreanService,
            ShopChineseService chineseService,
            ShopRussianService russianService,
            ShopJapaneseService japaneseService,
            JdbcTemplate jdbcTemplate,
            @Qualifier("applicationTaskExecutor") Executor taskExecutor) {
        this.translationService = translationService;
        this.englishService = englishService;
        this.koreanService = koreanService;
        this.chineseService = chineseService;
        this.russianService = russianService;
        this.japaneseService = japaneseService;
        this.jdbcTemplate = jdbcTemplate;
        this.taskExecutor = taskExecutor;
    }

    /**
     * Translates and persists shop data into all supported languages in parallel.
     * Returns a result list; entries with {@code success=false} carry the English error message.
     */
    public List<ShopLanguageResult> translateAndSave(Integer shopId) {
        Map<String, Object> shop = jdbcTemplate.queryForMap(
            "SELECT name, description, cuisine_style, featured_dish FROM shop WHERE shop_id = ?",
            shopId);
        String name         = (String) shop.get("name");
        String description  = (String) shop.get("description");
        String cuisineStyle = (String) shop.get("cuisine_style");
        String featuredDish = (String) shop.get("featured_dish");
        return translateOnly(name, description, cuisineStyle, featuredDish, shopId);
    }

    /**
     * Translates shop fields without persisting to the database.
     * Used for preview before the vendor submits the form.
     */
    public List<ShopLanguageResult> translateOnly(String name, String description,
                                                   String cuisineStyle, String featuredDish) {
        return translateOnly(name, description, cuisineStyle, featuredDish, null);
    }

    private List<ShopLanguageResult> translateOnly(String name, String description,
                                                    String cuisineStyle, String featuredDish,
                                                    Integer shopId) {
        record LangPair(String n, String c) {}
        var langs = List.of(
            new LangPair("english",  "en"),
            new LangPair("korean",   "ko"),
            new LangPair("chinese",  "zh"),
            new LangPair("russian",  "ru"),
            new LangPair("japanese", "ja")
        );
        var futures = langs.stream()
            .map(l -> CompletableFuture.supplyAsync(
                () -> translate(shopId, l.n(), l.c(), name, description, cuisineStyle, featuredDish),
                taskExecutor))
            .toList();
        return futures.stream().map(CompletableFuture::join).toList();
    }

    private ShopLanguageResult translate(Integer shopId, String language, String langCode,
                                         String name, String description,
                                         String cuisineStyle, String featuredDish) {
        try {
            String tName    = translate(name, langCode);
            String tDesc    = translate(description, langCode);
            String tCuisine = translate(cuisineStyle, langCode);
            String tDish    = translate(featuredDish, langCode);

            if (shopId != null) persist(language, shopId, tName, tDesc, tCuisine, tDish);

            return ShopLanguageResult.builder()
                .language(language).languageCode(langCode).success(true)
                .translatedName(tName).translatedDescription(tDesc)
                .translatedCuisineStyle(tCuisine).translatedFeaturedDish(tDish)
                .build();
        } catch (Exception e) {
            log.error("Shop translation failed for language '{}' (shopId={}): {}", language, shopId, e.getMessage());
            return ShopLanguageResult.builder()
                .language(language).languageCode(langCode).success(false)
                .errorMessage("Translation to " + language + " failed: " + e.getMessage())
                .build();
        }
    }

    /**
     * Persists pre-translated results (e.g. from Redis cache) without calling Google API.
     */
    public void saveFromResults(Integer shopId, List<ShopLanguageResult> results) {
        for (ShopLanguageResult r : results) {
            if (r.isSuccess()) {
                try {
                    persist(r.getLanguage(), shopId,
                            r.getTranslatedName(), r.getTranslatedDescription(),
                            r.getTranslatedCuisineStyle(), r.getTranslatedFeaturedDish());
                } catch (Exception e) {
                    log.error("Failed to persist cached shop translation lang={} shopId={}: {}",
                              r.getLanguage(), shopId, e.getMessage());
                }
            }
        }
    }

    private String translate(String text, String targetLang) {
        if (text == null || text.isBlank()) return text;
        return translationService.translate(text, SOURCE_LANG, targetLang);
    }

    private void persist(String language, Integer shopId, String name, String description,
                         String cuisineStyle, String featuredDish) {
        switch (language) {
            case "english" -> englishService.upsert(shopId, name, description, cuisineStyle, featuredDish);
            case "korean"  -> koreanService.upsert(shopId, name, description, cuisineStyle, featuredDish);
            case "chinese" -> chineseService.upsert(shopId, name, description, cuisineStyle, featuredDish);
            case "russian"  -> russianService.upsert(shopId, name, description, cuisineStyle, featuredDish);
            case "japanese" -> japaneseService.upsert(shopId, name, description, cuisineStyle, featuredDish);
            default -> throw new IllegalArgumentException("Unknown language: " + language);
        }
    }
}
