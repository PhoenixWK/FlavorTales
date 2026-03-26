package com.flavortales.audio.service;

import com.flavortales.audio.config.AudioProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleCloudTtsService {

    private final AudioProperties audioProperties;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** Default synthesis using configured English voice. */
    public byte[] synthesize(String text) {
        AudioProperties.GoogleTts cfg = audioProperties.getGoogleTts();
        return synthesize(text, cfg.getLanguageCode(), cfg.getVoiceName());
    }

    public byte[] synthesizeKorean(String text) {
        AudioProperties.KoTts ko = audioProperties.getKoTts();
        return synthesize(text, ko.getLanguageCode(), ko.getVoiceName());
    }

    public byte[] synthesizeRussian(String text) {
        AudioProperties.RuTts ru = audioProperties.getRuTts();
        return synthesize(text, ru.getLanguageCode(), ru.getVoiceName());
    }

    public byte[] synthesizeJapanese(String text) {
        AudioProperties.JaTts ja = audioProperties.getJaTts();
        return synthesize(text, ja.getLanguageCode(), ja.getVoiceName());
    }

    /**
     * Core synthesis. Supports any BCP-47 language code accepted by Google Cloud TTS.
     *
     * @param text         Narration text in the target language
     * @param languageCode BCP-47 language code (e.g. "vi-VN", "zh-CN", "ko-KR")
     * @param voiceName    Google TTS voice name
     * @return Raw MP3 audio bytes
     */
    public byte[] synthesize(String text, String languageCode, String voiceName) {
        AudioProperties.GoogleTts cfg = audioProperties.getGoogleTts();
        String url = cfg.getEndpoint() + "?key=" + cfg.getApiKey();

        ObjectNode body = objectMapper.createObjectNode();
        body.putObject("input").put("text", text);

        ObjectNode voice = body.putObject("voice");
        voice.put("languageCode", languageCode);
        voice.put("name", voiceName);

        body.putObject("audioConfig").put("audioEncoding", "MP3");

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
                        "Google Cloud TTS API error: HTTP " + response.statusCode()
                                + " - " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String audioContent = root.path("audioContent").asText();
            if (audioContent == null || audioContent.isBlank()) {
                throw new RuntimeException("Google Cloud TTS returned empty audioContent");
            }

            byte[] mp3Bytes = Base64.getMimeDecoder().decode(audioContent);
            if (mp3Bytes.length < 1024) {
                throw new RuntimeException(
                        "Google Cloud TTS returned suspiciously small audio: " + mp3Bytes.length + " bytes");
            }
            if (!startsWithAudioHeader(mp3Bytes)) {
                throw new RuntimeException(
                        "Google Cloud TTS response did not decode to a valid MP3 file");
            }
            log.info("TTS synthesized {} bytes for lang={}, chars={}", mp3Bytes.length, languageCode, text.length());
            return mp3Bytes;

        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Google Cloud TTS request failed: " + e.getMessage(), e);
        }
    }

    private boolean startsWithAudioHeader(byte[] bytes) {
        if (bytes.length < 3) return false;
        if (bytes[0] == 0x49 && bytes[1] == 0x44 && bytes[2] == 0x33) return true;
        if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xE0) == 0xE0) return true;
        return false;
    }
}