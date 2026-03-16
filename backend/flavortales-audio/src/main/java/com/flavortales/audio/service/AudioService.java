package com.flavortales.audio.service;

import com.flavortales.audio.dto.TtsRequest;
import com.flavortales.audio.dto.TtsResponse;
import com.flavortales.file.storage.R2FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.UUID;

/**
 * Orchestrates single-language TTS generation:
 *  1. Generate audio for the requested language (vi -> FPT AI, en -> Google Cloud TTS)
 *  2. Upload the MP3 to Cloudflare R2
 *  3. Insert a file_asset record
 *  4. Return the file ID + URL for frontend preview
 *
 * Each language is generated in a separate request so vendors are not blocked
 * waiting for both TTS providers to respond simultaneously.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AudioService {

    private final FptAiTtsService fptAiTtsService;
    private final GoogleCloudTtsService googleCloudTtsService;
    private final R2FileStorageService r2FileStorageService;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public TtsResponse generateSingleAudio(TtsRequest request, String vendorEmail) {
        Integer ownerId = resolveVendorId(vendorEmail);
        String text = request.getText();
        String language = request.getLanguage();

        log.info("Starting TTS generation - vendor={}, language={}, textLength={}",
                vendorEmail, language, text.length());

        byte[] audioBytes;
        String keyPrefix;
        if ("vi".equals(language)) {
            audioBytes = fptAiTtsService.synthesize(text);
            keyPrefix = "shop_vi_";
        } else if ("en".equals(language)) {
            audioBytes = googleCloudTtsService.synthesize(text);
            keyPrefix = "shop_en_";
        } else {
            throw new IllegalArgumentException("Unsupported language: " + language);
        }

        log.info("TTS completed - language={}, bytes={}", language, audioBytes.length);

        String objectKey = r2FileStorageService.buildAudioKey(
                vendorEmail, keyPrefix + UUID.randomUUID() + ".mp3");
        String fileUrl = r2FileStorageService.upload(objectKey, audioBytes, "audio/mpeg");

        log.info("Uploaded to R2 - key={}", objectKey);

        int fileId = insertFileAsset(ownerId, objectKey, fileUrl, "audio/mpeg", audioBytes.length);

        log.info("TTS complete - vendor={}, language={}, fileId={}", vendorEmail, language, fileId);

        return TtsResponse.builder()
                .language(language)
                .fileId(fileId)
                .fileUrl(fileUrl)
                .build();
    }

    /**
     * Generates TTS bytes for the given language without uploading to R2.
     * The caller is responsible for streaming the bytes to the client.
     */
    public byte[] generatePreviewBytes(TtsRequest request, String vendorEmail) {
        String text = request.getText();
        String language = request.getLanguage();

        log.info("TTS preview - vendor={}, language={}, chars={}",
                vendorEmail, language, text.length());

        byte[] audioBytes;
        if ("vi".equals(language)) {
            audioBytes = fptAiTtsService.synthesize(text);
        } else if ("en".equals(language)) {
            audioBytes = googleCloudTtsService.synthesize(text);
        } else {
            throw new IllegalArgumentException("Unsupported language: " + language);
        }

        log.info("TTS preview ready - language={}, bytes={}", language, audioBytes.length);
        return audioBytes;
    }

    /**
     * Uploads a pre-generated audio file to Cloudflare R2, stores a file_asset
     * record, and returns the file ID + URL. Called at form-submit time.
     */
    @Transactional
    public TtsResponse uploadAudioFile(MultipartFile file, String language, String vendorEmail) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Audio file is empty");
        }

        Integer ownerId = resolveVendorId(vendorEmail);

        byte[] audioBytes;
        try {
            audioBytes = file.getBytes();
        } catch (IOException e) {
            throw new RuntimeException("Failed to read uploaded audio file", e);
        }

        String keyPrefix = "vi".equals(language) ? "shop_vi_" : "shop_en_";
        String objectKey = r2FileStorageService.buildAudioKey(
                vendorEmail, keyPrefix + UUID.randomUUID() + ".mp3");
        String fileUrl = r2FileStorageService.upload(objectKey, audioBytes, "audio/mpeg");

        int fileId = insertFileAsset(ownerId, objectKey, fileUrl, "audio/mpeg", audioBytes.length);

        log.info("Audio uploaded - vendor={}, language={}, fileId={}", vendorEmail, language, fileId);

        return TtsResponse.builder()
                .language(language)
                .fileId(fileId)
                .fileUrl(fileUrl)
                .build();
    }

    private int insertFileAsset(Integer ownerId, String objectKey, String fileUrl,
                                 String mimeType, long sizeBytes) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO file_asset" +
                    " (owner_id, bucket, object_key, file_url, file_type, mime_type, size_bytes, status)" +
                    " VALUES (?, 'flavortales', ?, ?, 'audio', ?, ?, 'active')",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, ownerId);
            ps.setString(2, objectKey);
            ps.setString(3, fileUrl);
            ps.setString(4, mimeType);
            ps.setLong(5, sizeBytes);
            return ps;
        }, keyHolder);
        return keyHolder.getKey().intValue();
    }

    private Integer resolveVendorId(String vendorEmail) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT user_id FROM user WHERE email = ?",
                    Integer.class, vendorEmail);
        } catch (EmptyResultDataAccessException e) {
            throw new RuntimeException("Vendor not found: " + vendorEmail);
        }
    }
}