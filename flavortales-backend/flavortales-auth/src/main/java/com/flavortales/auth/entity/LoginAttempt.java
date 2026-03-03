package com.flavortales.auth.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Tracks every login attempt for rate-limiting and lockout enforcement.
 *
 * <ul>
 *   <li><b>Rate limit</b>  – 5 attempts within a 15-minute sliding window.</li>
 *   <li><b>Lockout</b>     – 10 consecutive failures triggers a 30-minute
 *       lockout stored in {@link #lockedUntil}.</li>
 * </ul>
 *
 * <p>Reads are routed to the SLAVE datasource; writes go to the MASTER.
 */
@Entity
@Table(name = "login_attempt",
        indexes = {
                @Index(name = "idx_la_identifier", columnList = "identifier"),
                @Index(name = "idx_la_attempted_at", columnList = "attempted_at")
        })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The value the user typed into the "username or email" field.
     * Normalised to lower-case before persisting.
     */
    @Column(name = "identifier", nullable = false, length = 255)
    private String identifier;

    @Column(name = "success", nullable = false)
    @Builder.Default
    private boolean success = false;

    /**
     * Set when a lockout is triggered; {@code null} for regular attempt rows.
     * If {@code LocalDateTime.now()} is before this value the account is locked.
     */
    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @CreationTimestamp
    @Column(name = "attempted_at", updatable = false)
    private LocalDateTime attemptedAt;
}
