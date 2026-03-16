package com.flavortales.file.controller;

import com.flavortales.common.dto.ApiResponse;
import com.flavortales.file.dto.FileUploadResponse;
import com.flavortales.file.service.FileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/file")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    /**
     * POST /api/file/upload
     * Accepts a single JPEG/PNG image (max 5 MB), uploads it to Cloudflare R2,
     * creates a file_asset record, and returns the file ID and public URL.
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<FileUploadResponse>> uploadImage(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_vendor")) {
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Only vendors can upload files"));
        }

        try {
            String vendorEmail = authentication.getName();
            FileUploadResponse response = fileService.uploadImage(file, vendorEmail);
            return ResponseEntity.ok(ApiResponse.success("File uploaded successfully", response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    private boolean hasRole(Authentication auth, String role) {
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(role));
    }
}
