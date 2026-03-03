package com.flavortales.auth.entity;

import com.flavortales.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * FR-UM-004: Password Recovery – Reset Token
 *
 * <p>Stores a unique, one-time-use reset token for each password recovery
 * request.  Tokens expire after 30 minutes and are marked {@code used} once
 * the password has been successfully reset.
 */
@Entity
@Table(name = "password_reset_token",
        indexes = {
                @Index(name = "idx_prt_token",   columnList = "token"),
                @Index(name = "idx_prt_user_id", columnList = "user_id"),
                @Index(name = "idx_prt_expires_at", columnList = "expires_at")
        })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Cryptographically random 6-digit numeric code sent in the reset email. */
    @Column(name = "token", nullable = false, unique = true, length = 6)
    private String token;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** {@code true} once this token has been successfully used to reset a password. */
    @Column(name = "is_used", nullable = false)
    @Builder.Default
    private boolean used = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
