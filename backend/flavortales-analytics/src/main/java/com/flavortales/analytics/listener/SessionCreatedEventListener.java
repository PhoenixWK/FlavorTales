package com.flavortales.analytics.listener;

import com.flavortales.analytics.document.VisitorEvent;
import com.flavortales.analytics.repository.VisitorEventRepository;
import com.flavortales.common.event.SessionCreatedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Listens for SessionCreatedEvent published by flavortales-location
 * and persists a VisitorEvent to MongoDB for analytics.
 */
@Component
@RequiredArgsConstructor
public class SessionCreatedEventListener {

    private final VisitorEventRepository visitorEventRepository;

    @EventListener
    public void onSessionCreated(SessionCreatedEvent event) {
        visitorEventRepository.save(
                VisitorEvent.builder()
                        .timestamp(event.getOccurredAt())
                        .build()
        );
    }
}
