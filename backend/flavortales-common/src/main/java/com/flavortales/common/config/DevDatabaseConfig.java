package com.flavortales.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.context.annotation.PropertySource;

@Configuration
@Profile("dev")
// Load database-dev.yml with custom factory
@PropertySource(
    value = "classpath:database-dev.yml",
    factory = YamlPropertySourceFactory.class
)
public class DevDatabaseConfig {

}
