package com.flavortales.location.dto;

import java.time.Instant;

/**
 * Response returned when a new anonymous session is created.
 * Only exposes the fields the client needs to persist locally.
 */
public record CreateTouristSessionResponse(
        String sessionId,
        Instant expiresAt
) {}
