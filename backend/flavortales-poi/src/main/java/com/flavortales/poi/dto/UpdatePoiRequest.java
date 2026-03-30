package com.flavortales.poi.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * FR-PM-004: Update POI request.
 *
 * <p>All fields are optional – omitted fields retain their current value.
 * The frontend form always sends all fields because it pre-populates them,
 * but partial updates are supported at the API level.
 *
 * <p>shopId semantics:
 * <ul>
 *   <li>null  – no change to the current shop link</li>
 *   <li>0     – explicitly unlink the current shop</li>
 *   <li>&gt;0 – link to this shop (validates ownership &amp; availability)</li>
 * </ul>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdatePoiRequest {

    @Size(min = 3, max = 100, message = "POI name must be between 3 and 100 characters")
    private String name;

    @DecimalMin(value = "-90.0",  inclusive = true, message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0",   inclusive = true, message = "Latitude must be between -90 and 90")
    @Digits(integer = 3, fraction = 6, message = "Latitude supports up to 6 decimal places")
    private BigDecimal latitude;

    @DecimalMin(value = "-180.0", inclusive = true, message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0",  inclusive = true, message = "Longitude must be between -180 and 180")
    @Digits(integer = 4, fraction = 6, message = "Longitude supports up to 6 decimal places")
    private BigDecimal longitude;

    @DecimalMin(value = "10.0",  inclusive = true, message = "Radius must be at least 10 metres")
    @DecimalMax(value = "200.0", inclusive = true, message = "Radius must not exceed 200 metres")
    private BigDecimal radius;

    @Size(max = 500, message = "Address must not exceed 500 characters")
    private String address;

    private Integer shopId;
}
