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

/**
 * Calls Google Cloud Text-to-Speech REST API to generate English audio.
 * API reference: https://cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize
 *
 * Uses API key authentication (no service account needed).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleCloudTtsService {

    private final AudioProperties audioProperties;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Converts English text to MP3 bytes via Google Cloud TTS.
     * Uses the configured default English voice.
     *
     * @param text English narration text
     * @return Raw MP3 audio bytes
     */
    public byte[] synthesize(String text) {
        AudioProperties.GoogleTts cfg = audioProperties.getGoogleTts();
        return synthesize(text, cfg.getLanguageCode(), cfg.getVoiceName());
    }

    /**
     * Converts text to MP3 bytes via Google Cloud TTS with an explicit language/voice.
     * Supports any BCP-47 language code accepted by Google Cloud TTS
     * (e.g. "en-US", "zh-CN", "ja-JP").
     *
     * @param text         Narration text in the target language
     * @param languageCode BCP-47 language code (e.g. "zh-CN")
     * @param voiceName    Google TTS voice name (e.g. "cmn-CN-Wavenet-A")
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
                                + " – " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String audioContent = root.path("audioContent").asText();
            if (audioContent == null || audioContent.isBlank()) {
                throw new RuntimeException("Google Cloud TTS returned empty audioContent");
            }

            // Use getMimeDecoder() to tolerate any whitespace/newlines Google may
            // embed in the base64 response (standard getDecoder() rejects them).
            byte[] mp3Bytes = Base64.getMimeDecoder().decode(audioContent);
            if (mp3Bytes.length < 1024) {
                throw new RuntimeException(
                        "Google Cloud TTS returned suspiciously small audio: " + mp3Bytes.length + " bytes");
            }
            if (!startsWithAudioHeader(mp3Bytes)) {
                throw new RuntimeException(
                        "Google Cloud TTS response did not decode to a valid MP3 file");
            }
            log.info("Google Cloud TTS synthesized {} bytes for text length {}", mp3Bytes.length, text.length());
            return mp3Bytes;

        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Google Cloud TTS request failed: " + e.getMessage(), e);
        }
    }

    /**
     * Validates that the decoded bytes start with an MP3 magic-byte sequence.
     * ID3v2 header:   0x49 0x44 0x33 ("ID3")
     * MPEG sync word: 0xFF 0xEX (sync bits in second byte)
     */
    private boolean startsWithAudioHeader(byte[] bytes) {
        if (bytes.length < 3) return false;
        // ID3 tag
        if (bytes[0] == 0x49 && bytes[1] == 0x44 && bytes[2] == 0x33) return true;
        // MPEG frame sync
        if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xE0) == 0xE0) return true;
        return false;
    }
}
