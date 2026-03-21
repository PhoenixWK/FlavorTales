package com.flavortales.audio.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO trả về cho client khi query audio của shop/POI.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AudioResponse {

    private Integer audioId;
    private Integer shopId;
    private Integer poiId;
    private String  languageCode;
    private String  fileUrl;
    private Double  durationSeconds;
    private String  ttsProvider;
    private String  processingStatus;
    private String  status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
