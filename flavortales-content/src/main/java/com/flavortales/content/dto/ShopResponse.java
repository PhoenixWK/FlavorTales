package com.flavortales.content.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShopResponse {

    private Integer shopId;
    private String  name;
    private String  description;
    private String  cuisineStyle;
    private String  featuredDish;
    private String  status;
    private Integer poiId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
