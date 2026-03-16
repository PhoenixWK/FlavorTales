package com.flavortales.audio.controller;

import com.flavortales.audio.dto.TtsRequest;
import com.flavortales.audio.dto.TtsResponse;
import com.flavortales.audio.service.AudioService;
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

@RestController
@RequestMapping("/api/audio")
@RequiredArgsConstructor
@Slf4j
public class AudioController {

    private final AudioService audioService;

    /**
     * POST /api/audio/tts
     * Generates Vietnamese (FPT AI) and English (Google Cloud TTS) audio from text,
     * uploads both files to Cloudflare R2, and returns file IDs + URLs for preview.
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
     * POST /api/audio/tts/preview
     * Generates TTS audio and streams the raw MP3 bytes directly to the client.
     * Does NOT upload to R2 – the client creates a local Blob URL for in-browser
     * preview and uploads to R2 only when the vendor submits the shop form.
     *
     * We write directly to {@link HttpServletResponse} rather than returning
     * {@code ResponseEntity<byte[]>} so that we can catch and suppress the
     * {@link IOException} that Tomcat NIO throws when the client disconnects
     * before the full audio body has been written (broken-pipe / connection-reset).
     * With {@code ResponseEntity<byte[]>}, that IOException propagates through the
     * entire Tomcat filter chain and appears as a noisy ERROR in the logs even
     * though it is expected and harmless.
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

    private boolean hasRole(Authentication auth, String role) {
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(role));
    }
}
