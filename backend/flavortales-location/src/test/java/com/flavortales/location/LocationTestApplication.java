package com.flavortales.location;

import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Minimal Spring Boot entry-point used exclusively by {@code @WebMvcTest} and
 * other Spring test slices inside the {@code flavortales-location} module.
 *
 * <p>Without this class, {@code @WebMvcTest} cannot locate a
 * {@code @SpringBootConfiguration} because the real
 * {@code FlavorTalesApplication} lives in the {@code flavortales-app} module,
 * which is a separate Maven artifact and is therefore invisible during
 * per-module test runs.
 *
 * <p>{@code scanBasePackages} ensures {@code GlobalExceptionHandler}
 * (flavortales-common) and all location-module beans are visible to the test
 * application context.
 */
@SpringBootApplication(scanBasePackages = {
        "com.flavortales.location",
        "com.flavortales.common"
})
public class LocationTestApplication {
}
