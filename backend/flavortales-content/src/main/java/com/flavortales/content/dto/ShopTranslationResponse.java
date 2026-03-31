package com.flavortales.content.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ShopTranslationResponse {
    private Integer shopId;
    private String language;
    private String languageCode;
    private Integer vendorId;
    private Integer poiId;
    private Integer avatarFileId;
    private String name;
    private String description;
    private String cuisineStyle;
    private String featuredDish;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
