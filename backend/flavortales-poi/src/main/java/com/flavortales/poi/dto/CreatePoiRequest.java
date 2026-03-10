package com.flavortales.poi.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePoiRequest {

    @NotBlank(message = "POI name is required")
    @Size(min = 3, max = 100, message = "POI name must be between 3 and 100 characters")
    private String name;

    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "-90.0", inclusive = true, message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0",  inclusive = true, message = "Latitude must be between -90 and 90")
    @Digits(integer = 3, fraction = 6, message = "Latitude supports up to 6 decimal places")
    private BigDecimal latitude;

    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "-180.0", inclusive = true, message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0",  inclusive = true, message = "Longitude must be between -180 and 180")
    @Digits(integer = 4, fraction = 6, message = "Longitude supports up to 6 decimal places")
    private BigDecimal longitude;

    @NotNull(message = "Radius is required")
    @DecimalMin(value = "10.0",  inclusive = true, message = "Radius must be at least 10 metres")
    @DecimalMax(value = "200.0", inclusive = true, message = "Radius must not exceed 200 metres")
    private BigDecimal radius;

    private Integer shopId;
}
