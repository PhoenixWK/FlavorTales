package com.flavortales.location.service;

import com.flavortales.location.document.TouristSession;
import com.flavortales.location.dto.CreateTouristSessionResponse;
import com.flavortales.location.dto.TouristSessionResponse;
import com.flavortales.location.dto.UpdateSessionRequest;
import com.flavortales.location.repository.TouristSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

/**
 * FR-UM-011: Business logic for anonymous tourist sessions.
 *
 * <p>Session IDs are generated with {@link UUID#randomUUID()} – cryptographically
 * random and non-sequential, satisfying the "unpredictable session ID" requirement.
 * Expiry is enforced both in application logic (filter on read) and at the
 * storage layer (MongoDB TTL index on {@code expires_at}).
 */
@Service
@RequiredArgsConstructor
public class TouristSessionService {

    private static final long SESSION_TTL_HOURS = 24;

    private final TouristSessionRepository sessionRepository;

    /**
     * Creates a new anonymous session with a unique, random ID.
     * No personally-identifiable information is stored.
     */
    public CreateTouristSessionResponse createSession() {
        Instant now = Instant.now();
        TouristSession session = TouristSession.builder()
                .sessionId(UUID.randomUUID().toString())
                .createdAt(now)
                .expiresAt(now.plus(SESSION_TTL_HOURS, ChronoUnit.HOURS))
                .build();
        session = sessionRepository.save(session);
        return new CreateTouristSessionResponse(session.getSessionId(), session.getExpiresAt());
    }

    /**
     * Retrieves a session only if it still exists and has not expired.
     * (MongoDB TTL may not fire instantaneously, so the expiry check is
     * also enforced here for correctness.)
     */
    public Optional<TouristSessionResponse> getSession(String sessionId) {
        return sessionRepository.findById(sessionId)
                .filter(s -> s.getExpiresAt().isAfter(Instant.now()))
                .map(this::toResponse);
    }

    /**
     * Applies a partial update to an existing, non-expired session.
     * Only non-null fields in the request are written.
     */
    public Optional<TouristSessionResponse> updateSession(String sessionId, UpdateSessionRequest request) {
        return sessionRepository.findById(sessionId)
                .filter(s -> s.getExpiresAt().isAfter(Instant.now()))
                .map(session -> {
                    if (request.languagePreference() != null) {
                        session.setLanguagePreference(request.languagePreference());
                    }
                    if (request.viewedPoiIds() != null) {
                        session.setViewedPoiIds(request.viewedPoiIds());
                    }
                    if (request.playedAudioIds() != null) {
                        session.setPlayedAudioIds(request.playedAudioIds());
                    }
                    return toResponse(sessionRepository.save(session));
                });
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private TouristSessionResponse toResponse(TouristSession session) {
        return new TouristSessionResponse(
                session.getSessionId(),
                session.getLanguagePreference(),
                session.getViewedPoiIds(),
                session.getPlayedAudioIds(),
                session.getCreatedAt(),
                session.getExpiresAt()
        );
    }
}
