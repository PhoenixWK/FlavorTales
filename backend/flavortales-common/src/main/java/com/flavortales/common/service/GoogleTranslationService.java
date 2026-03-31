package com.flavortales.common.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.flavortales.common.config.TranslationProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

/**
 * Translates text using the Google Cloud Translation API v2.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleTranslationService {

    private final TranslationProperties translationProperties;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Translates text from {@code sourceLang} to {@code targetLang}.
     *
     * @param text       Source text to translate
     * @param sourceLang BCP-47 source language code (e.g. "vi")
     * @param targetLang BCP-47 target language code (e.g. "en", "zh")
     * @return Translated text
     */
    public String translate(String text, String sourceLang, String targetLang) {
        String url = translationProperties.getEndpoint() + "?key=" + translationProperties.getApiKey();

        ObjectNode body = objectMapper.createObjectNode();
        body.put("q", text);
        body.put("source", sourceLang);
        body.put("target", targetLang);
        body.put("format", "text");

        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                .build();

            HttpResponse<String> response =
                httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new RuntimeException(
                    "Google Translate API error: HTTP " + response.statusCode()
                    + " – " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String translated = root
                .path("data")
                .path("translations")
                .path(0)
                .path("translatedText")
                .asText(null);

            if (translated == null || translated.isBlank()) {
                throw new RuntimeException(
                    "Google Translate returned empty result for target language: " + targetLang);
            }

            log.info("Google Translate: {} chars ({} → {})", text.length(), sourceLang, targetLang);
            return translated;

        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(
                "Google Translate request failed (" + sourceLang + " → " + targetLang + "): "
                + e.getMessage(), e);
        }
    }
}
