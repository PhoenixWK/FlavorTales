package com.flavortales.content.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flavortales.common.annotation.ReadOnly;
import com.flavortales.common.exception.UserNotFoundException;
import com.flavortales.content.dto.ShopCreateRequest;
import com.flavortales.content.dto.ShopCreateResponse;
import com.flavortales.content.dto.ShopResponse;
import com.flavortales.notification.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShopService {

    private final JdbcTemplate jdbcTemplate;
    private final EmailService emailService;
    private final ObjectMapper objectMapper;

    // ── Create ───────────────────────────────────────────────────────────────

    /**
     * Creates a new shop profile with status PENDING.
     * Steps:
     *  1. Validate name uniqueness
     *  2. Insert shop row
     *  3. Insert shop_image rows for additional images
     *  4. Notify admin asynchronously
     */
    @Transactional
    public ShopCreateResponse createShop(ShopCreateRequest req, String vendorEmail) {
        Integer vendorId = resolveVendorId(vendorEmail);

        // Uniqueness check
        boolean nameExists = Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) > 0 FROM shop WHERE name = ? AND status != 'disabled'",
                Boolean.class, req.getName()));
        if (nameExists) {
            throw new IllegalArgumentException("A shop with this name already exists.");
        }

        String tagsJson   = toJson(req.getTags());
        String hoursJson  = toJson(req.getOpeningHours());

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            var ps = con.prepareStatement(
                    """
                    INSERT INTO shop
                        (vendor_id, avatar_file_id, name, description,
                         cuisine_style, tags, opening_hours,
                         vi_audio_file_id, en_audio_file_id,
                         status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
                    """,
                    Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, vendorId);
            ps.setObject(2, req.getAvatarFileId());
            ps.setString(3, req.getName());
            ps.setString(4, req.getDescription());
            ps.setString(5, req.getSpecialtyDescription());
            ps.setString(6, tagsJson);
            ps.setString(7, hoursJson);
            ps.setObject(8, req.getViAudioFileId());
            ps.setObject(9, req.getEnAudioFileId());
            return ps;
        }, keyHolder);

        int shopId = keyHolder.getKey().intValue();

        // Insert additional images
        if (req.getAdditionalImageIds() != null) {
            for (int i = 0; i < req.getAdditionalImageIds().size(); i++) {
                int fileId = req.getAdditionalImageIds().get(i);
                jdbcTemplate.update(
                        "INSERT INTO shop_image (shop_id, file_id, sort_order) VALUES (?, ?, ?)",
                        shopId, fileId, i);
            }
        }

        // Async admin notification
        emailService.sendAdminNewShopNotification(req.getName(), vendorEmail);

        log.info("Shop profile created: shopId={}, vendor={}, status=pending", shopId, vendorEmail);

        return ShopCreateResponse.builder()
                .shopId(shopId)
                .name(req.getName())
                .status("pending")
                .message("Tạo gian hàng thành công, đang chờ duyệt")
                .createdAt(LocalDateTime.now())
                .build();
    }

    // ── Read ─────────────────────────────────────────────────────────────────

    @ReadOnly
    public List<ShopResponse> getMyShops(String vendorEmail) {
        Integer vendorId = resolveVendorId(vendorEmail);
        return jdbcTemplate.query(
                """
                SELECT s.shop_id, s.name, s.description, s.cuisine_style, s.featured_dish,
                       s.status, s.poi_id, s.opening_hours, s.tags,
                       s.created_at, s.updated_at,
                       fa.file_url AS avatar_url,
                       p.name     AS poi_name
                FROM shop s
                LEFT JOIN file_asset fa ON fa.file_id = s.avatar_file_id
                LEFT JOIN poi        p  ON p.poi_id   = s.poi_id
                WHERE s.vendor_id = ?
                ORDER BY s.created_at DESC
                """,
                (rs, rowNum) -> ShopResponse.builder()
                        .shopId(rs.getInt("shop_id"))
                        .name(rs.getString("name"))
                        .description(rs.getString("description"))
                        .cuisineStyle(rs.getString("cuisine_style"))
                        .featuredDish(rs.getString("featured_dish"))
                        .status(rs.getString("status"))
                        .poiId(rs.getObject("poi_id") != null ? rs.getInt("poi_id") : null)
                        .poiName(rs.getString("poi_name"))
                        .avatarUrl(rs.getString("avatar_url"))
                        .openingHours(rs.getString("opening_hours"))
                        .tags(rs.getString("tags"))
                        .createdAt(rs.getTimestamp("created_at") != null
                                ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                        .updatedAt(rs.getTimestamp("updated_at") != null
                                ? rs.getTimestamp("updated_at").toLocalDateTime() : null)
                        .build(),
                vendorId
        );
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Integer resolveVendorId(String vendorEmail) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT user_id FROM user WHERE email = ?",
                    Integer.class, vendorEmail);
        } catch (EmptyResultDataAccessException e) {
            throw new UserNotFoundException("Vendor not found: " + vendorEmail);
        }
    }

    private String toJson(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize JSON field", e);
        }
    }
}

