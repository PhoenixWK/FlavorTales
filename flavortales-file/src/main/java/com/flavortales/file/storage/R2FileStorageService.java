package com.flavortales.file.storage;

import com.flavortales.file.config.R2Properties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
@RequiredArgsConstructor
@Slf4j
public class R2FileStorageService {

    private final S3Client s3Client;
    private final R2Properties r2Properties;

    /**
     * Uploads bytes to Cloudflare R2 and returns the public URL.
     *
     * @param objectKey  Full object key, e.g. "john/images/avatar_1234.jpg"
     * @param data       Raw file bytes
     * @param mimeType   MIME type string, e.g. "image/jpeg"
     * @return Public URL of the uploaded object
     */
    public String upload(String objectKey, byte[] data, String mimeType) {
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(r2Properties.getBucket())
                .key(objectKey)
                .contentType(mimeType)
                .contentLength((long) data.length)
                .build();

        s3Client.putObject(request, RequestBody.fromBytes(data));

        String baseUrl = r2Properties.getPublicUrl();
        if (baseUrl.endsWith("/")) baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        String publicUrl = baseUrl + "/" + objectKey;
        log.info("Uploaded to R2: {}", publicUrl);
        return publicUrl;
    }

    /**
     * Soft-deletes (removes) an object from R2.
     *
     * @param objectKey Full object key
     */
    public void delete(String objectKey) {
        DeleteObjectRequest request = DeleteObjectRequest.builder()
                .bucket(r2Properties.getBucket())
                .key(objectKey)
                .build();
        s3Client.deleteObject(request);
        log.info("Deleted from R2: {}", objectKey);
    }

    /**
     * Builds the object key for an image owned by a vendor.
     * Structure: {username}/images/{filename}
     */
    public String buildImageKey(String vendorEmail, String filename) {
        String username = extractUsername(vendorEmail);
        return username + "/images/" + filename;
    }

    /**
     * Builds the object key for an audio/video file owned by a vendor.
     * Structure: {username}/videos/{filename}
     */
    public String buildAudioKey(String vendorEmail, String filename) {
        String username = extractUsername(vendorEmail);
        return username + "/videos/" + filename;
    }

    private String extractUsername(String email) {
        int atIndex = email.indexOf('@');
        return atIndex > 0 ? email.substring(0, atIndex) : email;
    }
}
