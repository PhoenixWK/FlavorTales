package com.flavortales.poi.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PoiTranslationResponse {
    private Integer poiId;
    private String language;
    private String languageCode;
    private String name;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal radius;
    private String address;
    private String status;
    private int likesCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
