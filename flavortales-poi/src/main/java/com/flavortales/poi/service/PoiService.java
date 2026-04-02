package com.flavortales.poi.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flavortales.common.annotation.ReadOnly;
import com.flavortales.common.exception.DuplicatePoiLocationException;
import com.flavortales.common.exception.PoiNotFoundException;
import com.flavortales.common.exception.UserNotFoundException;
import com.flavortales.notification.service.EmailService;
import com.flavortales.poi.dto.CreatePoiRequest;
import com.flavortales.poi.dto.PoiResponse;
import com.flavortales.poi.dto.UpdatePoiRequest;
import com.flavortales.poi.service.translation.PoiTranslationOrchestrator;
import com.flavortales.poi.entity.Poi;
import com.flavortales.poi.entity.PoiStatus;
import com.flavortales.poi.mapper.PoiMapper;
import com.flavortales.poi.repository.PoiRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Statement;
import java.util.List;

/**
 * FR-PM-001 / UC-14: POI management service.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PoiService {

    private final PoiRepository   poiRepository;
    private final PoiCacheService poiCacheService;
    private final PoiMapper       poiMapper;
    private final JdbcTemplate    jdbcTemplate;
    private final EmailService    emailService;
    private final ObjectMapper    objectMapper;
    private final PoiTranslationOrchestrator poiTranslationOrchestrator;

    @Value("${app.poi.boundary.center-lat}")
    private double boundaryCenterLat;

    @Value("${app.poi.boundary.center-lng}")
    private double boundaryCenterLng;

    @Value("${app.poi.boundary.max-radius-m}")
    private double boundaryMaxRadiusM;

    //  Create 

    /**
     * UC-14 / FR-PM-001: Atomically create a POI + shop profile in one transaction.
     * The POI and shop are both saved with status = pending;
     * admin is notified for review.
     */
    @Transactional
    public PoiResponse createPoi(CreatePoiRequest request, String vendorEmail) {
        double lat = request.getLatitude().doubleValue();
        double lng = request.getLongitude().doubleValue();

        // 1. Validate coordinates within the food-street boundary
        validateBoundary(lat, lng);

        // 2. Check for proximity conflict (no existing POI within 5 m)
        checkProximityConflict(lat, lng);

        // 3. Validate shop name uniqueness
        boolean nameExists = Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) > 0 FROM shop WHERE name = ? AND status != 'disabled'",
                Boolean.class, request.getShopName()));
        if (nameExists) {
            throw new IllegalArgumentException("Ten gian hang da ton tai, vui long chon ten khac.");
        }

        Integer vendorId = resolveVendorId(vendorEmail);

        // 4. Persist POI with status = pending
        Poi poi = Poi.builder()
                .vendorId(vendorId)
                .name(request.getName())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .radius(java.math.BigDecimal.valueOf(request.getRadius()))
                .address(request.getAddress())
                .status(PoiStatus.pending)
                .build();
        poi = poiRepository.save(poi);
        final int poiId = poi.getPoiId();

        // 5. Create shop row linked to the new POI
        String tagsJson  = toJson(request.getTags());
        String hoursJson = toJson(request.getOpeningHours());

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(con -> {
            var ps = con.prepareStatement(
                    "INSERT INTO shop (vendor_id, poi_id, avatar_file_id, name, description, cuisine_style, tags, opening_hours, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setInt(1, vendorId);
            ps.setInt(2, poiId);
            ps.setObject(3, request.getAvatarFileId());
            ps.setString(4, request.getShopName());
            ps.setString(5, request.getShopDescription());
            ps.setString(6, request.getSpecialtyDescription());
            ps.setString(7, tagsJson);
            ps.setString(8, hoursJson);
            return ps;
        }, keyHolder);

        int shopId = keyHolder.getKey().intValue();

        // 6. Insert additional shop images
        if (request.getAdditionalImageIds() != null) {
            for (int i = 0; i < request.getAdditionalImageIds().size(); i++) {
                jdbcTemplate.update(
                        "INSERT INTO shop_image (shop_id, file_id, sort_order) VALUES (?, ?, ?)",
                        shopId, request.getAdditionalImageIds().get(i), i);
            }
        }

        // 7. Build response (pending POIs are not cached in the active list)
        PoiResponse response = poiMapper.toResponse(poi);
        response.setLinkedShopId(shopId);
        response.setLinkedShopName(request.getShopName());
        response.setMessage("Tao gian hang thanh cong, dang cho duyet");

        // 8. Notify admin async
        emailService.sendAdminNewShopNotification(request.getShopName(), vendorEmail);

        log.info("POI {} (pending) + shop {} created by vendor {}", poiId, shopId, vendorEmail);
        return response;
    }

    //  Update 

    @Transactional
    public PoiResponse updatePoi(Integer poiId, UpdatePoiRequest request, String vendorEmail) {
        Poi poi = poiRepository.findById(poiId)
                .orElseThrow(() -> new PoiNotFoundException("POI not found with id: " + poiId));
        Integer vendorId = resolveVendorId(vendorEmail);
        if (!poi.getVendorId().equals(vendorId)) {
            throw new IllegalArgumentException("You do not own this POI");
        }

        boolean coordsChanged = (request.getLatitude() != null || request.getLongitude() != null)
                && (request.getLatitude() != null && request.getLatitude().compareTo(poi.getLatitude()) != 0
                    || request.getLongitude() != null && request.getLongitude().compareTo(poi.getLongitude()) != 0);

        if (coordsChanged) {
            double newLat = request.getLatitude() != null
                    ? request.getLatitude().doubleValue() : poi.getLatitude().doubleValue();
            double newLng = request.getLongitude() != null
                    ? request.getLongitude().doubleValue() : poi.getLongitude().doubleValue();
            validateBoundary(newLat, newLng);
            checkProximityConflict(newLat, newLng, poiId);
        }

        List<Integer> currentShopIds = jdbcTemplate.query(
                "SELECT shop_id FROM shop WHERE poi_id = ?",
                (rs, rowNum) -> rs.getInt("shop_id"),
                poiId);
        Integer currentShopId = currentShopIds.isEmpty() ? null : currentShopIds.get(0);

        if (request.getName()      != null) poi.setName(request.getName());
        if (request.getLatitude()  != null) poi.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) poi.setLongitude(request.getLongitude());
        if (request.getRadius()    != null) poi.setRadius(request.getRadius());
        if (request.getAddress()   != null) poi.setAddress(request.getAddress());
        poi = poiRepository.save(poi);

        PoiResponse response = poiMapper.toResponse(poi);
        response.setLinkedShopId(currentShopId);

        poiCacheService.evict(poiId);
        poiCacheService.evictActivePoisList();

        if (coordsChanged) {
            emailService.sendPoiUpdatedEmail(vendorEmail, response.getName());
        }

        Poi savedPoi = poi;
        poiTranslationOrchestrator.translateAndSave(savedPoi);

        log.info("POI {} updated by vendor {} (coordsChanged={})", poiId, vendorEmail, coordsChanged);
        return response;
    }

    //  Like / Unlike (FR-LM-007 §popularity) 

    @Transactional
    public int likePoi(Integer poiId, String sessionId) {
        boolean exists = Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) > 0 FROM poi WHERE poi_id = ? AND status = 'active'",
                Boolean.class, poiId));
        if (!exists) throw new PoiNotFoundException("POI not found: " + poiId);

        boolean alreadyLiked = Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) > 0 FROM poi_likes WHERE poi_id = ? AND session_id = ?",
                Boolean.class, poiId, sessionId));
        if (alreadyLiked) {
            return jdbcTemplate.queryForObject(
                    "SELECT likes_count FROM poi WHERE poi_id = ?", Integer.class, poiId);
        }

        jdbcTemplate.update(
                "INSERT INTO poi_likes (poi_id, session_id, created_at) VALUES (?, ?, NOW())",
                poiId, sessionId);
        jdbcTemplate.update(
                "UPDATE poi SET likes_count = likes_count + 1 WHERE poi_id = ?", poiId);
        poiCacheService.evict(poiId);
        poiCacheService.evictActivePoisList();
        log.info("POI {} liked by session {}", poiId, sessionId);
        return jdbcTemplate.queryForObject(
                "SELECT likes_count FROM poi WHERE poi_id = ?", Integer.class, poiId);
    }

    @Transactional
    public int unlikePoi(Integer poiId, String sessionId) {
        boolean liked = Boolean.TRUE.equals(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) > 0 FROM poi_likes WHERE poi_id = ? AND session_id = ?",
                Boolean.class, poiId, sessionId));
        if (!liked) {
            return jdbcTemplate.queryForObject(
                    "SELECT likes_count FROM poi WHERE poi_id = ?", Integer.class, poiId);
        }

        jdbcTemplate.update(
                "DELETE FROM poi_likes WHERE poi_id = ? AND session_id = ?", poiId, sessionId);
        jdbcTemplate.update(
                "UPDATE poi SET likes_count = GREATEST(likes_count - 1, 0) WHERE poi_id = ?", poiId);
        poiCacheService.evict(poiId);
        poiCacheService.evictActivePoisList();
        log.info("POI {} unliked by session {}", poiId, sessionId);
        return jdbcTemplate.queryForObject(
                "SELECT likes_count FROM poi WHERE poi_id = ?", Integer.class, poiId);
    }

    //  Get single POI 

    @ReadOnly
    public PoiResponse getPoiById(Integer poiId, String vendorEmail) {
        Integer vendorId = resolveVendorId(vendorEmail);
        List<PoiResponse> results = jdbcTemplate.query(
                "SELECT p.poi_id, p.name, p.latitude, p.longitude, p.radius, p.address, p.status, p.likes_count, p.created_at, p.updated_at, " +
                "s.shop_id AS linked_shop_id, s.name AS linked_shop_name, fa.file_url AS shop_avatar_url " +
                "FROM poi p LEFT JOIN shop s ON s.poi_id = p.poi_id " +
                "LEFT JOIN file_asset fa ON fa.file_id = s.avatar_file_id " +
                "WHERE p.poi_id = ? AND p.vendor_id = ?",
                (rs, rowNum) -> PoiResponse.builder()
                        .poiId(rs.getInt("poi_id"))
                        .name(rs.getString("name"))
                        .latitude(rs.getBigDecimal("latitude"))
                        .longitude(rs.getBigDecimal("longitude"))
                        .radius(rs.getBigDecimal("radius"))
                        .address(rs.getString("address"))
                        .status(rs.getString("status"))
                        .likesCount(rs.getInt("likes_count"))
                        .linkedShopId(rs.getObject("linked_shop_id") != null ? rs.getInt("linked_shop_id") : null)
                        .linkedShopName(rs.getString("linked_shop_name"))
                        .linkedShopAvatarUrl(rs.getString("shop_avatar_url"))
                        .createdAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                        .updatedAt(rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toLocalDateTime() : null)
                        .build(),
                poiId, vendorId);
        if (results.isEmpty()) {
            throw new PoiNotFoundException("POI not found with id: " + poiId);
        }
        return results.get(0);
    }

    //  Active POI list 

    @ReadOnly
    public List<PoiResponse> getActivePois() {
        List<PoiResponse> cached = poiCacheService.getActivePoisFromCache();
        if (cached != null) return cached;
        List<PoiResponse> pois = jdbcTemplate.query(
                "SELECT p.poi_id, p.name, p.latitude, p.longitude, p.radius, p.address, p.status, p.likes_count, p.created_at, p.updated_at, " +
                "s.shop_id AS linked_shop_id, s.name AS linked_shop_name, fa.file_url AS shop_avatar_url, " +
                "s.description AS shop_description, s.tags AS shop_tags, s.opening_hours AS shop_opening_hours, " +
                "(SELECT GROUP_CONCAT(gfa.file_url ORDER BY si.sort_order SEPARATOR ',') " +
                " FROM shop_image si JOIN file_asset gfa ON gfa.file_id = si.file_id " +
                " WHERE si.shop_id = s.shop_id) AS gallery_urls " +
                "FROM poi p " +
                "LEFT JOIN shop s ON s.poi_id = p.poi_id AND s.status = 'active' " +
                "LEFT JOIN file_asset fa ON fa.file_id = s.avatar_file_id " +
                "WHERE p.status = 'active'",
                (rs, rowNum) -> {
                    List<String> tags = parseJsonList(rs.getString("shop_tags"), String.class);
                    List<PoiResponse.OpeningHoursDto> hours = parseJsonList(rs.getString("shop_opening_hours"), PoiResponse.OpeningHoursDto.class);
                    String galleryRaw = rs.getString("gallery_urls");
                    List<String> galleryUrls = (galleryRaw != null && !galleryRaw.isBlank())
                            ? java.util.Arrays.asList(galleryRaw.split(",")) : null;
                    return PoiResponse.builder()
                            .poiId(rs.getInt("poi_id"))
                            .name(rs.getString("name"))
                            .latitude(rs.getBigDecimal("latitude"))
                            .longitude(rs.getBigDecimal("longitude"))
                            .radius(rs.getBigDecimal("radius"))
                            .address(rs.getString("address"))
                            .status(rs.getString("status"))
                            .likesCount(rs.getInt("likes_count"))
                            .linkedShopId(rs.getObject("linked_shop_id") != null ? rs.getInt("linked_shop_id") : null)
                            .linkedShopName(rs.getString("linked_shop_name"))
                            .linkedShopAvatarUrl(rs.getString("shop_avatar_url"))
                            .shopDescription(rs.getString("shop_description"))
                            .shopTags(tags)
                            .shopOpeningHours(hours)
                            .shopGalleryUrls(galleryUrls)
                            .createdAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                            .updatedAt(rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toLocalDateTime() : null)
                            .build();
                });
        poiCacheService.putActivePois(pois);
        return pois;
    }

    private <T> List<T> parseJsonList(String json, Class<T> elementType) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, elementType));
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse JSON list: {}", json);
            return null;
        }
    }

    //  My POIs 

    @ReadOnly
    public List<PoiResponse> getMyPois(String vendorEmail) {
        Integer vendorId = resolveVendorId(vendorEmail);
        return jdbcTemplate.query(
                "SELECT p.poi_id, p.name, p.latitude, p.longitude, p.radius, p.address, p.status, p.likes_count, p.created_at, p.updated_at, " +
                "s.shop_id AS linked_shop_id, s.name AS linked_shop_name, fa.file_url AS shop_avatar_url " +
                "FROM poi p LEFT JOIN shop s ON s.poi_id = p.poi_id " +
                "LEFT JOIN file_asset fa ON fa.file_id = s.avatar_file_id " +
                "WHERE p.vendor_id = ? ORDER BY p.created_at DESC",
                (rs, rowNum) -> PoiResponse.builder()
                        .poiId(rs.getInt("poi_id"))
                        .name(rs.getString("name"))
                        .latitude(rs.getBigDecimal("latitude"))
                        .longitude(rs.getBigDecimal("longitude"))
                        .radius(rs.getBigDecimal("radius"))
                        .address(rs.getString("address"))
                        .status(rs.getString("status"))
                        .likesCount(rs.getInt("likes_count"))
                        .linkedShopId(rs.getObject("linked_shop_id") != null ? rs.getInt("linked_shop_id") : null)
                        .linkedShopName(rs.getString("linked_shop_name"))
                        .linkedShopAvatarUrl(rs.getString("shop_avatar_url"))
                        .createdAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                        .updatedAt(rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toLocalDateTime() : null)
                        .build(),
                vendorId);
    }

    //  Delete 

    @Transactional
    public void deletePoi(Integer poiId, String vendorEmail, boolean hardDelete) {
        Poi poi = poiRepository.findById(poiId)
                .orElseThrow(() -> new PoiNotFoundException("POI not found with id: " + poiId));
        Integer vendorId = resolveVendorId(vendorEmail);
        if (!poi.getVendorId().equals(vendorId)) {
            throw new IllegalArgumentException("You do not own this POI");
        }
        if (poi.getStatus() == PoiStatus.pending) {
            throw new IllegalStateException("Cannot delete a POI that is currently under review");
        }

        // Cascade-delete linked shops (audio records cascade automatically via FK)
        jdbcTemplate.update("DELETE FROM shop WHERE poi_id = ?", poiId);

        if (hardDelete) {
            poiRepository.delete(poi);
            log.info("POI {} hard-deleted by vendor {}", poiId, vendorEmail);
        } else {
            poi.setStatus(PoiStatus.deleted);
            poi.setDeletedAt(java.time.LocalDateTime.now());
            poiRepository.save(poi);
            log.info("POI {} soft-deleted by vendor {}", poiId, vendorEmail);
        }

        poiCacheService.evict(poiId);
        poiCacheService.evictActivePoisList();
    }

    //  Helpers 

    private void validateBoundary(double lat, double lng) {
        double distanceM = haversineMetres(lat, lng, boundaryCenterLat, boundaryCenterLng);
        if (distanceM > boundaryMaxRadiusM) {
            throw new IllegalArgumentException(
                    "Toa do nam ngoai khu pho am thuc (cach tam %.0f m, toi da %.0f m)"
                            .formatted(distanceM, boundaryMaxRadiusM));
        }
    }

    private void checkProximityConflict(double lat, double lng) {
        checkProximityConflict(lat, lng, null);
    }

    private void checkProximityConflict(double lat, double lng, Integer excludePoiId) {
        List<Poi> activePois = poiRepository.findByStatus(PoiStatus.active);
        for (Poi existing : activePois) {
            if (excludePoiId != null && existing.getPoiId().equals(excludePoiId)) continue;
            double distanceM = haversineMetres(
                    lat, lng,
                    existing.getLatitude().doubleValue(),
                    existing.getLongitude().doubleValue());
            if (distanceM < 5.0) {
                throw new DuplicatePoiLocationException(
                        "A POI already exists within 5 metres of the given location (POI id: %d, distance: %.2f m)"
                                .formatted(existing.getPoiId(), distanceM));
            }
        }
    }

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
            log.warn("Failed to serialize value to JSON: {}", e.getMessage());
            return null;
        }
    }

    private static double haversineMetres(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6_371_000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                  * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    public long countByStatus(PoiStatus status) {
        return poiRepository.countByStatus(status);
    }
}
