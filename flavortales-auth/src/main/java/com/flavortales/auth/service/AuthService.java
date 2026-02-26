package com.flavortales.auth.service;

import com.flavortales.auth.dto.VendorRegisterRequest;
import com.flavortales.auth.dto.RegisterResponse;
import com.flavortales.auth.entity.EmailVerification;
import com.flavortales.auth.repository.EmailVerificationRepository;
import com.flavortales.common.exception.AccountAlreadyVerifiedException;
import com.flavortales.common.exception.DuplicateEmailException;
import com.flavortales.common.exception.DuplicateUsernameException;
import com.flavortales.common.exception.InvalidVerificationCodeException;
import com.flavortales.common.exception.ResendLimitExceededException;
import com.flavortales.common.exception.UserNotFoundException;
import com.flavortales.common.exception.VerificationCodeExpiredException;
import com.flavortales.notification.service.EmailService;
import com.flavortales.user.entity.Role;
import com.flavortales.user.entity.User;
import com.flavortales.user.entity.UserStatus;
import com.flavortales.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final EmailService emailService;

    @Value("${app.verification.expiration-minutes}")
    private int expirationMinutes;

    // BCrypt with cost factor 12 as required
    private static final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);

    @Transactional
    public RegisterResponse registerVendor(VendorRegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException();
        }
        if (userRepository.existsByFullName(request.getUsername())) {
            throw new DuplicateUsernameException();
        }

        String hashedPassword = passwordEncoder.encode(request.getPassword());

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(hashedPassword)
                .role(Role.vendor)
                .fullName(request.getUsername())
                .phone(request.getPhone())
                .status(UserStatus.inactive)
                .build();

        user = userRepository.save(user);
        log.info("New vendor account created: {} ({})", user.getFullName(), user.getEmail());

        String verificationCode = generateVerificationCode();

        EmailVerification verification = EmailVerification.builder()
                .user(user)
                .verificationCode(verificationCode)
                .expiresAt(LocalDateTime.now().plusMinutes(expirationMinutes))
                .isVerified(false)
                .build();

        emailVerificationRepository.save(verification);

        emailService.sendVendorVerificationEmail(user.getEmail(), verificationCode);

        return RegisterResponse.builder()
                .userId(user.getUserId())
                .username(user.getFullName())
                .email(user.getEmail())
                .status(user.getStatus().name())
                .message("Registration successful. Please check your email to verify your account.")
                .build();
    }

    private String generateVerificationCode() {
        SecureRandom random = new SecureRandom();
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }

    // Maximum number of resend attempts allowed after the initial send
    private static final int MAX_RESEND_COUNT = 3;

    @Transactional
    public void verifyEmail(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(UserNotFoundException::new);

        if (user.getStatus() == UserStatus.active) {
            throw new AccountAlreadyVerifiedException();
        }

        EmailVerification verification = emailVerificationRepository
                .findTopByUserEmailOrderByCreatedAtDesc(email)
                .orElseThrow(InvalidVerificationCodeException::new);

        if (!verification.getVerificationCode().equals(code)) {
            throw new InvalidVerificationCodeException();
        }

        if (LocalDateTime.now().isAfter(verification.getExpiresAt())) {
            throw new VerificationCodeExpiredException();
        }

        verification.setVerified(true);
        emailVerificationRepository.save(verification);

        user.setStatus(UserStatus.active);
        userRepository.save(user);

        log.info("Vendor account verified: {} ({})", user.getFullName(), user.getEmail());
    }

    @Transactional
    public void resendVerificationCode(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(UserNotFoundException::new);

        if (user.getStatus() == UserStatus.active) {
            throw new AccountAlreadyVerifiedException();
        }

        // Count total records: 1 original + up to MAX_RESEND_COUNT resends
        long totalRecords = emailVerificationRepository.countByUserEmail(email);
        if (totalRecords > MAX_RESEND_COUNT) {
            throw new ResendLimitExceededException();
        }

        String newCode = generateVerificationCode();

        EmailVerification newVerification = EmailVerification.builder()
                .user(user)
                .verificationCode(newCode)
                .expiresAt(LocalDateTime.now().plusMinutes(expirationMinutes))
                .isVerified(false)
                .build();

        emailVerificationRepository.save(newVerification);
        emailService.sendVendorVerificationEmail(user.getEmail(), newCode);

        long resendsUsed = totalRecords; // this resend is now the totalRecords-th record after save
        long resendsRemaining = MAX_RESEND_COUNT - resendsUsed;
        log.info("Resent verification code to: {} ({} resend(s) remaining)", email, resendsRemaining);
    }
}
