package com.flavortales.location.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Decoupled broadcaster that pushes the current active-visitor count
 * to all STOMP subscribers on {@code /topic/active-visitors}.
 *
 * <p>Keeping this in a dedicated class prevents {@link com.flavortales.location.service.TouristSessionService}
 * from directly importing Spring WebSocket types, reducing coupling.
 */
@Component
@RequiredArgsConstructor
public class ActiveVisitorBroadcaster {

    static final String TOPIC = "/topic/active-visitors";

    private final SimpMessagingTemplate messagingTemplate;

    /** Broadcasts {@code count} to all connected admin dashboard clients. */
    public void broadcast(long count) {
        messagingTemplate.convertAndSend(TOPIC, count);
    }
}
