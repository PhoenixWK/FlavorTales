package com.flavortales.content.controller;

import com.flavortales.common.dto.ApiResponse;
import com.flavortales.content.dto.ShopResponse;
import com.flavortales.content.service.ShopService;
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
