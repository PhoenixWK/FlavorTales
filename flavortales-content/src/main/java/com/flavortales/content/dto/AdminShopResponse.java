package com.flavortales.content.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Full shop detail returned to admin for review.
 * Includes avatar, gallery, audio files, and vendor info.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminShopResponse {

    private Integer shopId;
    private String  name;
    private String  description;
    private String  cuisineStyle;
    private String  featuredDish;
    private String  status;
    private Integer poiId;
    private String  poiName;
    private Double  latitude;
    private Double  longitude;
    private Integer radius;
    private String  avatarUrl;
    private String  openingHours;   // JSON string: [{day,open,close,closed}]
    private String  tags;           // JSON string: ["tag1","tag2"]
    private List<String> galleryUrls;
    private String  viAudioUrl;
    private String  enAudioUrl;
    private String  vendorEmail;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
