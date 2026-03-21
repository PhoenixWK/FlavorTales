package com.flavortales.audio.service;

import com.flavortales.audio.dto.AudioResponse;
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
import java.util.List;
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
    private final AudioCacheService audioCacheService;
    private final com.flavortales.audio.config.AudioProperties audioProperties;

    /**
     * Tạo TTS cho shop: sinh audio → upload R2 → lưu file_asset + audio record.
     * Gọi sau khi shop đã được tạo (shopId != null).
     */
    @Transactional
    public TtsResponse generateSingleAudio(TtsRequest request, String vendorEmail, Integer shopId) {
        Integer ownerId = resolveVendorId(vendorEmail);
        String text = request.getText();
        String language = request.getLanguage();

        log.info("TTS – vendor={}, shop={}, lang={}, chars={}", vendorEmail, shopId, language, text.length());

        byte[] audioBytes = synthesize(language, text);

        String keyPrefix = "shop_" + language + "_";
        String objectKey = r2FileStorageService.buildAudioKey(
                vendorEmail, keyPrefix + UUID.randomUUID() + ".mp3");
        String fileUrl = r2FileStorageService.upload(objectKey, audioBytes, "audio/mpeg");

        int fileId = insertFileAsset(ownerId, objectKey, fileUrl, "audio/mpeg", audioBytes.length);

        Integer audioId = null;
        if (shopId != null) {
            audioId = upsertAudioRecord(shopId, fileId, language, "completed",
                    resolveProvider(language), null);
            audioCacheService.evictByShop(shopId);
        }

        log.info("TTS done – vendor={}, shop={}, lang={}, fileId={}, audioId={}",
                vendorEmail, shopId, language, fileId, audioId);

        return TtsResponse.builder()
                .audioId(audioId)
                .language(language)
                .fileId(fileId)
                .fileUrl(fileUrl)
                .build();
    }

    /** Sinh TTS không gắn shop (dùng cho endpoint tts cũ, không lưu audio record). */
    @Transactional
    public TtsResponse generateSingleAudio(TtsRequest request, String vendorEmail) {
        return generateSingleAudio(request, vendorEmail, null);
    }

    /**
     * Generates TTS bytes for the given language without uploading to R2.
     * The caller is responsible for streaming the bytes to the client.
     */
    public byte[] generatePreviewBytes(TtsRequest request, String vendorEmail) {
        String text = request.getText();
        String language = request.getLanguage();
        log.info("TTS preview – vendor={}, lang={}, chars={}", vendorEmail, language, text.length());
        byte[] audioBytes = synthesize(language, text);
        log.info("TTS preview ready – lang={}, bytes={}", language, audioBytes.length);
        return audioBytes;
    }

    /**
     * Upload audio file cho shop: lưu file_asset + audio record.
     * Gọi sau khi shop đã được tạo (shopId != null).
     */
    @Transactional
    public TtsResponse uploadAudioFile(MultipartFile file, String language, String vendorEmail,
                                       Integer shopId) {
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

        String objectKey = r2FileStorageService.buildAudioKey(
                vendorEmail, "shop_" + language + "_" + UUID.randomUUID() + ".mp3");
        String fileUrl = r2FileStorageService.upload(objectKey, audioBytes, "audio/mpeg");

        int fileId = insertFileAsset(ownerId, objectKey, fileUrl, "audio/mpeg", audioBytes.length);

        Integer audioId = null;
        if (shopId != null) {
            audioId = upsertAudioRecord(shopId, fileId, language, "completed", "upload", null);
            audioCacheService.evictByShop(shopId);
        }

        log.info("Audio uploaded – vendor={}, shop={}, lang={}, fileId={}, audioId={}",
                vendorEmail, shopId, language, fileId, audioId);

        return TtsResponse.builder()
                .audioId(audioId)
                .language(language)
                .fileId(fileId)
                .fileUrl(fileUrl)
                .build();
    }

    /** Backward-compat: upload không gắn shopId (endpoint cũ). */
    @Transactional
    public TtsResponse uploadAudioFile(MultipartFile file, String language, String vendorEmail) {
        return uploadAudioFile(file, language, vendorEmail, null);
    }

    // ── Query methods ────────────────────────────────────────────────────────

    /**
     * Trả về danh sách audio của shop (cache-first).
     * Chỉ trả về audio có processing_status = 'completed'.
     */
    public List<AudioResponse> getAudioByShop(Integer shopId) {
        List<AudioResponse> cached = audioCacheService.getByShop(shopId);
        if (cached != null) return cached;

        List<AudioResponse> list = jdbcTemplate.query(
                """
                SELECT a.audio_id, a.shop_id, a.poi_id, a.language_code,
                       fa.file_url, a.duration_seconds, a.tts_provider,
                       a.processing_status, a.status, a.created_at, a.updated_at
                FROM audio a
                JOIN file_asset fa ON fa.file_id = a.file_id
                WHERE a.shop_id = ? AND a.processing_status = 'completed'
                ORDER BY a.language_code
                """,
                (rs, rowNum) -> mapAudioResponse(rs),
                shopId
        );
        audioCacheService.putByShop(shopId, list);
        return list;
    }

    /**
     * Trả về danh sách audio của POI (cache-first).
     */
    public List<AudioResponse> getAudioByPoi(Integer poiId) {
        List<AudioResponse> cached = audioCacheService.getByPoi(poiId);
        if (cached != null) return cached;

        List<AudioResponse> list = jdbcTemplate.query(
                """
                SELECT a.audio_id, a.shop_id, a.poi_id, a.language_code,
                       fa.file_url, a.duration_seconds, a.tts_provider,
                       a.processing_status, a.status, a.created_at, a.updated_at
                FROM audio a
                JOIN file_asset fa ON fa.file_id = a.file_id
                WHERE a.poi_id = ? AND a.processing_status = 'completed'
                ORDER BY a.language_code
                """,
                (rs, rowNum) -> mapAudioResponse(rs),
                poiId
        );
        audioCacheService.putByPoi(poiId, list);
        return list;
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private byte[] synthesize(String language, String text) {
        return switch (language) {
            case "vi" -> fptAiTtsService.synthesize(text);
            case "en" -> googleCloudTtsService.synthesize(text);
            case "zh" -> {
                com.flavortales.audio.config.AudioProperties.ZhTts zh = audioProperties.getZhTts();
                yield googleCloudTtsService.synthesize(text, zh.getLanguageCode(), zh.getVoiceName());
            }
            default -> throw new IllegalArgumentException("Unsupported language: " + language);
        };
    }

    private String resolveProvider(String language) {
        return "vi".equals(language) ? "fpt_ai" : "google_tts";
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

    /**
     * INSERT OR UPDATE audio record (upsert by shop_id + language_code).
     * Nếu đã tồn tại → cập nhật file_id, provider, processing_status.
     */
    private int upsertAudioRecord(Integer shopId, int fileId, String language,
                                   String processingStatus, String ttsProvider,
                                   Double durationSeconds) {
        // Lấy poi_id từ shop
        Integer poiId = jdbcTemplate.queryForObject(
                "SELECT poi_id FROM shop WHERE shop_id = ?", Integer.class, shopId);
        Integer uploadedBy = jdbcTemplate.queryForObject(
                "SELECT vendor_id FROM shop WHERE shop_id = ?", Integer.class, shopId);

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    """
                    INSERT INTO audio
                        (shop_id, poi_id, file_id, language_code, duration_seconds,
                         tts_provider, processing_status, status, uploaded_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
                    ON DUPLICATE KEY UPDATE
                        file_id           = VALUES(file_id),
                        poi_id            = VALUES(poi_id),
                        duration_seconds  = VALUES(duration_seconds),
                        tts_provider      = VALUES(tts_provider),
                        processing_status = VALUES(processing_status),
                        updated_at        = NOW()
                    """,
                    Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, shopId);
            ps.setObject(2, poiId);
            ps.setInt(3, fileId);
            ps.setString(4, language);
            ps.setObject(5, durationSeconds);
            ps.setString(6, ttsProvider);
            ps.setString(7, processingStatus);
            ps.setInt(8, uploadedBy);
            return ps;
        }, keyHolder);

        if (keyHolder.getKey() != null) {
            return keyHolder.getKey().intValue();
        }
        // ON DUPLICATE KEY: MySQL trả về last_insert_id = 0, cần query lại
        return jdbcTemplate.queryForObject(
                "SELECT audio_id FROM audio WHERE shop_id = ? AND language_code = ?",
                Integer.class, shopId, language);
    }

    private AudioResponse mapAudioResponse(java.sql.ResultSet rs) throws java.sql.SQLException {
        return AudioResponse.builder()
                .audioId(rs.getInt("audio_id"))
                .shopId(rs.getInt("shop_id"))
                .poiId(rs.getObject("poi_id") != null ? rs.getInt("poi_id") : null)
                .languageCode(rs.getString("language_code"))
                .fileUrl(rs.getString("file_url"))
                .durationSeconds(rs.getObject("duration_seconds") != null
                        ? rs.getDouble("duration_seconds") : null)
                .ttsProvider(rs.getString("tts_provider"))
                .processingStatus(rs.getString("processing_status"))
                .status(rs.getString("status"))
                .createdAt(rs.getTimestamp("created_at") != null
                        ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                .updatedAt(rs.getTimestamp("updated_at") != null
                        ? rs.getTimestamp("updated_at").toLocalDateTime() : null)
                .build();
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