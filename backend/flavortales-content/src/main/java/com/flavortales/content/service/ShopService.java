package com.flavortales.content.service;

import com.flavortales.common.annotation.ReadOnly;
import com.flavortales.common.exception.UserNotFoundException;
import com.flavortales.content.dto.ShopResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShopService {

    private final JdbcTemplate jdbcTemplate;

    @ReadOnly
    public List<ShopResponse> getMyShops(String vendorEmail) {
        Integer vendorId = resolveVendorId(vendorEmail);
        return jdbcTemplate.query(
                """
                SELECT shop_id, name, description, cuisine_style, featured_dish,
                       status, poi_id, created_at, updated_at
                FROM shop
                WHERE vendor_id = ?
                ORDER BY created_at DESC
                """,
                (rs, rowNum) -> ShopResponse.builder()
                        .shopId(rs.getInt("shop_id"))
                        .name(rs.getString("name"))
                        .description(rs.getString("description"))
                        .cuisineStyle(rs.getString("cuisine_style"))
                        .featuredDish(rs.getString("featured_dish"))
                        .status(rs.getString("status"))
                        .poiId(rs.getObject("poi_id") != null ? rs.getInt("poi_id") : null)
                        .createdAt(rs.getTimestamp("created_at") != null
                                ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                        .updatedAt(rs.getTimestamp("updated_at") != null
                                ? rs.getTimestamp("updated_at").toLocalDateTime() : null)
                        .build(),
                vendorId
        );
    }

    private Integer resolveVendorId(String vendorEmail) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT user_id FROM user WHERE email = ?",
                    Integer.class,
                    vendorEmail
            );
        } catch (EmptyResultDataAccessException e) {
            throw new UserNotFoundException("Vendor not found: " + vendorEmail);
        }
    }
}
