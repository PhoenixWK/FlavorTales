package com.flavortales.poi.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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
    private Integer linkedShopId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
