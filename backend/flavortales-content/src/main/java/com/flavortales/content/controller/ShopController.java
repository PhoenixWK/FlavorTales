package com.flavortales.content.controller;

import com.flavortales.common.dto.ApiResponse;
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
}
