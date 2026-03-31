package com.flavortales.content.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flavortales.common.annotation.ReadOnly;
import com.flavortales.common.exception.UserNotFoundException;
import com.flavortales.content.dto.AdminShopResponse;
import com.flavortales.content.dto.ShopCreateRequest;
import com.flavortales.content.dto.ShopCreateResponse;
import com.flavortales.content.dto.ShopResponse;
import com.flavortales.content.dto.ShopUpdateRequest;
import com.flavortales.content.service.translation.ShopTranslationOrchestrator;
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
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShopService {

    private final JdbcTemplate jdbcTemplate;
    private final EmailService emailService;
    private final ObjectMapper objectMapper;
    private final ShopTranslationOrchestrator shopTranslationOrchestrator;

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
                         status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
                    """,
                    Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, vendorId);
            ps.setObject(2, req.getAvatarFileId());
            ps.setString(3, req.getName());
            ps.setString(4, req.getDescription());
            ps.setString(5, req.getSpecialtyDescription());
            ps.setString(6, tagsJson);
            ps.setString(7, hoursJson);
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

    // ── Admin ─────────────────────────────────────────────────────────────────

    /** Returns full detail for a single shop owned by the vendor (any status). */
    @ReadOnly
    public AdminShopResponse getMyShopDetail(Integer shopId, String vendorEmail) {
        Integer vendorId = resolveVendorId(vendorEmail);

        List<AdminShopResponse> rows = jdbcTemplate.query(
                """
                SELECT s.shop_id, s.name, s.description, s.cuisine_style, s.featured_dish,
                       s.status, s.poi_id, s.opening_hours, s.tags,
                       s.created_at, s.updated_at,
                       fa_avatar.file_url             AS avatar_url,
                       p.name                         AS poi_name
                FROM shop s
                LEFT JOIN file_asset fa_avatar ON fa_avatar.file_id = s.avatar_file_id
                LEFT JOIN poi        p          ON p.poi_id          = s.poi_id
                WHERE s.shop_id = ? AND s.vendor_id = ?
                """,
                (rs, rowNum) -> AdminShopResponse.builder()
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
                shopId, vendorId
        );

        if (rows.isEmpty()) {
            throw new IllegalArgumentException("Shop not found with id: " + shopId);
        }

        AdminShopResponse shop = rows.get(0);

        List<String> galleryUrls = jdbcTemplate.query(
                """
                SELECT fa.file_url
                FROM shop_image si
                JOIN file_asset fa ON fa.file_id = si.file_id
                WHERE si.shop_id = ?
                ORDER BY si.sort_order ASC
                """,
                (rs, rowNum) -> rs.getString("file_url"),
                shopId
        );
        shop.setGalleryUrls(galleryUrls);

        return shop;
    }

    /** Returns all shops with status='pending', ordered newest first. */
    @ReadOnly
    public List<AdminShopResponse> getPendingShops() {
        return jdbcTemplate.query(
                """
                SELECT s.shop_id, s.name, s.description, s.cuisine_style, s.featured_dish,
                       s.status, s.poi_id, s.opening_hours, s.tags,
                       s.created_at, s.updated_at,
                       fa.file_url   AS avatar_url,
                       p.name        AS poi_name,
                       u.email       AS vendor_email
                FROM shop s
                LEFT JOIN file_asset fa ON fa.file_id = s.avatar_file_id
                LEFT JOIN poi        p  ON p.poi_id   = s.poi_id
                LEFT JOIN user       u  ON u.user_id  = s.vendor_id
                WHERE s.status = 'pending'
                ORDER BY s.created_at DESC
                """,
                (rs, rowNum) -> AdminShopResponse.builder()
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
                        .vendorEmail(rs.getString("vendor_email"))
                        .createdAt(rs.getTimestamp("created_at") != null
                                ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                        .updatedAt(rs.getTimestamp("updated_at") != null
                                ? rs.getTimestamp("updated_at").toLocalDateTime() : null)
                        .build()
        );
    }

    /** Returns full detail for a single shop (any status) for admin review. */
    @ReadOnly
    public AdminShopResponse getShopDetailForAdmin(Integer shopId) {
        List<AdminShopResponse> rows = jdbcTemplate.query(
                """
                SELECT s.shop_id, s.name, s.description, s.cuisine_style, s.featured_dish,
                       s.status, s.poi_id, s.opening_hours, s.tags,
                       s.created_at, s.updated_at,
                       fa_avatar.file_url             AS avatar_url,
                       p.name                         AS poi_name,
                       p.latitude                     AS poi_latitude,
                       p.longitude                    AS poi_longitude,
                       p.radius                       AS poi_radius,
                       u.email                        AS vendor_email
                FROM shop s
                LEFT JOIN file_asset fa_avatar ON fa_avatar.file_id = s.avatar_file_id
                LEFT JOIN poi        p          ON p.poi_id          = s.poi_id
                LEFT JOIN user       u          ON u.user_id         = s.vendor_id
                WHERE s.shop_id = ?
                """,
                (rs, rowNum) -> AdminShopResponse.builder()
                        .shopId(rs.getInt("shop_id"))
                        .name(rs.getString("name"))
                        .description(rs.getString("description"))
                        .cuisineStyle(rs.getString("cuisine_style"))
                        .featuredDish(rs.getString("featured_dish"))
                        .status(rs.getString("status"))
                        .poiId(rs.getObject("poi_id") != null ? rs.getInt("poi_id") : null)
                        .poiName(rs.getString("poi_name"))
                        .latitude(rs.getObject("poi_latitude") != null ? rs.getDouble("poi_latitude") : null)
                        .longitude(rs.getObject("poi_longitude") != null ? rs.getDouble("poi_longitude") : null)
                        .radius(rs.getObject("poi_radius") != null ? rs.getInt("poi_radius") : null)
                        .avatarUrl(rs.getString("avatar_url"))
                        .openingHours(rs.getString("opening_hours"))
                        .tags(rs.getString("tags"))
                        .vendorEmail(rs.getString("vendor_email"))
                        .createdAt(rs.getTimestamp("created_at") != null
                                ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                        .updatedAt(rs.getTimestamp("updated_at") != null
                                ? rs.getTimestamp("updated_at").toLocalDateTime() : null)
                        .build(),
                shopId
        );

        if (rows.isEmpty()) {
            throw new IllegalArgumentException("Shop not found with id: " + shopId);
        }

        AdminShopResponse shop = rows.get(0);

        // Fetch gallery image URLs
        List<String> galleryUrls = jdbcTemplate.query(
                """
                SELECT fa.file_url
                FROM shop_image si
                JOIN file_asset fa ON fa.file_id = si.file_id
                WHERE si.shop_id = ?
                ORDER BY si.sort_order ASC
                """,
                (rs, rowNum) -> rs.getString("file_url"),
                shopId
        );
        shop.setGalleryUrls(galleryUrls);

        return shop;
    }

    /** Approves a pending shop and its linked POI (sets both to status='active'). */
    @Transactional
    public void approveShop(Integer shopId, String notes) {
        // Fetch poi_id and vendor email in one query
        Map<String, Object> shopMeta = jdbcTemplate.queryForMap(
                "SELECT s.poi_id, u.email AS vendor_email, s.name " +
                "FROM shop s JOIN user u ON u.user_id = s.vendor_id " +
                "WHERE s.shop_id = ? AND s.status = 'pending'",
                shopId);

        int updated = jdbcTemplate.update(
                "UPDATE shop SET status = 'active', updated_at = NOW() WHERE shop_id = ?",
                shopId);
        if (updated == 0) {
            throw new IllegalArgumentException("Shop not found or is not in pending status: " + shopId);
        }

        Integer poiId = (Integer) shopMeta.get("poi_id");
        if (poiId != null) {
            jdbcTemplate.update(
                    "UPDATE poi SET status = 'active', updated_at = NOW() WHERE poi_id = ?",
                    poiId);
        }

        String vendorEmail = (String) shopMeta.get("vendor_email");
        String shopName    = (String) shopMeta.get("name");
        emailService.sendShopApprovedEmail(vendorEmail, shopName, notes);

        log.info("Admin approved shopId={}, poiId={}", shopId, poiId);
    }

    /** Rejects a pending shop and its linked POI (sets both to status='rejected'). */
    @Transactional
    public void rejectShop(Integer shopId, String notes) {
        // Fetch poi_id and vendor email in one query
        Map<String, Object> shopMeta = jdbcTemplate.queryForMap(
                "SELECT s.poi_id, u.email AS vendor_email, s.name " +
                "FROM shop s JOIN user u ON u.user_id = s.vendor_id " +
                "WHERE s.shop_id = ? AND s.status = 'pending'",
                shopId);

        int updated = jdbcTemplate.update(
                "UPDATE shop SET status = 'rejected', updated_at = NOW() WHERE shop_id = ?",
                shopId);
        if (updated == 0) {
            throw new IllegalArgumentException("Shop not found or is not in pending status: " + shopId);
        }

        Integer poiId = (Integer) shopMeta.get("poi_id");
        if (poiId != null) {
            jdbcTemplate.update(
                    "UPDATE poi SET status = 'rejected', updated_at = NOW() WHERE poi_id = ?",
                    poiId);
        }

        String vendorEmail = (String) shopMeta.get("vendor_email");
        String shopName    = (String) shopMeta.get("name");
        emailService.sendShopRejectedEmail(vendorEmail, shopName, notes);

        log.info("Admin rejected shopId={}, poiId={}", shopId, poiId);
    }

    // ── Update (vendor) ───────────────────────────────────────────────────────

    /**
     * Vendor updates their shop profile.
     * All editable fields are replaced with the supplied values.
     * After update, both the shop and its linked POI transition to status = pending
     * so that the admin can re-review the new content.
     */
    @Transactional
    public void updateShop(Integer shopId, ShopUpdateRequest req, String vendorEmail) {
        Integer vendorId = resolveVendorId(vendorEmail);

        // Verify ownership
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT shop_id, poi_id FROM shop WHERE shop_id = ? AND vendor_id = ? AND status != 'disabled'",
                shopId, vendorId);
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("Shop not found or you do not own it: " + shopId);
        }
        Integer poiId = (Integer) rows.get(0).get("poi_id");

        // Name uniqueness (ignore the current shop itself)
        boolean nameConflict = Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) > 0 FROM shop WHERE name = ? AND shop_id != ? AND status != 'disabled'",
                Boolean.class, req.getName(), shopId));
        if (nameConflict) {
            throw new IllegalArgumentException("A shop with this name already exists.");
        }

        String tagsJson  = toJson(req.getTags());
        String hoursJson = toJson(req.getOpeningHours());

        jdbcTemplate.update(
                """
                UPDATE shop SET
                    name = ?, description = ?, cuisine_style = ?,
                    avatar_file_id = COALESCE(?, avatar_file_id),
                    tags = ?, opening_hours = ?,
                    status = 'pending', updated_at = NOW()
                WHERE shop_id = ?
                """,
                req.getName(), req.getDescription(), req.getSpecialtyDescription(),
                req.getAvatarFileId(), tagsJson, hoursJson,
                shopId);

        // Replace gallery images only when a new list is explicitly provided
        if (req.getAdditionalImageIds() != null) {
            jdbcTemplate.update("DELETE FROM shop_image WHERE shop_id = ?", shopId);
            for (int i = 0; i < req.getAdditionalImageIds().size(); i++) {
                jdbcTemplate.update(
                        "INSERT INTO shop_image (shop_id, file_id, sort_order) VALUES (?, ?, ?)",
                        shopId, req.getAdditionalImageIds().get(i), i);
            }
        }

        // Set linked POI to pending as well
        if (poiId != null) {
            jdbcTemplate.update(
                    "UPDATE poi SET status = 'pending', updated_at = NOW() WHERE poi_id = ?",
                    poiId);
        }

        log.info("Shop {} updated by vendor {}, status reset to pending (poiId={})", shopId, vendorEmail, poiId);

        shopTranslationOrchestrator.translateAndSave(shopId);
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

