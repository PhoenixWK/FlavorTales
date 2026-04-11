package com.flavortales.location.websocket;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory registry of active tourist WebSocket (STOMP) sessions tracked via
 * heartbeat timestamps.
 *
 * <p>Each tourist tab that subscribes to the presence topic is registered with
 * its last-heartbeat time. The {@link PresenceCleanupScheduler} removes entries
 * that have not sent a heartbeat within the grace period (90 s), which is when
 * the live-visitor count is actually decremented. This prevents brief disconnects
 * (tab switch, mobile background) from incorrectly reducing the count.
 */
@Component
public class VisitorPresenceRegistry {

    /** stompSessionId → timestamp of the most recent heartbeat (or subscribe event). */
    private final ConcurrentHashMap<String, Instant> sessions = new ConcurrentHashMap<>();

    /** Register or refresh the heartbeat timestamp for a STOMP session. */
    public void heartbeat(String stompSessionId) {
        sessions.put(stompSessionId, Instant.now());
    }

    /**
     * Remove a session immediately (e.g. explicit server-side clean-up).
     *
     * @return {@code true} if the session was tracked.
     */
    public boolean remove(String stompSessionId) {
        return sessions.remove(stompSessionId) != null;
    }

    /** Remove all sessions whose last heartbeat is older than {@code threshold}. */
    public int removeStale(Instant threshold) {
        int removed = 0;
        for (var entry : sessions.entrySet()) {
            if (entry.getValue().isBefore(threshold) && sessions.remove(entry.getKey(), entry.getValue())) {
                removed++;
            }
        }
        return removed;
    }

    public int getCount() {
        return sessions.size();
    }
}

