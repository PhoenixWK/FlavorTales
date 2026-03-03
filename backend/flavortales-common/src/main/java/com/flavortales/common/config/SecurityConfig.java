package com.flavortales.common.config;

/**
 * Security configuration has been moved to
 * {@code com.flavortales.auth.security.SecurityConfig} so that the JWT
 * authentication filter (FR-UM-003) can be wired in without creating a
 * circular dependency between {@code flavortales-common} and
 * {@code flavortales-auth}.
 *
 * <p>This placeholder is intentionally left empty to preserve Git history.
 * Do NOT re-add {@code @Configuration} or any {@code @Bean} methods here.
 */
public class SecurityConfig {
}
