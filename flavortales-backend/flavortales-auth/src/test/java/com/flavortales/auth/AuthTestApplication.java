package com.flavortales.auth;

import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Minimal Spring Boot entry-point used exclusively by @WebMvcTest and other
 * Spring test slices inside the flavortales-auth module.
 *
 * Without this class, @WebMvcTest cannot locate a @SpringBootConfiguration
 * because the real FlavorTalesApplication lives in the flavortales-app module,
 * which is a separate Maven artifact and is therefore invisible during
 * per-module test runs.
 *
 * scanBasePackages ensures GlobalExceptionHandler (flavortales-common) and all
 * auth-module beans are visible to the test application context.
 */
@SpringBootApplication(scanBasePackages = {
        "com.flavortales.auth",
        "com.flavortales.common"
})
public class AuthTestApplication {
}
