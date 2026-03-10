package com.flavortales.poi;

import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Minimal Spring Boot entry-point used exclusively by the test suite.
 *
 * <p>{@code @WebMvcTest} (and other slice annotations) require a
 * {@code @SpringBootApplication} class to be discoverable by scanning packages
 * upward from the test class. Because {@code flavortales-poi} is a library module
 * with no production application class, this stub fulfils that requirement without
 * adding any runtime behaviour.
 *
 * <p>This class lives in {@code src/test/java} and is <b>never</b> packaged into
 * the production JAR.
 */
@SpringBootApplication
public class PoiTestApplication {
}
