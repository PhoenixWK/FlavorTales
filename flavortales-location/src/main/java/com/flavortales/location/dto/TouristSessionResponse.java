package com.flavortales.location.dto;

import java.time.Instant;
import java.util.List;

/**
 * Full session data returned to the client for cache hydration.
 */
public record TouristSessionResponse(
        String sessionId,
        String languagePreference,
        List<Integer> viewedPoiIds,
        List<Integer> playedAudioIds,
        Instant createdAt,
        Instant expiresAt
) {}
