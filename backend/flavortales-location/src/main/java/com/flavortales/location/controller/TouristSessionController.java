package com.flavortales.location.controller;

import com.flavortales.common.dto.ApiResponse;
import com.flavortales.location.dto.CreateTouristSessionResponse;
import com.flavortales.location.dto.TouristSessionResponse;
import com.flavortales.location.dto.UpdateSessionRequest;
import com.flavortales.location.service.TouristSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * UC-10 / FR-UM-011: Anonymous tourist session endpoints.
 *
 * <p>All routes under {@code /api/tourist/**} are publicly accessible
 * (no JWT required) — configured in {@link com.flavortales.auth.security.SecurityConfig}.
 */
@RestController
@RequestMapping("/api/tourist/sessions")
@RequiredArgsConstructor
public class TouristSessionController {

    private final TouristSessionService sessionService;

    /**
     * POST /api/tourist/sessions
     * Creates a new anonymous session. Called automatically when the tourist
     * opens the map for the first time (or after their previous session expired).
     */
    @PostMapping
    public ResponseEntity<ApiResponse<CreateTouristSessionResponse>> createSession() {
        CreateTouristSessionResponse response = sessionService.createSession();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Phiên ẩn danh đã được tạo", response));
    }

    /**
     * GET /api/tourist/sessions/{sessionId}
     * Verifies that a session stored in the client's localStorage is still valid.
     * Returns 404 when the session is not found or has expired.
     */
    @GetMapping("/{sessionId}")
    public ResponseEntity<ApiResponse<TouristSessionResponse>> getSession(
            @PathVariable String sessionId) {
        return sessionService.getSession(sessionId)
                .map(data -> ResponseEntity.ok(ApiResponse.success("Phiên hợp lệ", data)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Phiên không tồn tại hoặc đã hết hạn")));
    }

    /**
     * PATCH /api/tourist/sessions/{sessionId}
     * Persists language preference and offline-cache lists (viewed POIs, played audio).
     * Only non-null fields in the request body are applied.
     */
    @PatchMapping("/{sessionId}")
    public ResponseEntity<ApiResponse<TouristSessionResponse>> updateSession(
            @PathVariable String sessionId,
            @RequestBody UpdateSessionRequest request) {
        return sessionService.updateSession(sessionId, request)
                .map(data -> ResponseEntity.ok(ApiResponse.success("Phiên đã cập nhật", data)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Phiên không tồn tại hoặc đã hết hạn")));
    }
}
