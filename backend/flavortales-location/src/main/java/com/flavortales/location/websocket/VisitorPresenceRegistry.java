package com.flavortales.location.websocket;

import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory registry of active tourist WebSocket (STOMP) sessions.
 *
 * <p>Each tourist tab that subscribes to the presence topic is tracked by its
 * STOMP session ID. The count is the authoritative live-visitor number:
 * it reflects exactly how many browser tabs currently have an open connection,
 * because a STOMP disconnect is detected server-side within milliseconds of the
 * client closing or losing the connection.
 */
@Component
public class VisitorPresenceRegistry {

    private final Set<String> touristStompSessions = ConcurrentHashMap.newKeySet();

    public void add(String stompSessionId) {
        touristStompSessions.add(stompSessionId);
    }

    /** @return {@code true} if the session was tracked (i.e. the count changed). */
    public boolean remove(String stompSessionId) {
        return touristStompSessions.remove(stompSessionId);
    }

    public int getCount() {
        return touristStompSessions.size();
    }
}
