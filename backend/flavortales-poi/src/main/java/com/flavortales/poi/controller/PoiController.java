package com.flavortales.poi.controller;

import com.flavortales.common.dto.ApiResponse;
import com.flavortales.poi.dto.CreatePoiRequest;
import com.flavortales.poi.dto.PoiResponse;
import com.flavortales.poi.dto.ShopOptionDto;
import com.flavortales.poi.service.PoiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * FR-PM-001: POI Management endpoints.
 *
 * <p>All routes require a valid JWT (enforced globally by SecurityConfig).
 * Vendor-only actions additionally verify the {@code ROLE_vendor} authority
 * carried in the JWT.
 */
@RestController
@RequestMapping("/api/poi")
@RequiredArgsConstructor
public class PoiController {

    private final PoiService poiService;

    /**
     * POST /api/poi
     * Creates a new POI for the authenticated vendor.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<PoiResponse>> createPoi(
            @Valid @RequestBody CreatePoiRequest request,
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_vendor")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Only vendors can create POIs"));
        }

        String vendorEmail = authentication.getName();
        PoiResponse response = poiService.createPoi(request, vendorEmail);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("POI created successfully", response));
    }

    /**
     * GET /api/poi/shops/available
     * Returns the vendor's active shops that do not yet have a POI linked.
     * Used to populate the shop dropdown in the create-POI form.
     */
    @GetMapping("/shops/available")
    public ResponseEntity<ApiResponse<List<ShopOptionDto>>> getAvailableShops(
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_vendor")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Only vendors can access this resource"));
        }

        String vendorEmail = authentication.getName();
        List<ShopOptionDto> shops = poiService.getAvailableShops(vendorEmail);
        return ResponseEntity.ok(ApiResponse.success("Available shops retrieved", shops));
    }

    /**
     * GET /api/poi/my
     * Returns only the POIs that belong to the authenticated vendor's shops.
     */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<PoiResponse>>> getMyPois(
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_vendor")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Only vendors can access this resource"));
        }

        String vendorEmail = authentication.getName();
        List<PoiResponse> pois = poiService.getMyPois(vendorEmail);
        return ResponseEntity.ok(ApiResponse.success("Your POIs retrieved", pois));
    }

    /**
     * GET /api/poi
     * Returns all active POIs (Redis read-through to slave DB).
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<PoiResponse>>> getActivePois() {
        List<PoiResponse> pois = poiService.getActivePois();
        return ResponseEntity.ok(ApiResponse.success("Active POIs retrieved", pois));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private boolean hasRole(Authentication auth, String role) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> role.equals(a.getAuthority()));
    }
}
