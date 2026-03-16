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
    private String  poiName;
    private String  avatarUrl;
    private String  openingHours; // JSON string: [{day,open,close,closed}]
    private String  tags;         // JSON string: ["tag1","tag2"]
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
