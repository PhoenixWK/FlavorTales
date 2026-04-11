package com.flavortales.location.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

/**
 * Handles STOMP messages sent by tourist clients to signal active presence.
 *
 * <p>Each connected tourist tab publishes a heartbeat to {@code /app/tourist-heartbeat}
 * every 30 s. This refreshes the entry in {@link VisitorPresenceRegistry} so the
 * {@link PresenceCleanupScheduler} knows the session is still alive.
 */
@Controller
@RequiredArgsConstructor
public class TouristPresenceController {

    private final VisitorPresenceRegistry registry;
    private final ActiveVisitorBroadcaster broadcaster;

    /**
     * Refresh the heartbeat for the sending STOMP session.
     * Triggers a broadcast only when the session was not previously known
     * (reconnect scenario), so steady-state heartbeats are broadcast-free.
     */
    @MessageMapping("/tourist-heartbeat")
    public void heartbeat(SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        if (sessionId == null) return;

        int before = registry.getCount();
        registry.heartbeat(sessionId);
        int after = registry.getCount();

        if (after != before) {
            broadcaster.broadcast(after);
        }
    }
}
