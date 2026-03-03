package com.flavortales.auth.repository;

import com.flavortales.auth.entity.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Integer> {

    Optional<EmailVerification> findTopByUserUserIdOrderByCreatedAtDesc(Long userId);

    Optional<EmailVerification> findTopByUserEmailOrderByCreatedAtDesc(String email);

    long countByUserEmail(String email);
}
