package com.flavortales.poi.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PoiResponse {

    private Integer poiId;
    private String name;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal radius;
    private String status;
    private int likesCount;
    private Integer linkedShopId;
    private String linkedShopName;
    private String linkedShopAvatarUrl;
    private String message;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Shop detail fields (only populated on the public active-POI endpoint)
    private String shopDescription;
    private List<String> shopTags;
    private List<OpeningHoursDto> shopOpeningHours;
    private List<String> shopGalleryUrls;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OpeningHoursDto {
        private int day;
        private String open;
        private String close;
        private boolean closed;
    }
}
