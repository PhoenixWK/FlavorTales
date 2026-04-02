package com.flavortales.analytics.controller;

import com.flavortales.analytics.dto.VisitorStatPoint;
import com.flavortales.analytics.service.VisitorStatsService;
import com.flavortales.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Admin-only analytics endpoints.
 * Routes under /api/analytics/admin/** require ROLE_admin (enforced by SecurityConfig).
 */
@RestController
@RequestMapping("/api/analytics/admin")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final VisitorStatsService visitorStatsService;

    /**
     * GET /api/analytics/admin/visitors/stats?period=day|week|month|year
     * Returns visitor counts grouped by the requested period.
     */
    @GetMapping("/visitors/stats")
    public ResponseEntity<ApiResponse<List<VisitorStatPoint>>> getVisitorStats(
            @RequestParam(defaultValue = "day") String period) {
        List<VisitorStatPoint> stats = visitorStatsService.getStats(period);
        return ResponseEntity.ok(ApiResponse.success("Visitor stats retrieved", stats));
    }
}
