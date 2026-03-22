package com.flavortales.location.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * FR-UM-011: Anonymous Tourist Session (MongoDB document).
 *
 * <p>Stored in the {@code tourist_sessions} collection. The {@code expiresAt}
 * field carries a TTL index — MongoDB automatically removes the document when
 * the field value passes, satisfying the 24-hour expiry requirement without
 * any scheduled task.
 *
 * <p>No personally-identifiable information is stored; the {@code sessionId}
 * is a random UUID that cannot be linked back to any user.
 */
@Document(collection = "tourist_sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TouristSession {

    /** Random UUID – unpredictable, non-sequential. */
    @Id
    private String sessionId;

    /** BCP-47 language tag the tourist selected (e.g. "vi", "en"). */
    @Field("language_preference")
    @Builder.Default
    private String languagePreference = "vi";

    /** POI IDs the tourist viewed — used for offline cache hydration. */
    @Field("viewed_poi_ids")
    @Builder.Default
    private List<Integer> viewedPoiIds = new ArrayList<>();

    /** Audio IDs the tourist played — used for offline cache hydration. */
    @Field("played_audio_ids")
    @Builder.Default
    private List<Integer> playedAudioIds = new ArrayList<>();

    @Field("created_at")
    private Instant createdAt;

    /**
     * MongoDB TTL index: the document is automatically deleted when
     * {@code expiresAt} is in the past (expireAfterSeconds = 0).
     */
    @Indexed(expireAfterSeconds = 0)
    @Field("expires_at")
    private Instant expiresAt;
}
