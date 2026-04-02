package com.flavortales.analytics.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.UUID;

/**
 * Permanent record of a unique tourist visit (one per session creation).
 * No TTL — retained for long-term statistics.
 */
@Document(collection = "visitor_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisitorEvent {

    @Id
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Indexed
    @Field("timestamp")
    private Instant timestamp;
}
