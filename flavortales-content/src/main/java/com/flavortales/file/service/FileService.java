package com.flavortales.file.service;

import com.flavortales.file.dto.FileUploadResponse;
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
import java.util.Set;
import java.util.UUID;

/**
 * Handles image file upload validation, R2 storage, and file_asset record creation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileService {

    private static final Set<String> ALLOWED_IMAGE_TYPES =
            Set.of("image/jpeg", "image/png");
    private static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024; // 5 MB

    private final R2FileStorageService r2StorageService;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Validates and uploads an image file to R2, then creates a file_asset record.
     *
     * @param file        Multipart upload from the vendor
     * @param vendorEmail Authenticated vendor email (used to derive R2 path)
     * @return FileUploadResponse with fileId and public URL
     */
    @Transactional
    public FileUploadResponse uploadImage(MultipartFile file, String vendorEmail) {
        validateImage(file);

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new RuntimeException("Failed to read uploaded file", e);
        }

        String extension = resolveExtension(file.getContentType());
        String filename = UUID.randomUUID() + extension;
        String objectKey = r2StorageService.buildImageKey(vendorEmail, filename);
        String fileUrl = r2StorageService.upload(objectKey, bytes, file.getContentType());

        int ownerId = resolveVendorId(vendorEmail);
        int fileId = insertFileAsset(ownerId, objectKey, fileUrl, file.getContentType(), bytes.length);

        return FileUploadResponse.builder()
                .fileId(fileId)
                .fileUrl(fileUrl)
                .originalFilename(file.getOriginalFilename())
                .mimeType(file.getContentType())
                .sizeBytes(bytes.length)
                .build();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        String mime = file.getContentType();
        if (mime == null || !ALLOWED_IMAGE_TYPES.contains(mime)) {
            throw new IllegalArgumentException(
                    "Invalid file type. Only JPEG and PNG are allowed.");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new IllegalArgumentException(
                    "File size exceeds the 5 MB limit.");
        }
    }

    private String resolveExtension(String mimeType) {
        return switch (mimeType) {
            case "image/jpeg" -> ".jpg";
            case "image/png"  -> ".png";
            default           -> "";
        };
    }

    private int insertFileAsset(int ownerId, String objectKey, String fileUrl,
                                 String mimeType, long sizeBytes) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            var ps = con.prepareStatement(
                    """
                    INSERT INTO file_asset
                        (owner_id, bucket, object_key, file_url, file_type, mime_type, size_bytes, status)
                    VALUES (?, 'flavortales', ?, ?, 'image', ?, ?, 'active')
                    """,
                    java.sql.Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, ownerId);
            ps.setString(2, objectKey);
            ps.setString(3, fileUrl);
            ps.setString(4, mimeType);
            ps.setLong(5, sizeBytes);
            return ps;
        }, keyHolder);
        return keyHolder.getKey().intValue();
    }

    private int resolveVendorId(String vendorEmail) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT user_id FROM user WHERE email = ?",
                    Integer.class, vendorEmail);
        } catch (EmptyResultDataAccessException e) {
            throw new RuntimeException("Vendor not found: " + vendorEmail);
        }
    }
}
