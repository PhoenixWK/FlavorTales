package com.flavortales.poi.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Combined POI + shop creation request (UC-14 / FR-PM-001).
 * Step 1: POI location fields; Step 2: shop info; Step 3: audio.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePoiRequest {

    // ── Step 1: POI location ─────────────────────────────────────────────────

    @NotBlank(message = "Tên POI là bắt buộc")
    @Size(min = 3, max = 100, message = "Tên POI phải từ 3 đến 100 ký tự")
    private String name;

    @NotNull(message = "Latitude là bắt buộc")
    @DecimalMin(value = "-90.0",  inclusive = true, message = "Latitude phải từ -90 đến 90")
    @DecimalMax(value = "90.0",   inclusive = true, message = "Latitude phải từ -90 đến 90")
    @Digits(integer = 3, fraction = 6, message = "Latitude tối đa 6 chữ số thập phân")
    private BigDecimal latitude;

    @NotNull(message = "Longitude là bắt buộc")
    @DecimalMin(value = "-180.0", inclusive = true, message = "Longitude phải từ -180 đến 180")
    @DecimalMax(value = "180.0",  inclusive = true, message = "Longitude phải từ -180 đến 180")
    @Digits(integer = 4, fraction = 6, message = "Longitude tối đa 6 chữ số thập phân")
    private BigDecimal longitude;

    @NotNull(message = "Bán kính là bắt buộc")
    @Min(value = 10,  message = "Bán kính tối thiểu 10 mét")
    @Max(value = 100, message = "Bán kính tối đa 100 mét")
    private Integer radius;

    // ── Step 2: Shop information ─────────────────────────────────────────────

    @NotBlank(message = "Tên gian hàng là bắt buộc")
    @Size(min = 3, max = 100, message = "Tên gian hàng phải từ 3 đến 100 ký tự")
    private String shopName;

    @NotBlank(message = "Mô tả giới thiệu là bắt buộc")
    @Size(max = 500, message = "Mô tả không vượt quá 500 ký tự")
    private String shopDescription;

    @NotNull(message = "Ảnh đại diện gian hàng là bắt buộc")
    private Integer avatarFileId;

    @Size(max = 5, message = "Tối đa 5 ảnh bổ sung")
    private List<Integer> additionalImageIds;

    @Size(max = 200, message = "Mô tả đặc sản không vượt quá 200 ký tự")
    private String specialtyDescription;

    @Valid
    private List<OpeningHoursDto> openingHours;

    @Size(max = 5, message = "Tối đa 5 tags")
    private List<String> tags;

    // Audio fields removed – managed via POST /api/audio/shop/{shopId}/tts|upload
    // after POI + shop have been created.

    // ── Nested DTO ───────────────────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OpeningHoursDto {
        @Min(0) @Max(6)
        private int day;
        private String open;
        private String close;
        private boolean closed;
    }
}
