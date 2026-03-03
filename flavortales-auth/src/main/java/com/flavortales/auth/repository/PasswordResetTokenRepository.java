package com.flavortales.auth.repository;

import com.flavortales.auth.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    /** Looks up a token by its unique string value. */
    Optional<PasswordResetToken> findByToken(String token);

    /**
     * Counts reset requests for a user created after {@code since}.
     * Used for the per-IP rate-limit check (3 requests / hour).
     */
    long countByUserEmailAndCreatedAtAfter(String email, LocalDateTime since);

    /**
     * Marks all existing (unused) tokens for a user as used when the password
     * is successfully reset, preventing replay of any prior sent links.
     */
    @Modifying
    @Query("""
            UPDATE PasswordResetToken t
               SET t.used = true
             WHERE t.user.email = :email
               AND t.used = false
            """)
    void invalidateAllForUser(@Param("email") String email);
}
