package com.flavortales.location.dto;

import java.util.List;

/**
 * Partial-update payload for an existing tourist session.
 * All fields are optional – only non-null values are applied.
 */
public record UpdateSessionRequest(
        String languagePreference,
        List<Integer> viewedPoiIds,
        List<Integer> playedAudioIds
) {}
