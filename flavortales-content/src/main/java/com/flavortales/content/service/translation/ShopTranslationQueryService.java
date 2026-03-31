package com.flavortales.content.service.translation;

import com.flavortales.content.dto.ShopTranslationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Reads persisted translations for a given shop and language.
 */
@Service
@RequiredArgsConstructor
public class ShopTranslationQueryService {

    private final ShopEnglishService englishService;
    private final ShopKoreanService koreanService;
    private final ShopChineseService chineseService;
    private final ShopRussianService russianService;
    private final ShopJapaneseService japaneseService;

    public ShopTranslationResponse getTranslation(Integer shopId, String language) {
        return switch (language.toLowerCase()) {
            case "english", "en" -> englishService.findByShopId(shopId)
                .orElseThrow(() -> notFound(shopId, language));
            case "korean", "ko" -> koreanService.findByShopId(shopId)
                .orElseThrow(() -> notFound(shopId, language));
            case "chinese", "zh" -> chineseService.findByShopId(shopId)
                .orElseThrow(() -> notFound(shopId, language));
            case "russian", "ru" -> russianService.findByShopId(shopId)
                .orElseThrow(() -> notFound(shopId, language));
            case "japanese", "ja" -> japaneseService.findByShopId(shopId)
                .orElseThrow(() -> notFound(shopId, language));
            default -> throw new IllegalArgumentException("Unsupported language: " + language);
        };
    }

    private IllegalArgumentException notFound(Integer shopId, String language) {
        return new IllegalArgumentException(
            "No " + language + " translation found for shop " + shopId);
    }
}
