package com.flavortales.location.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

/**
 * Listens for STOMP lifecycle events to maintain the live tourist presence count.
 *
 * <p>When a tourist subscribes to {@value #TOURIST_TOPIC}, their STOMP session ID
 * is registered in {@link VisitorPresenceRegistry}. When they disconnect (tab close,
 * browser close, network loss), Spring WebSocket fires {@link SessionDisconnectEvent}
 * within milliseconds — the session is removed and the updated count is broadcast
 * to all admin dashboard clients.
 *
 * <p>Presence is decoupled from MongoDB session data intentionally: presence is
 * ephemeral and connection-scoped; session data persists across reconnects.
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
            registry.add(accessor.getSessionId());
            broadcaster.broadcast(registry.getCount());
        }
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        if (registry.remove(event.getSessionId())) {
            broadcaster.broadcast(registry.getCount());
        }
    }
}
