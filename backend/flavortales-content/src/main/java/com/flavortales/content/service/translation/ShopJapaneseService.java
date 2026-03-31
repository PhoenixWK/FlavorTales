package com.flavortales.content.service.translation;

import com.flavortales.content.dto.ShopTranslationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ShopJapaneseService {

    private static final String TABLE = "shop_japanese";

    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public void upsert(Integer shopId, String name, String description,
                       String cuisineStyle, String featuredDish) {
        jdbcTemplate.update("""
            INSERT INTO %s
                (shop_id, vendor_id, poi_id, avatar_file_id, name, description,
                 cuisine_style, featured_dish, status, tags, opening_hours,
                 created_at, updated_at)
            SELECT shop_id, vendor_id, poi_id, avatar_file_id, ?, ?,
                   ?, ?, status, tags, opening_hours,
                   NOW(), NOW()
            FROM shop WHERE shop_id = ?
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                description = VALUES(description),
                cuisine_style = VALUES(cuisine_style),
                featured_dish = VALUES(featured_dish),
                updated_at = NOW()
            """.formatted(TABLE),
            name, description, cuisineStyle, featuredDish, shopId);
    }

    @Transactional(readOnly = true)
    public Optional<ShopTranslationResponse> findByShopId(Integer shopId) {
        try {
            ShopTranslationResponse r = jdbcTemplate.queryForObject(
                "SELECT * FROM %s WHERE shop_id = ?".formatted(TABLE),
                (rs, i) -> {
                    ShopTranslationResponse resp = new ShopTranslationResponse();
                    resp.setShopId(rs.getInt("shop_id"));
                    resp.setLanguage("japanese"); resp.setLanguageCode("ja");
                    resp.setVendorId(rs.getInt("vendor_id"));
                    resp.setPoiId((Integer) rs.getObject("poi_id"));
                    resp.setAvatarFileId((Integer) rs.getObject("avatar_file_id"));
                    resp.setName(rs.getString("name"));
                    resp.setDescription(rs.getString("description"));
                    resp.setCuisineStyle(rs.getString("cuisine_style"));
                    resp.setFeaturedDish(rs.getString("featured_dish"));
                    resp.setStatus(rs.getString("status"));
                    resp.setCreatedAt(rs.getTimestamp("created_at") != null
                        ? rs.getTimestamp("created_at").toLocalDateTime() : null);
                    resp.setUpdatedAt(rs.getTimestamp("updated_at") != null
                        ? rs.getTimestamp("updated_at").toLocalDateTime() : null);
                    return resp;
                }, shopId);
            return Optional.ofNullable(r);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    @Transactional
    public void deleteByShopId(Integer shopId) {
        jdbcTemplate.update("DELETE FROM %s WHERE shop_id = ?".formatted(TABLE), shopId);
    }
}
