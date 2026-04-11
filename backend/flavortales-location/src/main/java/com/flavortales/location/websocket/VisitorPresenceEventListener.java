package com.flavortales.location.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

/**
 * Listens for STOMP lifecycle events to seed the heartbeat registry.
 *
 * <p>On subscribe: records an initial heartbeat so the session is visible in
 * the registry immediately. The count is kept current by periodic heartbeats
 * from the client; stale entries are evicted by {@link PresenceCleanupScheduler}.
 *
 * <p>On disconnect: the session is <em>not</em> removed immediately. A brief
 * disconnect (tab switch, mobile background, transient network drop) followed
 * by a reconnect and heartbeat will keep the tourist counted. Only if no
 * heartbeat arrives within 90 s will the cleanup scheduler remove the entry.
 */
@Component
@RequiredArgsConstructor
public class VisitorPresenceEventListener {

    static final String TOURIST_TOPIC = "/topic/tourist-ping";

    private final VisitorPresenceRegistry registry;
    private final ActiveVisitorBroadcaster broadcaster;

    @EventListener
    public void onSubscribe(SessionSubscribeEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        if (TOURIST_TOPIC.equals(accessor.getDestination())) {
            registry.heartbeat(accessor.getSessionId());
            broadcaster.broadcast(registry.getCount());
        }
    }

    /**
     * Do NOT remove from registry on disconnect — let {@link PresenceCleanupScheduler}
     * handle eviction after the 90 s grace period expires.
     */
    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        // Intentionally left empty: heartbeat-based eviction handles count decrements.
    }
}

