package com.flavortales.poi.service;

import com.flavortales.common.annotation.ReadOnly;
import com.flavortales.common.exception.DuplicatePoiLocationException;
import com.flavortales.common.exception.PoiNotFoundException;
import com.flavortales.common.exception.ShopAlreadyHasPoiException;
import com.flavortales.common.exception.ShopNotFoundException;
import com.flavortales.common.exception.UserNotFoundException;
import com.flavortales.notification.service.EmailService;
import com.flavortales.poi.dto.CreatePoiRequest;
import com.flavortales.poi.dto.PoiResponse;
import com.flavortales.poi.dto.ShopOptionDto;
import com.flavortales.poi.dto.UpdatePoiRequest;
import com.flavortales.poi.entity.Poi;
import com.flavortales.poi.entity.PoiStatus;
import com.flavortales.poi.mapper.PoiMapper;
import com.flavortales.poi.repository.PoiRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * FR-PM-001: Create POI
 *
 * <p>Read path: Redis → (cache miss) Slave DB via {@link PoiCacheService} + {@code @ReadOnly}.
 * Write path: Master DB via {@code @Transactional}, then cache update / eviction.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PoiService {

    private final PoiRepository    poiRepository;
    private final PoiCacheService  poiCacheService;
    private final PoiMapper        poiMapper;
    private final JdbcTemplate     jdbcTemplate;
    private final EmailService     emailService;

    @Value("${app.poi.boundary.center-lat}")
    private double boundaryCenterLat;

    @Value("${app.poi.boundary.center-lng}")
    private double boundaryCenterLng;

    @Value("${app.poi.boundary.max-radius-m}")
    private double boundaryMaxRadiusM;

    // ── Create ────────────────────────────────────────────────────────────────

    @Transactional
    public PoiResponse createPoi(CreatePoiRequest request, String vendorEmail) {
        double lat = request.getLatitude().doubleValue();
        double lng = request.getLongitude().doubleValue();

        // 1. Validate coordinates within the food-street boundary
        validateBoundary(lat, lng);

        // 2. Validate shop if provided: exists, belongs to this vendor, has no POI yet
        if (request.getShopId() != null) {
            validateShop(request.getShopId(), vendorEmail);
        }

        // 3. Check for proximity conflict (no existing POI within 5 m)
        checkProximityConflict(lat, lng);

        // 4. Persist POI (status = active per FR-PM-001)
        Integer vendorId = resolveVendorId(vendorEmail);
        Poi poi = Poi.builder()
                .vendorId(vendorId)
                .name(request.getName())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .radius(request.getRadius())
                .status(PoiStatus.active)
                .build();
        poi = poiRepository.save(poi);

        // 5. Link the shop to this POI if shopId was provided
        if (request.getShopId() != null) {
            jdbcTemplate.update(
                    "UPDATE shop SET poi_id = ? WHERE shop_id = ?",
                    poi.getPoiId(), request.getShopId()
            );
        }

        // 6. Build response and update cache
        PoiResponse response = poiMapper.toResponse(poi);
        response.setLinkedShopId(request.getShopId());
        poiCacheService.put(response);
        poiCacheService.evictActivePoisList();

        // 7. Notify vendor (async, fire-and-forget)
        emailService.sendPoiCreatedEmail(vendorEmail, response.getName());

        log.info("POI {} created by vendor {} (shopId={})",
                poi.getPoiId(), vendorEmail, request.getShopId());
        return response;
    }

    // ── Update ────────────────────────────────────────────────────────────────

    /**
     * FR-PM-004: Update POI
     *
     * <p>Only the POI's owner (vendor) may perform updates.
     * All fields are optional; omitted fields keep their current value.
     */
    @Transactional
    public PoiResponse updatePoi(Integer poiId, UpdatePoiRequest request, String vendorEmail) {
        // 1. Load POI and verify ownership
        Poi poi = poiRepository.findById(poiId)
                .orElseThrow(() -> new PoiNotFoundException("POI not found with id: " + poiId));
        Integer vendorId = resolveVendorId(vendorEmail);
        if (!poi.getVendorId().equals(vendorId)) {
            throw new IllegalArgumentException("You do not own this POI");
        }

        // 2. Determine effective coordinates for validation
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

        // 3. Resolve the current linked shop
        List<Integer> currentShopIds = jdbcTemplate.query(
                "SELECT shop_id FROM shop WHERE poi_id = ?",
                (rs, rowNum) -> rs.getInt("shop_id"),
                poiId
        );
        Integer currentShopId = currentShopIds.isEmpty() ? null : currentShopIds.get(0);

        // 4. Handle shop link changes
        boolean shopChanged = false;
        Integer newLinkedShopId = currentShopId; // default: keep current
        if (request.getShopId() != null) {
            int requestedShopId = request.getShopId();
            if (requestedShopId == 0) {
                // Unlink current shop
                if (currentShopId != null) {
                    jdbcTemplate.update("UPDATE shop SET poi_id = NULL WHERE poi_id = ?", poiId);
                    shopChanged = true;
                }
                newLinkedShopId = null;
            } else if (requestedShopId != (currentShopId != null ? currentShopId : -1)) {
                // Link to a different shop — validate & relink
                validateShopForUpdate(requestedShopId, vendorEmail);
                if (currentShopId != null) {
                    jdbcTemplate.update("UPDATE shop SET poi_id = NULL WHERE poi_id = ?", poiId);
                }
                jdbcTemplate.update("UPDATE shop SET poi_id = ? WHERE shop_id = ?", poiId, requestedShopId);
                shopChanged = true;
                newLinkedShopId = requestedShopId;
            }
        }

        // 5. Apply field updates to entity
        if (request.getName()      != null) poi.setName(request.getName());
        if (request.getLatitude()  != null) poi.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) poi.setLongitude(request.getLongitude());
        if (request.getRadius()    != null) poi.setRadius(request.getRadius());
        poi = poiRepository.save(poi);

        // 6. Build response
        PoiResponse response = poiMapper.toResponse(poi);
        response.setLinkedShopId(newLinkedShopId);

        // 7. Invalidate cache
        poiCacheService.evict(poiId);
        poiCacheService.evictActivePoisList();

        // 8. Notify vendor for significant changes (location or shop)
        if (coordsChanged || shopChanged) {
            emailService.sendPoiUpdatedEmail(vendorEmail, response.getName());
        }

        log.info("POI {} updated by vendor {} (coordsChanged={}, shopChanged={})",
                poiId, vendorEmail, coordsChanged, shopChanged);
        return response;
    }

    // ── Get single POI (vendor-scoped) ────────────────────────────────────────

    @ReadOnly
    public PoiResponse getPoiById(Integer poiId, String vendorEmail) {
        Integer vendorId = resolveVendorId(vendorEmail);
        List<PoiResponse> results = jdbcTemplate.query(
                """
                SELECT p.poi_id, p.name, p.latitude, p.longitude,
                       p.radius, p.status, p.created_at, p.updated_at,
                       s.shop_id AS linked_shop_id, s.name AS linked_shop_name
                FROM poi p
                LEFT JOIN shop s ON s.poi_id = p.poi_id
                WHERE p.poi_id = ? AND p.vendor_id = ?
                """,
                (rs, rowNum) -> PoiResponse.builder()
                        .poiId(rs.getInt("poi_id"))
                        .name(rs.getString("name"))
                        .latitude(rs.getBigDecimal("latitude"))
                        .longitude(rs.getBigDecimal("longitude"))
                        .radius(rs.getBigDecimal("radius"))
                        .status(rs.getString("status"))
                        .linkedShopId(rs.getObject("linked_shop_id") != null ? rs.getInt("linked_shop_id") : null)
                        .linkedShopName(rs.getString("linked_shop_name"))
                        .createdAt(rs.getTimestamp("created_at") != null
                                ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                        .updatedAt(rs.getTimestamp("updated_at") != null
                                ? rs.getTimestamp("updated_at").toLocalDateTime() : null)
                        .build(),
                poiId, vendorId
        );
        if (results.isEmpty()) {
            throw new PoiNotFoundException("POI not found with id: " + poiId);
        }
        return results.get(0);
    }

    // ── Vendor shop dropdown (shops without a POI) ────────────────────────────

    @ReadOnly
    public List<ShopOptionDto> getAvailableShops(String vendorEmail) {
        Integer vendorId = resolveVendorId(vendorEmail);
        return jdbcTemplate.query(
                "SELECT shop_id, name FROM shop WHERE vendor_id = ? AND poi_id IS NULL AND status = 'active'",
                (rs, rowNum) -> new ShopOptionDto(rs.getInt("shop_id"), rs.getString("name")),
                vendorId
        );
    }

    // ── Active POI list (with Redis read-through to slave) ───────────────────

    @ReadOnly
    public List<PoiResponse> getActivePois() {
        List<PoiResponse> cached = poiCacheService.getActivePoisFromCache();
        if (cached != null) {
            return cached;
        }
        List<PoiResponse> pois = poiRepository.findByStatus(PoiStatus.active)
                .stream()
                .map(poiMapper::toResponse)
                .toList();
        poiCacheService.putActivePois(pois);
        return pois;
    }

    // ── My POIs (vendor-specific, direct vendor_id lookup) ───────────────────

    @ReadOnly
    public List<PoiResponse> getMyPois(String vendorEmail) {
        Integer vendorId = resolveVendorId(vendorEmail);
        return jdbcTemplate.query(
                """
                SELECT p.poi_id, p.name, p.latitude, p.longitude,
                       p.radius, p.status, p.created_at, p.updated_at,
                       s.shop_id AS linked_shop_id, s.name AS linked_shop_name
                FROM poi p
                LEFT JOIN shop s ON s.poi_id = p.poi_id
                WHERE p.vendor_id = ?
                ORDER BY p.created_at DESC
                """,
                (rs, rowNum) -> PoiResponse.builder()
                        .poiId(rs.getInt("poi_id"))
                        .name(rs.getString("name"))
                        .latitude(rs.getBigDecimal("latitude"))
                        .longitude(rs.getBigDecimal("longitude"))
                        .radius(rs.getBigDecimal("radius"))
                        .status(rs.getString("status"))
                        .linkedShopId(rs.getObject("linked_shop_id") != null ? rs.getInt("linked_shop_id") : null)
                        .linkedShopName(rs.getString("linked_shop_name"))
                        .createdAt(rs.getTimestamp("created_at") != null
                                ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                        .updatedAt(rs.getTimestamp("updated_at") != null
                                ? rs.getTimestamp("updated_at").toLocalDateTime() : null)
                        .build(),
                vendorId
        );
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    /**
     * FR-PM-DEL: Delete POI (soft or hard).
     *
     * <p>Soft delete (default): sets {@code status = deleted} and {@code deleted_at = now()}.
     * The POI is removed from the map and active list but kept in the DB for 30 days.
     *
     * <p>Hard delete: permanently removes the row.
     *
     * <p>In both cases the linked shop's {@code poi_id} is cleared so the shop
     * remains intact (per requirements: "Thông tin cửa hàng được giữ nguyên").
     */
    @Transactional
    public void deletePoi(Integer poiId, String vendorEmail, boolean hardDelete) {
        // 1. Load POI and verify ownership
        Poi poi = poiRepository.findById(poiId)
                .orElseThrow(() -> new PoiNotFoundException("POI not found with id: " + poiId));
        Integer vendorId = resolveVendorId(vendorEmail);
        if (!poi.getVendorId().equals(vendorId)) {
            throw new IllegalArgumentException("You do not own this POI");
        }

        // 2. Unlink any associated shop (keep shop data intact)
        jdbcTemplate.update("UPDATE shop SET poi_id = NULL WHERE poi_id = ?", poiId);

        if (hardDelete) {
            // 3a. Hard delete – permanent removal
            poiRepository.delete(poi);
            log.info("POI {} hard-deleted by vendor {}", poiId, vendorEmail);
        } else {
            // 3b. Soft delete – mark as deleted with timestamp
            poi.setStatus(PoiStatus.deleted);
            poi.setDeletedAt(java.time.LocalDateTime.now());
            poiRepository.save(poi);
            log.info("POI {} soft-deleted by vendor {}", poiId, vendorEmail);
        }

        // 4. Evict from cache
        poiCacheService.evict(poiId);
        poiCacheService.evictActivePoisList();
    }

    // ── Validation helpers ────────────────────────────────────────────────────

    private void validateBoundary(double lat, double lng) {
        double distanceM = haversineMetres(lat, lng, boundaryCenterLat, boundaryCenterLng);
        if (distanceM > boundaryMaxRadiusM) {
            throw new IllegalArgumentException(
                    "Coordinates are outside the permitted food-street area (%.0f m from centre, max %.0f m)"
                            .formatted(distanceM, boundaryMaxRadiusM)
            );
        }
    }

    private void validateShop(Integer shopId, String vendorEmail) {
        Integer vendorId = resolveVendorId(vendorEmail);

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT vendor_id, poi_id FROM shop WHERE shop_id = ?",
                shopId
        );
        if (rows.isEmpty()) {
            throw new ShopNotFoundException("Shop not found with id: " + shopId);
        }

        Map<String, Object> shop = rows.get(0);
        Integer shopVendorId = (Integer) shop.get("vendor_id");
        if (!shopVendorId.equals(vendorId)) {
            throw new IllegalArgumentException("Shop does not belong to this vendor");
        }
        if (shop.get("poi_id") != null) {
            throw new ShopAlreadyHasPoiException("Shop already has a POI assigned to it");
        }
    }

    /**
     * Validates a shop for use in a POI update (ownership check only;
     * the shop must be unlinked — i.e. not already assigned to any POI).
     */
    private void validateShopForUpdate(Integer shopId, String vendorEmail) {
        Integer vendorId = resolveVendorId(vendorEmail);
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT vendor_id, poi_id FROM shop WHERE shop_id = ?",
                shopId
        );
        if (rows.isEmpty()) {
            throw new ShopNotFoundException("Shop not found with id: " + shopId);
        }
        Map<String, Object> shop = rows.get(0);
        if (!((Integer) shop.get("vendor_id")).equals(vendorId)) {
            throw new IllegalArgumentException("Shop does not belong to this vendor");
        }
        if (shop.get("poi_id") != null) {
            throw new ShopAlreadyHasPoiException("Shop already has a POI assigned to it");
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
                    existing.getLongitude().doubleValue()
            );
            if (distanceM < 5.0) {
                throw new DuplicatePoiLocationException(
                        "A POI already exists within 5 metres of the given location (POI id: %d, distance: %.2f m)"
                                .formatted(existing.getPoiId(), distanceM)
                );
            }
        }
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

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

    /**
     * Haversine formula – returns distance in metres between two WGS-84 coordinates.
     */
    private static double haversineMetres(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6_371_000.0; // Earth radius in metres
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                  * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
