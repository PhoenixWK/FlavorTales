package com.flavortales.audio.controller;

import com.flavortales.audio.dto.AllLanguagesTtsRequest;
import com.flavortales.audio.dto.AllLanguagesTtsResponse;
import com.flavortales.audio.dto.AudioResponse;
import com.flavortales.audio.dto.LanguageTtsResult;
import com.flavortales.audio.dto.TtsRequest;
import com.flavortales.audio.dto.TtsResponse;
import com.flavortales.audio.service.AudioService;
import com.flavortales.audio.service.TtsOrchestrationService;
import com.flavortales.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/audio")
@RequiredArgsConstructor
@Slf4j
public class AudioController {

    private final AudioService audioService;
    private final TtsOrchestrationService ttsOrchestrationService;

    /**
     * POST /api/audio/tts
     * Generates audio from text for the requested language via Google Cloud TTS,
     * uploads the file to Cloudflare R2, and returns the file ID + URL.
     */
    @PostMapping("/tts")
    public ResponseEntity<ApiResponse<TtsResponse>> generateTts(
            @Valid @RequestBody TtsRequest request,
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_vendor")) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Only vendors can generate audio"));
        }

        String vendorEmail = authentication.getName();
        TtsResponse ttsResponse = audioService.generateSingleAudio(request, vendorEmail);
        return ResponseEntity.ok(ApiResponse.success("Audio generated successfully", ttsResponse));
    }

    /**
     * POST /api/audio/tts/preview-all
     * Accepts Vietnamese text, auto-translates to all supported languages (en, zh),
     * generates TTS for all languages in parallel via Google Cloud TTS, and returns
     * base64-encoded MP3 bytes per language.
     *
     * Languages that fail are reported in the {@code errors} list without aborting
     * the remaining synthesises.
     */
    @PostMapping("/tts/preview-all")
    public ResponseEntity<ApiResponse<AllLanguagesTtsResponse>> previewAllTts(
            @Valid @RequestBody AllLanguagesTtsRequest request,
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_vendor")) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Only vendors can generate audio"));
        }

        String vendorEmail = authentication.getName();
        log.info("TTS preview-all – vendor={}, chars={}", vendorEmail, request.getText().length());

        List<LanguageTtsResult> results =
                ttsOrchestrationService.generateAllLanguages(request.getText());

        Map<String, String> audioBase64 = new LinkedHashMap<>();
        List<AllLanguagesTtsResponse.TtsError> errors = new ArrayList<>();

        for (LanguageTtsResult result : results) {
            if (result.isSuccess()) {
                audioBase64.put(result.getLanguage(),
                        Base64.getEncoder().encodeToString(result.getAudioBytes()));
            } else {
                errors.add(AllLanguagesTtsResponse.TtsError.builder()
                        .language(result.getLanguage())
                        .message(result.getErrorMessage())
                        .build());
            }
        }

        AllLanguagesTtsResponse response = AllLanguagesTtsResponse.builder()
                .audioBase64(audioBase64)
                .errors(errors)
                .build();

        log.info("TTS preview-all done – vendor={}, success={}, errors={}",
                vendorEmail, audioBase64.size(), errors.size());
        return ResponseEntity.ok(ApiResponse.success("TTS generation completed", response));
    }

    /**
     * POST /api/audio/tts/preview
     * Generates TTS audio for a single language and streams the raw MP3 bytes.
     * Does NOT upload to R2.
     */
    @PostMapping("/tts/preview")
    public void previewTts(
            @Valid @RequestBody TtsRequest request,
            Authentication authentication,
            HttpServletResponse response) throws IOException {

        if (!hasRole(authentication, "ROLE_vendor")) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN);
            return;
        }

        String vendorEmail = authentication.getName();
        byte[] audioBytes = audioService.generatePreviewBytes(request, vendorEmail);

        response.setContentType("audio/mpeg");
        response.setContentLength(audioBytes.length);
        try {
            response.getOutputStream().write(audioBytes);
        } catch (IOException e) {
            // Client disconnected before the audio body was fully written.
            // This is expected (e.g. user cancelled, Next.js proxy timed out)
            // and should not appear as an ERROR in the logs.
            log.debug("[TTS preview] Client disconnected mid-stream for vendor={}: {}",
                    vendorEmail, e.getMessage());
        }
    }

    /**
     * POST /api/audio/upload
     * Accepts a pre-generated audio blob, uploads it to Cloudflare R2,
     * inserts a file_asset record, and returns the file ID + URL.
     * Called at form-submit time after the vendor has verified the preview.
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<TtsResponse>> uploadAudio(
            @RequestParam("file") MultipartFile file,
            @RequestParam("language") String language,
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_vendor")) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Only vendors can upload audio"));
        }

        String vendorEmail = authentication.getName();
        TtsResponse ttsResponse = audioService.uploadAudioFile(file, language, vendorEmail);
        return ResponseEntity.ok(ApiResponse.success("Audio uploaded successfully", ttsResponse));
    }

    // ── Shop-linked audio endpoints ──────────────────────────────────────────────

    /**
     * POST /api/audio/shop/{shopId}/tts
     * Tạo TTS cho ngôn ngữ chỉ định và gắn thẳng vào shop.
     */
    @PostMapping("/shop/{shopId}/tts")
    public ResponseEntity<ApiResponse<TtsResponse>> generateTtsForShop(
            @PathVariable Integer shopId,
            @Valid @RequestBody TtsRequest request,
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_vendor")) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Only vendors can generate audio"));
        }
        String vendorEmail = authentication.getName();
        TtsResponse result = audioService.generateSingleAudio(request, vendorEmail, shopId);
        return ResponseEntity.ok(ApiResponse.success("Audio generated and linked to shop", result));
    }

    /**
     * POST /api/audio/shop/{shopId}/upload
     * Upload file audio (mp3/m4a/wav) và gắn vào shop.
     */
    @PostMapping(value = "/shop/{shopId}/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<TtsResponse>> uploadAudioForShop(
            @PathVariable Integer shopId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("language") String language,
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_vendor")) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Only vendors can upload audio"));
        }
        String vendorEmail = authentication.getName();
        TtsResponse result = audioService.uploadAudioFile(file, language, vendorEmail, shopId);
        return ResponseEntity.ok(ApiResponse.success("Audio uploaded and linked to shop", result));
    }

    /**
     * GET /api/audio/shop/{shopId}
     * Lấy danh sách audio của shop (cache-first).
     */
    @GetMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<List<AudioResponse>>> getAudioByShop(
            @PathVariable Integer shopId) {
        List<AudioResponse> list = audioService.getAudioByShop(shopId);
        return ResponseEntity.ok(ApiResponse.success("OK", list));
    }

    /**
     * GET /api/audio/poi/{poiId}
     * Lấy danh sách audio của POI (cache-first).
     */
    @GetMapping("/poi/{poiId}")
    public ResponseEntity<ApiResponse<List<AudioResponse>>> getAudioByPoi(
            @PathVariable Integer poiId) {
        List<AudioResponse> list = audioService.getAudioByPoi(poiId);
        return ResponseEntity.ok(ApiResponse.success("OK", list));
    }

    private boolean hasRole(Authentication auth, String role) {
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(role));
    }
}
