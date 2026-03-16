package com.flavortales.content.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Response body for POST /api/shop – returns the newly created shop.
 */
@Data
@Builder
public class ShopCreateResponse {

    private Integer shopId;
    private String  name;
    private String  status;
    private String  message;
    private LocalDateTime createdAt;
}
