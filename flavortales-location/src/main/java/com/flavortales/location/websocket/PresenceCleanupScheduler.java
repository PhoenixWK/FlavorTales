package com.flavortales.location.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Periodically evicts tourist STOMP sessions that have stopped sending heartbeats.
 *
 * <p>A session is considered gone when no heartbeat has been received for longer
 * than {@value #GRACE_PERIOD_SECONDS} seconds — equivalent to 3 missed heartbeat
 * cycles (client sends every 30 s). This grace period absorbs:
 * <ul>
 *   <li>Tab switches and mobile app backgrounding (connection temporarily paused)</li>
 *   <li>Brief network interruptions with automatic reconnect</li>
 * </ul>
 * Only a fully closed browser tab or a completely released mobile app will fail to
 * resume heartbeats within 90 s and be removed from the count.
 */
@Component
@RequiredArgsConstructor
public class PresenceCleanupScheduler {

    static final long GRACE_PERIOD_SECONDS = 90L;

    private final VisitorPresenceRegistry registry;
    private final ActiveVisitorBroadcaster broadcaster;

    @Scheduled(fixedDelay = 30_000)
    public void evictStaleSessions() {
        Instant threshold = Instant.now().minusSeconds(GRACE_PERIOD_SECONDS);
        int removed = registry.removeStale(threshold);
        if (removed > 0) {
            broadcaster.broadcast(registry.getCount());
        }
    }
}
