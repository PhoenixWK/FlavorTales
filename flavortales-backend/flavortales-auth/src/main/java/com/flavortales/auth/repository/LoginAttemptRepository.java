package com.flavortales.auth.repository;

import com.flavortales.auth.entity.LoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, Long> {

    /**
     * Counts all attempts (success + failure) for a given identifier within the
     * supplied time window – used for rate limiting.
     */
    long countByIdentifierAndAttemptedAtAfter(String identifier, LocalDateTime since);

    /**
     * Counts failed attempts within a window – used when deciding whether to
     * trigger a lockout after login failure.
     */
    long countByIdentifierAndSuccessAndAttemptedAtAfter(
            String identifier, boolean success, LocalDateTime since);

    /**
     * Returns the newest lockout record for the identifier (if any).
     * A lockout row is distinguished by a non-null {@code locked_until} column.
     */
    Optional<LoginAttempt> findTopByIdentifierAndLockedUntilIsNotNullOrderByAttemptedAtDesc(
            String identifier);

    /**
     * Counts all failed (non-lockout) attempts for an identifier within a time window.
     * Used to determine if a new lockout should be created.
     */
    @Query("""
            SELECT COUNT(la) FROM LoginAttempt la
            WHERE la.identifier = :identifier
              AND la.success = false
              AND la.lockedUntil IS NULL
              AND la.attemptedAt >= :since
            """)
    long countRecentFailuresExcludingLockout(
            @Param("identifier") String identifier,
            @Param("since") LocalDateTime since);

    /**
     * Bulk-deletes all attempt rows (including lockout sentinels) for an
     * identifier – called on successful login to reset the window.
     */
    @Modifying
    @Query("DELETE FROM LoginAttempt la WHERE la.identifier = :identifier")
    void deleteAllByIdentifier(@Param("identifier") String identifier);
}
