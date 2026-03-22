package com.flavortales.auth.security;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * FR-UM-003: Logout – Security Filter Chain
 *
 * <p>Replaces the base security configuration in {@code flavortales-common} by
 * wiring the {@link JwtAuthenticationFilter} into the Spring Security filter
 * chain.  This is the single authoritative {@link SecurityFilterChain} for the
 * assembled application.  The base config in {@code flavortales-common} is kept
 * as a non-functional placeholder to avoid accidental instantiation.
 *
 * <h3>Auth rules</h3>
 * <ul>
 *   <li>{@code /api/auth/**} – publicly accessible (login, register, verify,
 *       logout, refresh).</li>
 *   <li>All other endpoints – require a valid, non-blacklisted JWT.</li>
 * </ul>
 *
 * <h3>Session-expired handling</h3>
 * When an expired or blacklisted token is presented to a protected endpoint,
 * Spring Security calls the custom {@code authenticationEntryPoint} which
 * returns {@code 401} with {@code "Session expired"} so the frontend can show
 * the appropriate message and save the current URL before redirecting to login.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    /** Allowed frontend origins (comma-separated) – overridable via {@code app.cors.allowed-origins}. */
    @Value("${app.cors.allowed-origins:http://localhost:3000}")
    private List<String> allowedOrigins;

    @Bean
    @Primary
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    // Public auth endpoints (login, register, verify, logout, refresh)
                    .requestMatchers("/api/auth/**").permitAll()
                    // Public tourist endpoints (anonymous session – no JWT required)
                    .requestMatchers("/api/tourist/**").permitAll()
                    // All other routes require a valid JWT
                    .anyRequest().authenticated()
            )
            // JWT filter runs before Spring Security's username/password filter
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            // FR-UM-003: Session-expired message for the frontend auto-logout flow
            .exceptionHandling(ex -> ex
                    .authenticationEntryPoint((req, res, authException) -> {
                        res.setContentType("application/json;charset=UTF-8");
                        res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        res.getWriter().write(
                            "{\"success\":false,\"message\":\"Session expired\"}");
                    })
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
