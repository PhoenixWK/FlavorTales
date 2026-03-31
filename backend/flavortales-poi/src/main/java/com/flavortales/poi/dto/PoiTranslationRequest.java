package com.flavortales.poi.dto;

import lombok.Data;

@Data
public class PoiTranslationRequest {
    private Integer poiId;
    private Integer shopId;
    /** Vietnamese name to translate */
    private String name;
    /** Vietnamese address to translate (nullable) */
    private String address;
}
