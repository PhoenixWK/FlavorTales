package com.flavortales.content;

import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Minimal Spring Boot entry-point used exclusively by @WebMvcTest slices
 * inside the flavortales-content module.
 *
 * The real FlavorTalesApplication lives in flavortales-app, which is a
 * separate Maven artifact invisible during per-module test runs.
 */
@SpringBootApplication(scanBasePackages = {
        "com.flavortales.content",
        "com.flavortales.common"
})
public class CreateShopTestApplication {
}
