package com.flavortales.location.repository;

import com.flavortales.location.document.TouristSession;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;

/**
 * FR-UM-011: MongoDB repository for anonymous tourist sessions.
 *
 * <p>Expired documents are removed automatically by MongoDB's TTL index on
 * {@code expires_at}; no manual cleanup query is needed.
 */
public interface TouristSessionRepository extends MongoRepository<TouristSession, String> {

    long countByExpiresAtAfter(Instant now);
}
