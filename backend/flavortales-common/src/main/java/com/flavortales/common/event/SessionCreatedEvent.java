package com.flavortales.common.event;

import org.springframework.context.ApplicationEvent;

import java.time.Instant;

/**
 * Published by flavortales-location whenever a new anonymous tourist session is created.
 * Consumed by flavortales-analytics to record a visitor event for statistics.
 */
public class SessionCreatedEvent extends ApplicationEvent {

    private final Instant occurredAt;

    public SessionCreatedEvent(Object source, Instant occurredAt) {
        super(source);
        this.occurredAt = occurredAt;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }
}
