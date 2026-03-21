package com.flavortales.content.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;
// Note: audio fields removed – audio is managed via POST /api/audio/shop/{shopId}/tts|upload

import java.util.List;

/**
 * Request body for POST /api/shop – Create Shop Profile (FR-CM-001).
 */
@Data
public class ShopCreateRequest {

    @NotBlank(message = "Shop name is required")
    @Size(min = 3, max = 100, message = "Shop name must be between 3 and 100 characters")
    private String name;

    @NotBlank(message = "Description is required")
    @Size(min = 50, max = 1000, message = "Description must be between 50 and 1000 characters")
    private String description;

    @NotNull(message = "Avatar image is required")
    private Integer avatarFileId;

    /** Optional additional image file IDs. Max 5. */
    @Size(max = 5, message = "You can upload at most 5 additional images")
    private List<Integer> additionalImageIds;

    /** Mô tả đặc sản – maps to cuisine_style column (max 200 chars). */
    @Size(max = 200, message = "Specialty description must be at most 200 characters")
    private String specialtyDescription;

    /**
     * Optional opening hours stored as JSON.
     * Each entry: { day: 0-6 (Mon-Sun), open: "HH:mm", close: "HH:mm", closed: boolean }
     */
    private List<OpeningHoursDto> openingHours;

    /** Optional tags. Max 5. Values: "Bình dân", "Gia truyền", "Chay". */
    @Size(max = 5, message = "You can add at most 5 tags")
    private List<String> tags;

    @Data
    public static class OpeningHoursDto {
        /** 0 = Monday … 6 = Sunday */
        @Min(0) @Max(6)
        private int day;

        /** "HH:mm" format, nullable when closed = true */
        private String open;

        /** "HH:mm" format, nullable when closed = true */
        private String close;

        private boolean closed;
    }
}
