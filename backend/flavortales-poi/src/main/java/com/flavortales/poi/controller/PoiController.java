package com.flavortales.poi.controller;

import com.flavortales.common.dto.ApiResponse;
import com.flavortales.poi.dto.CreatePoiRequest;
import com.flavortales.poi.dto.PoiResponse;
import com.flavortales.poi.dto.UpdatePoiRequest;
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
     * Atomically creates a new POI + shop profile for the authenticated vendor.
     * Both are saved with status=pending and admin is notified for review.
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
                .body(ApiResponse.success("Tạo gian hàng thành công, đang chờ duyệt", response));
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
     * GET /api/poi/{poiId}
     * Returns a single POI belonging to the authenticated vendor.
     * Used by the edit form to pre-populate current values.
     */
    @GetMapping("/{poiId}")
    public ResponseEntity<ApiResponse<PoiResponse>> getPoiById(
            @PathVariable Integer poiId,
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_vendor")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Only vendors can access this resource"));
        }

        String vendorEmail = authentication.getName();
        PoiResponse response = poiService.getPoiById(poiId, vendorEmail);
        return ResponseEntity.ok(ApiResponse.success("POI retrieved", response));
    }

    /**
     * PUT /api/poi/{poiId}
     * Updates the POI owned by the authenticated vendor (FR-PM-004).
     * All request fields are optional; omitted fields retain their current value.
     */
    @PutMapping("/{poiId}")
    public ResponseEntity<ApiResponse<PoiResponse>> updatePoi(
            @PathVariable Integer poiId,
            @Valid @RequestBody UpdatePoiRequest request,
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_vendor")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Only vendors can update POIs"));
        }

        String vendorEmail = authentication.getName();
        PoiResponse response = poiService.updatePoi(poiId, request, vendorEmail);
        return ResponseEntity.ok(ApiResponse.success("POI updated successfully", response));
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

    /**
     * DELETE /api/poi/{poiId}?hard=false
     * Soft-deletes (default) or hard-deletes the POI owned by the authenticated vendor.
     * Soft delete: sets status=deleted and deleted_at timestamp (recoverable within 30 days).
     * Hard delete: permanently removes the POI row.
     */
    @DeleteMapping("/{poiId}")
    public ResponseEntity<ApiResponse<Void>> deletePoi(
            @PathVariable Integer poiId,
            @RequestParam(name = "hard", defaultValue = "false") boolean hardDelete,
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_vendor")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Only vendors can delete POIs"));
        }

        String vendorEmail = authentication.getName();
        poiService.deletePoi(poiId, vendorEmail, hardDelete);

        String message = hardDelete
                ? "POI permanently deleted"
                : "POI deleted successfully";
        return ResponseEntity.ok(ApiResponse.success(message, null));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private boolean hasRole(Authentication auth, String role) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> role.equals(a.getAuthority()));
    }
}
