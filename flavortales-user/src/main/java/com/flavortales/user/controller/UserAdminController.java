package com.flavortales.user.controller;

import com.flavortales.common.dto.ApiResponse;
import com.flavortales.user.entity.Role;
import com.flavortales.user.entity.UserStatus;
import com.flavortales.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Admin-only endpoints for user statistics.
 */
@RestController
@RequestMapping("/api/user/admin")
@RequiredArgsConstructor
public class UserAdminController {

    private final UserRepository userRepository;

    /**
     * GET /api/user/admin/stats
     * Returns aggregate user stats for the admin dashboard.
     * Route is protected by SecurityConfig (hasRole("admin")).
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getAdminStats() {
        long activeVendors = userRepository.countByRoleAndStatus(Role.vendor, UserStatus.active);
        return ResponseEntity.ok(ApiResponse.success("User stats retrieved",
                Map.of("activeVendors", activeVendors)));
    }
}
