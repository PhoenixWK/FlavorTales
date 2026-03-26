package com.flavortales.audio.service;

import com.flavortales.audio.config.AudioProperties;
import com.flavortales.audio.dto.LanguageTtsResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Orchestrates parallel TTS generation for all supported languages.
 *
 * Flow per request:
 *  1. Vietnamese (vi): synthesise directly — no translation needed.
 *  2. English (en):   translate VI → EN, then synthesise.
 *  3. Chinese  (zh):  translate VI → ZH, then synthesise.
 *
 * All three tasks run concurrently on a dedicated thread pool.
 * A failure in one language does NOT abort the others; all results are
 * collected and returned so the caller can decide what to report.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TtsOrchestrationService {

    private final GoogleCloudTtsService googleCloudTtsService;
    private final GoogleTranslationService translationService;
    private final AudioProperties audioProperties;

    // Dedicated thread pool — one thread per supported language.
    private final ExecutorService executor = Executors.newFixedThreadPool(6);

    /**
     * Generates TTS audio for all supported languages in parallel.
     *
     * @param viText Vietnamese narration text provided by the vendor
     * @return List of {@link LanguageTtsResult} — one entry per language,
     *         order: vi, en, zh
     */
    public List<LanguageTtsResult> generateAllLanguages(String viText) {
        CompletableFuture<LanguageTtsResult> viFuture =
                CompletableFuture.supplyAsync(() -> synthesizeVietnamese(viText), executor);
        CompletableFuture<LanguageTtsResult> enFuture =
                CompletableFuture.supplyAsync(() -> translateThenSynthesize(viText, "en"), executor);
        CompletableFuture<LanguageTtsResult> zhFuture =
                CompletableFuture.supplyAsync(() -> translateThenSynthesize(viText, "zh"), executor);
        CompletableFuture<LanguageTtsResult> koFuture =
                CompletableFuture.supplyAsync(() -> translateThenSynthesize(viText, "ko"), executor);
        CompletableFuture<LanguageTtsResult> ruFuture =
                CompletableFuture.supplyAsync(() -> translateThenSynthesize(viText, "ru"), executor);
        CompletableFuture<LanguageTtsResult> jaFuture =
                CompletableFuture.supplyAsync(() -> translateThenSynthesize(viText, "ja"), executor);

        return List.of(
                safeGet(viFuture, "vi"),
                safeGet(enFuture, "en"),
                safeGet(zhFuture, "zh"),
                safeGet(koFuture, "ko"),
                safeGet(ruFuture, "ru"),
                safeGet(jaFuture, "ja")
        );
    }

    // ── Private per-language tasks ───────────────────────────────────────────

    private LanguageTtsResult synthesizeVietnamese(String text) {
        try {
            AudioProperties.ViTts vi = audioProperties.getViTts();
            byte[] bytes = googleCloudTtsService.synthesize(text, vi.getLanguageCode(), vi.getVoiceName());
            log.info("[TTS-VI] OK – {} bytes", bytes.length);
            return LanguageTtsResult.success("vi", bytes);
        } catch (Exception e) {
            log.warn("[TTS-VI] Failed: {}", e.getMessage());
            return LanguageTtsResult.failure("vi", e.getMessage());
        }
    }

    private LanguageTtsResult translateThenSynthesize(String viText, String targetLang) {
        try {
            String translated = translationService.translate(viText, "vi", targetLang);
            byte[] bytes = synthesizeByLanguage(translated, targetLang);
            log.info("[TTS-{}] OK – {} bytes", targetLang.toUpperCase(), bytes.length);
            return LanguageTtsResult.success(targetLang, bytes);
        } catch (Exception e) {
            log.warn("[TTS-{}] Failed: {}", targetLang.toUpperCase(), e.getMessage());
            return LanguageTtsResult.failure(targetLang, e.getMessage());
        }
    }

    private byte[] synthesizeByLanguage(String text, String language) {
        return switch (language) {
            case "en" -> googleCloudTtsService.synthesize(text);
            case "zh" -> {
                AudioProperties.ZhTts zh = audioProperties.getZhTts();
                yield googleCloudTtsService.synthesize(text, zh.getLanguageCode(), zh.getVoiceName());
            }
            case "ko" -> googleCloudTtsService.synthesizeKorean(text);
            case "ru" -> googleCloudTtsService.synthesizeRussian(text);
            case "ja" -> googleCloudTtsService.synthesizeJapanese(text);
            default -> throw new IllegalArgumentException("Unsupported language: " + language);
        };
    }

    /**
     * Blocks until the future is done and returns its result.
     * If the future itself threw (should not happen since tasks catch internally),
     * wraps the exception in a failure result.
     */
    private LanguageTtsResult safeGet(CompletableFuture<LanguageTtsResult> future, String language) {
        try {
            return future.join();
        } catch (Exception e) {
            log.error("[TTS-{}] Unexpected future failure: {}", language.toUpperCase(), e.getMessage(), e);
            return LanguageTtsResult.failure(language, "Unexpected error: " + e.getMessage());
        }
    }
}
