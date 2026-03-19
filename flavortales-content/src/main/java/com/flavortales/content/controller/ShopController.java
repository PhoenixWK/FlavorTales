package com.flavortales.content.controller;

import com.flavortales.common.dto.ApiResponse;
import com.flavortales.content.dto.AdminShopResponse;
import com.flavortales.content.dto.ShopCreateRequest;
import com.flavortales.content.dto.ShopCreateResponse;
import com.flavortales.content.dto.ShopResponse;
import com.flavortales.content.service.ShopService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shop")
@RequiredArgsConstructor
public class ShopController {

    private final ShopService shopService;

    /**
     * POST /api/shop
     * Creates a new shop profile for the authenticated vendor.
     * The shop is created with status=pending and the admin is notified.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ShopCreateResponse>> createShop(
            @Valid @RequestBody ShopCreateRequest request,
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_vendor")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Only vendors can create shops"));
        }

        try {
            String vendorEmail = authentication.getName();
            ShopCreateResponse response = shopService.createShop(request, vendorEmail);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(response.getMessage(), response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * GET /api/shop/my
     * Returns all shops that belong to the authenticated vendor.
     */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<ShopResponse>>> getMyShops(
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_vendor")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Only vendors can access this resource"));
        }

        String vendorEmail = authentication.getName();
        List<ShopResponse> shops = shopService.getMyShops(vendorEmail);
        return ResponseEntity.ok(ApiResponse.success("Your shops retrieved", shops));
    }

    private boolean hasRole(Authentication auth, String role) {
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(role));
    }

    /**
     * GET /api/shop/my/{shopId}
     * Returns the full detail (including gallery + audio) for a shop owned by the vendor.
     */
    @GetMapping("/my/{shopId}")
    public ResponseEntity<ApiResponse<AdminShopResponse>> getMyShopDetail(
            @PathVariable Integer shopId,
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_vendor")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Only vendors can access this resource"));
        }

        try {
            String vendorEmail = authentication.getName();
            AdminShopResponse shop = shopService.getMyShopDetail(shopId, vendorEmail);
            return ResponseEntity.ok(ApiResponse.success("Shop detail retrieved", shop));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    // ── Admin endpoints ───────────────────────────────────────────────────────

    /** GET /api/shop/admin/pending — List all pending shops. */
    @GetMapping("/admin/pending")
    public ResponseEntity<ApiResponse<List<AdminShopResponse>>> getPendingShops(
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_admin")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Admin access required"));
        }
        List<AdminShopResponse> shops = shopService.getPendingShops();
        return ResponseEntity.ok(ApiResponse.success("Pending shops retrieved", shops));
    }

    /** GET /api/shop/admin/{shopId} — Get full detail of a shop for review. */
    @GetMapping("/admin/{shopId}")
    public ResponseEntity<ApiResponse<AdminShopResponse>> getShopDetailForAdmin(
            @PathVariable Integer shopId,
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_admin")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Admin access required"));
        }
        try {
            AdminShopResponse shop = shopService.getShopDetailForAdmin(shopId);
            return ResponseEntity.ok(ApiResponse.success("Shop detail retrieved", shop));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /** PATCH /api/shop/admin/{shopId}/approve — Approve a pending shop. */
    @PatchMapping("/admin/{shopId}/approve")
    public ResponseEntity<ApiResponse<Void>> approveShop(
            @PathVariable Integer shopId,
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_admin")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Admin access required"));
        }
        try {
            shopService.approveShop(shopId);
            return ResponseEntity.ok(ApiResponse.success("Shop approved", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** PATCH /api/shop/admin/{shopId}/reject — Reject a pending shop. */
    @PatchMapping("/admin/{shopId}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectShop(
            @PathVariable Integer shopId,
            Authentication authentication) {

        if (!hasRole(authentication, "ROLE_admin")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Admin access required"));
        }
        try {
            shopService.rejectShop(shopId);
            return ResponseEntity.ok(ApiResponse.success("Shop rejected", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
