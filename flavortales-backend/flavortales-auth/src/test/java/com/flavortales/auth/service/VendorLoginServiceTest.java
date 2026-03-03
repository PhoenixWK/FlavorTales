package com.flavortales.auth.service;

import com.flavortales.auth.dto.LoginRequest;
import com.flavortales.auth.dto.LoginResponse;
import com.flavortales.auth.repository.EmailVerificationRepository;
import com.flavortales.common.exception.AccountDisabledException;
import com.flavortales.common.exception.AccountPendingException;
import com.flavortales.common.exception.AccountRejectedException;
import com.flavortales.common.exception.AccountSuspendedException;
import com.flavortales.common.exception.InvalidCredentialsException;
import com.flavortales.notification.service.EmailService;
import com.flavortales.user.entity.Role;
import com.flavortales.user.entity.User;
import com.flavortales.user.entity.UserStatus;
import com.flavortales.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AuthService#login(LoginRequest)}.
 *
 * <p><b>Traceability</b>
 * <ul>
 *   <li>Use Case  : UC-Login-Vendor</li>
 *   <li>User Story: US-002 – Authentication / Vendor Login</li>
 *   <li>Acceptance: AC-002</li>
 * </ul>
 *
 * <p><b>Coverage matrix</b>
 * <pre>
 *  Scenario                              Priority  Type
 *  ─────────────────────────────────────────────────────
 *  Happy path – active vendor login       P0       Positive
 *  Happy path – remember-me flag          P0       Positive
 *  Tokens are non-blank strings           P0       Positive
 *  User not found → 401                   P0       Negative
 *  Wrong password  → 401                  P0       Negative
 *  Same error msg for user-not-found      P1       Security
 *  Status: inactive  → 403               P0       Negative
 *  Status: pending   → 403               P0       Negative
 *  Status: rejected  → 403               P0       Negative
 *  Status: suspended → 403               P0       Negative
 *  Status: disabled  → 403               P0       Negative
 * </pre>
 *
 * <p><b>Note on BCrypt cost</b> – The test encoder uses cost 4 (vs. cost 12 in
 * production) so that hashing in {@code @BeforeAll} does not slow the suite.
 * {@link BCryptPasswordEncoder#matches} reads the cost from the stored hash, so
 * the production service's {@code passwordEncoder.matches()} call is still
 * exercised correctly.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService – login() | US-002 / AC-002")
class VendorLoginServiceTest {

    // ---- Cost-4 encoder for fast test hashing; cost is stored inside the hash ----
    private static final BCryptPasswordEncoder TEST_ENCODER = new BCryptPasswordEncoder(4);
    private static final String RAW_PASSWORD   = "Vendor@123";
    private static String       HASHED_PASSWORD;

    @BeforeAll
    static void hashPassword() {
        // Compute once for all test methods to keep the suite fast.
        HASHED_PASSWORD = TEST_ENCODER.encode(RAW_PASSWORD);
    }

    @Mock private UserRepository             userRepository;
    @Mock private EmailVerificationRepository emailVerificationRepository;
    @Mock private EmailService               emailService;
    @Mock private JwtService                 jwtService;

    @InjectMocks
    private AuthService authService;

    /** A reusable login request with real data. */
    private LoginRequest validRequest;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "expirationMinutes", 15);

        validRequest = new LoginRequest();
        validRequest.setEmail("vendor@example.com");
        validRequest.setPassword(RAW_PASSWORD);
        validRequest.setRememberMe(false);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Builds an active vendor with a pre-hashed password.
     * All tests that expect success use this base object.
     */
    private User activeVendor() {
        return User.builder()
                .userId(42)
                .email("vendor@example.com")
                .fullName("Shop Owner")
                .passwordHash(HASHED_PASSWORD)
                .role(Role.vendor)
                .status(UserStatus.active)
                .build();
    }

    private User vendorWithStatus(UserStatus status) {
        return User.builder()
                .userId(42)
                .email("vendor@example.com")
                .fullName("Shop Owner")
                .passwordHash(HASHED_PASSWORD)
                .role(Role.vendor)
                .status(status)
                .build();
    }

    private void stubUserFound(User user) {
        when(userRepository.findByEmail(user.getEmail()))
                .thenReturn(Optional.of(user));
    }

    private void stubTokensGenerated() {
        when(jwtService.generateAccessToken(any(User.class), anyBoolean()))
                .thenReturn("mock.access.token");
        when(jwtService.generateRefreshToken(any(User.class)))
                .thenReturn("mock.refresh.token");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Happy path
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Happy path – active vendor with valid credentials")
    class HappyPath {

        /**
         * AC-002-01: Successful login redirects to the Vendor management interface.
         * (Service concern: returns a LoginResponse carrying userId, email, username, role.)
         */
        @Test
        @DisplayName("[AC-002-01] Returns LoginResponse with correct identity fields")
        void returnsLoginResponseWithCorrectIdentity() {
            User user = activeVendor();
            stubUserFound(user);
            stubTokensGenerated();

            LoginResponse response = authService.login(validRequest);

            assertThat(response.getUserId()).isEqualTo(42);
            assertThat(response.getEmail()).isEqualTo("vendor@example.com");
            assertThat(response.getUsername()).isEqualTo("Shop Owner");
            assertThat(response.getRole()).isEqualTo("vendor");
        }

        /**
         * AC-002-06: Session token is created and stored.
         * (Service concern: access token and refresh token are both non-blank.)
         */
        @Test
        @DisplayName("[AC-002-06] Returns non-blank access and refresh tokens")
        void returnsNonBlankTokens() {
            stubUserFound(activeVendor());
            stubTokensGenerated();

            LoginResponse response = authService.login(validRequest);

            assertThat(response.getAccessToken()).isNotBlank();
            assertThat(response.getRefreshToken()).isNotBlank();
            assertThat(response.getTokenType()).isEqualTo("Bearer");
        }

        /**
         * AC-002-06 (edge): rememberMe = true must be forwarded to JwtService so
         * extended expiry is applied.
         */
        @Test
        @DisplayName("[AC-002-06] Passes rememberMe=true to JwtService for extended token lifetime")
        void forwardsRememberMeFlagToJwtService() {
            validRequest.setRememberMe(true);
            User user = activeVendor();
            stubUserFound(user);
            stubTokensGenerated();

            authService.login(validRequest);

            verify(jwtService).generateAccessToken(user, true);
        }

        @Test
        @DisplayName("rememberMe=false is forwarded correctly to JwtService")
        void forwardsRememberMeFalseToJwtService() {
            User user = activeVendor();
            stubUserFound(user);
            stubTokensGenerated();

            authService.login(validRequest);

            verify(jwtService).generateAccessToken(user, false);
        }

        /**
         * Integration: verifies the UserRepository is queried by email (slave read).
         */
        @Test
        @DisplayName("Queries UserRepository by email address (slave read path)")
        void queriesRepositoryByEmail() {
            stubUserFound(activeVendor());
            stubTokensGenerated();

            authService.login(validRequest);

            verify(userRepository).findByEmail("vendor@example.com");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Credential failures
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Invalid credentials – negative scenarios")
    class InvalidCredentials {

        /**
         * AC-002-02 (negative): System authenticates username/password – wrong password
         * must be rejected.
         */
        @Test
        @DisplayName("[AC-002-02] Throws InvalidCredentialsException when password is wrong")
        void throwsOnWrongPassword() {
            stubUserFound(activeVendor());
            validRequest.setPassword("WrongPassword@9");

            assertThatThrownBy(() -> authService.login(validRequest))
                    .isInstanceOf(InvalidCredentialsException.class)
                    .hasMessageContaining("Invalid");

            verify(jwtService, never()).generateAccessToken(any(), anyBoolean());
        }

        /**
         * AC-002-02 (negative): No-such-user case → same exception as wrong password
         * (prevents user-enumeration).
         */
        @Test
        @DisplayName("[AC-002-02] Throws InvalidCredentialsException when email is not registered")
        void throwsWhenEmailNotFound() {
            when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());
            validRequest.setEmail("unknown@example.com");

            assertThatThrownBy(() -> authService.login(validRequest))
                    .isInstanceOf(InvalidCredentialsException.class);
        }

        /**
         * Security: user-not-found and wrong-password must produce the same message to
         * prevent credential enumeration attacks.
         */
        @Test
        @DisplayName("[Security] Same error message for unknown email and wrong password")
        void sameErrorMessageForUnknownEmailAndWrongPassword() {
            // Unknown email
            when(userRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());
            LoginRequest reqUnknown = new LoginRequest();
            reqUnknown.setEmail("ghost@example.com");
            reqUnknown.setPassword(RAW_PASSWORD);

            // Wrong password on known account
            stubUserFound(activeVendor());
            LoginRequest reqWrongPw = new LoginRequest();
            reqWrongPw.setEmail("vendor@example.com");
            reqWrongPw.setPassword("Wrong@999");

            String msgUnknown = "";
            String msgWrongPw = "";
            try { authService.login(reqUnknown); } catch (InvalidCredentialsException e) { msgUnknown = e.getMessage(); }
            try { authService.login(reqWrongPw); } catch (InvalidCredentialsException e) { msgWrongPw = e.getMessage(); }

            assertThat(msgUnknown).isEqualTo(msgWrongPw);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Account status enforcement
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Account status checks – AC-002-04 / AC-002-05")
    class AccountStatusChecks {

        /**
         * AC-002-04: System checks account status (Active).
         * Already covered by HappyPath – active accounts pass.
         */

        /**
         * AC-002-05: Inactive (unverified email) accounts cannot log in.
         */
        @Test
        @DisplayName("[AC-002-05] Inactive accounts → AccountDisabledException")
        void inactiveAccountThrowsDisabled() {
            stubUserFound(vendorWithStatus(UserStatus.inactive));

            assertThatThrownBy(() -> authService.login(validRequest))
                    .isInstanceOf(AccountDisabledException.class)
                    .hasMessageContaining("inactive");
        }

        /**
         * AC-002-05: Pending-approval accounts cannot log in.
         */
        @Test
        @DisplayName("[AC-002-05] Pending accounts → AccountPendingException")
        void pendingAccountThrowsPending() {
            stubUserFound(vendorWithStatus(UserStatus.pending));

            assertThatThrownBy(() -> authService.login(validRequest))
                    .isInstanceOf(AccountPendingException.class)
                    .hasMessageContaining("pending approval");
        }

        /**
         * AC-002-05: Rejected accounts cannot log in.
         */
        @Test
        @DisplayName("[AC-002-05] Rejected accounts → AccountRejectedException")
        void rejectedAccountThrowsRejected() {
            stubUserFound(vendorWithStatus(UserStatus.rejected));

            assertThatThrownBy(() -> authService.login(validRequest))
                    .isInstanceOf(AccountRejectedException.class)
                    .hasMessageContaining("rejected");
        }

        /**
         * AC-002-04: Temporarily locked (suspended) accounts cannot log in.
         */
        @Test
        @DisplayName("[AC-002-04] Suspended accounts → AccountSuspendedException with 'suspended' message")
        void suspendedAccountThrowsSuspended() {
            stubUserFound(vendorWithStatus(UserStatus.suspended));

            assertThatThrownBy(() -> authService.login(validRequest))
                    .isInstanceOf(AccountSuspendedException.class)
                    .hasMessageContaining("suspended");
        }

        /**
         * AC-002-05: Disabled accounts cannot log in.
         */
        @Test
        @DisplayName("[AC-002-05] Disabled accounts → AccountDisabledException")
        void disabledAccountThrowsDisabled() {
            stubUserFound(vendorWithStatus(UserStatus.disabled));

            assertThatThrownBy(() -> authService.login(validRequest))
                    .isInstanceOf(AccountDisabledException.class);
        }

        /**
         * AC-002-05 (edge): Status check must happen BEFORE token generation.
         * Ensures no token is issued to a blocked account.
         */
        @Test
        @DisplayName("[AC-002-05] No token is generated for blocked accounts")
        void noTokenGeneratedForBlockedAccount() {
            stubUserFound(vendorWithStatus(UserStatus.suspended));

            assertThatThrownBy(() -> authService.login(validRequest))
                    .isInstanceOf(AccountSuspendedException.class);

            verify(jwtService, never()).generateAccessToken(any(), anyBoolean());
            verify(jwtService, never()).generateRefreshToken(any());
        }
    }
}
