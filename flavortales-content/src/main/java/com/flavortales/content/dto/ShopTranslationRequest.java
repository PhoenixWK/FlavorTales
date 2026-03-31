package com.flavortales.content.dto;

import lombok.Data;

@Data
public class ShopTranslationRequest {
    private Integer shopId;
    private String name;
    private String description;
    private String cuisineStyle;
    private String featuredDish;
}
