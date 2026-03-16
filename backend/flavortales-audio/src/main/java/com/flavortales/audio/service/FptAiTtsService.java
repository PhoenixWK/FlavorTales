package com.flavortales.audio.service;

import com.flavortales.audio.config.AudioProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

/**
 * Calls FPT AI Voice Maker API to generate Vietnamese TTS audio.
 * API docs: https://fpt.ai/vi/tts
 *
 * Flow:
 *  1. POST text to FPT AI → receive JSON with "async" URL
 *  2. Poll the async URL until the MP3 is ready
 *  3. Return the raw MP3 bytes
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FptAiTtsService {

    private final AudioProperties audioProperties;
    // Follow redirects: FPT AI CDN may return 301/302 to the actual MP3 file.
    // The default HttpClient.newHttpClient() uses Redirect.NEVER, which would
    // cause the polling loop to never receive the audio body.
    private final HttpClient httpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final long INITIAL_DELAY_MS = 5_000;
    private static final long POLL_INTERVAL_MS = 3_000;
    private static final int MIN_AUDIO_BYTES = 1024;  // MP3 hợp lệ ít nhất ~1 KB
    /** Giới hạn số lần thử để tránh loop vô hạn (5 s + 100 × 3 s ≈ 5 phút). */
    private static final int MAX_POLL_ATTEMPTS = 100;

    public byte[] synthesize(String text) {
        AudioProperties.FptAi cfg = audioProperties.getFptAi();

        HttpRequest ttsRequest = HttpRequest.newBuilder()
                .uri(URI.create(cfg.getEndpoint()))
                .header("api-key", cfg.getApiKey())
                .header("voice", cfg.getVoice())
                .header("speed", String.valueOf(cfg.getSpeed()))
                .header("Return-Type", "url")
                .header("Content-Type", "text/plain; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(text, StandardCharsets.UTF_8))
                .build();

        log.info("[FPT AI] Submitting TTS – textLength={}", text.length());

        try {
            HttpResponse<String> ttsResponse =
                    httpClient.send(ttsRequest, HttpResponse.BodyHandlers.ofString());

            if (ttsResponse.statusCode() != 200) {
                throw new RuntimeException(
                        "FPT AI TTS API error: HTTP " + ttsResponse.statusCode()
                                + " – " + ttsResponse.body());
            }

            JsonNode root = objectMapper.readTree(ttsResponse.body());
            int errorCode = root.path("error").asInt(-1);
            if (errorCode != 0) {
                throw new RuntimeException(
                        "FPT AI TTS error code " + errorCode + ": " + root.path("message").asText());
            }

            String asyncUrl = root.path("async").asText();
            if (asyncUrl == null || asyncUrl.isBlank()) {
                throw new RuntimeException("FPT AI returned no async URL");
            }

            return downloadWithRetry(asyncUrl);

        } catch (IOException | InterruptedException e) {
            // Do NOT call Thread.currentThread().interrupt() here.
            // The Tomcat NIO handler thread must remain in a clean, non-interrupted state
            // so that subsequent socket writes (the HTTP response) succeed.
            // ClosedByInterruptException from SocketChannel.write() is the symptom of
            // calling interrupt() here, causing the full filter-chain trace to appear in logs.
            String kind = e.getClass().getSimpleName();
            throw new RuntimeException("FPT AI TTS request failed (" + kind + "): " + e.getMessage(), e);
        }
    }

    private byte[] downloadWithRetry(String url) throws IOException, InterruptedException {
        log.debug("[FPT AI] Waiting {}ms before first poll: {}", INITIAL_DELAY_MS, url);
        Thread.sleep(INITIAL_DELAY_MS);

        int attempt = 0;
        while (attempt < MAX_POLL_ATTEMPTS) {
            attempt++;
            HttpResponse<byte[]> response = httpClient.send(
                    HttpRequest.newBuilder().uri(URI.create(url)).GET().build(),
                    HttpResponse.BodyHandlers.ofByteArray());

            int status = response.statusCode();

            // Phân loại lỗi — không retry với lỗi vĩnh viễn
            if (status == 403 || status == 401) {
                throw new RuntimeException("FPT AI CDN access denied (HTTP " + status + "): " + url);
            }
            if (status == 429) {
                throw new RuntimeException("FPT AI CDN rate-limited (HTTP 429). Vui lòng thử lại sau.");
            }
            if (status >= 500) {
                throw new RuntimeException("FPT AI CDN server error (HTTP " + status + "): " + url);
            }

            // Validate body thực sự là audio, không phải HTML/empty
            if (status == 200) {
                byte[] body = response.body();
                String contentType = response.headers()
                        .firstValue("Content-Type").orElse("").toLowerCase();

                boolean isAudioContent = contentType.contains("audio")
                        || contentType.contains("octet-stream")
                        || contentType.contains("mpeg");

                boolean isMp3Magic = body.length > 3 && startsWithMp3Header(body);

                if (body.length >= MIN_AUDIO_BYTES && (isAudioContent || isMp3Magic)) {
                    log.info("[FPT AI] Audio ready – {} bytes (attempt {})", body.length, attempt);
                    return body;
                }

                // 200 nhưng body không hợp lệ → CDN trả HTML/empty, tiếp tục retry
                log.warn("[FPT AI] HTTP 200 but invalid body – size={}, contentType={} (attempt {})",
                        body.length, contentType, attempt);
            } else {
                // Bao gồm cả 3xx nếu followRedirects bị tắt, 404 (chưa sẵn sàng), v.v.
                log.debug("[FPT AI] Not ready (HTTP {}, attempt {}/{}), retrying in {}ms…",
                        status, attempt, MAX_POLL_ATTEMPTS, POLL_INTERVAL_MS);
            }

            Thread.sleep(POLL_INTERVAL_MS);
        }

        throw new RuntimeException(
                "FPT AI TTS timed out after " + MAX_POLL_ATTEMPTS + " polling attempts (~"
                + (INITIAL_DELAY_MS + (long) MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000 + "s). "
                + "URL: " + url);
    }

    /**
     * Kiểm tra MP3 magic bytes: ID3 header hoặc MPEG frame sync
     * ID3v2: 0x49 0x44 0x33 ("ID3")
     * MPEG frame: 0xFF 0xFB / 0xFF 0xFA / 0xFF 0xF3
     */
    private boolean startsWithMp3Header(byte[] bytes) {
        if (bytes.length < 3) return false;

        // ID3 tag header
        if (bytes[0] == 0x49 && bytes[1] == 0x44 && bytes[2] == 0x33) return true;

        // MPEG sync word
        if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xE0) == 0xE0) return true;

        return false;
    }
}