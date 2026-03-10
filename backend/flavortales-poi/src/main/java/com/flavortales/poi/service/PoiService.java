package com.flavortales.poi.service;

import com.flavortales.common.annotation.ReadOnly;
import com.flavortales.common.exception.DuplicatePoiLocationException;
import com.flavortales.common.exception.ShopAlreadyHasPoiException;
import com.flavortales.common.exception.ShopNotFoundException;
import com.flavortales.common.exception.UserNotFoundException;
import com.flavortales.notification.service.EmailService;
import com.flavortales.poi.dto.CreatePoiRequest;
import com.flavortales.poi.dto.PoiResponse;
import com.flavortales.poi.dto.ShopOptionDto;
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
                       s.shop_id AS linked_shop_id
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
                        .createdAt(rs.getTimestamp("created_at") != null
                                ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                        .updatedAt(rs.getTimestamp("updated_at") != null
                                ? rs.getTimestamp("updated_at").toLocalDateTime() : null)
                        .build(),
                vendorId
        );
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

    private void checkProximityConflict(double lat, double lng) {
        List<Poi> activePois = poiRepository.findByStatus(PoiStatus.active);
        for (Poi existing : activePois) {
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
