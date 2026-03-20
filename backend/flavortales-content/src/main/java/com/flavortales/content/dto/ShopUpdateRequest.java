package com.flavortales.content.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;

/**
 * Request body for PUT /api/shop/my/{shopId} – Update Shop Profile.
 * After a successful update the shop (and its linked POI) transitions back to
 * status = pending for admin re-review.
 */
@Data
public class ShopUpdateRequest {

    @NotBlank(message = "Shop name is required")
    @Size(min = 3, max = 100, message = "Shop name must be between 3 and 100 characters")
    private String name;

    @NotBlank(message = "Description is required")
    @Size(min = 50, max = 1000, message = "Description must be between 50 and 1000 characters")
    private String description;

    /**
     * File ID of the new cover image.
     * If null the existing avatar is kept unchanged.
     */
    private Integer avatarFileId;

    /** Optional additional image file IDs. Max 5. */
    @Size(max = 5, message = "You can upload at most 5 additional images")
    private List<Integer> additionalImageIds;

    /** Mô tả đặc sản – maps to cuisine_style column (max 200 chars). */
    @Size(max = 200, message = "Specialty description must be at most 200 characters")
    private String specialtyDescription;

    /** Optional opening hours stored as JSON. */
    private List<ShopCreateRequest.OpeningHoursDto> openingHours;

    /** Optional tags. Max 5. */
    @Size(max = 5, message = "You can add at most 5 tags")
    private List<String> tags;

    /** file_asset.file_id for Vietnamese audio (optional, null = keep existing) */
    private Integer viAudioFileId;

    /** file_asset.file_id for English audio (optional, null = keep existing) */
    private Integer enAudioFileId;
}
