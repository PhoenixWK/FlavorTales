package com.flavortales.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * Explicitly scopes JPA and MongoDB repositories so Spring Data
 * can unambiguously assign each repository to the correct store.
 *
 * JPA repositories: user.*, auth.*
 * MongoDB repositories: (none yet – reserved for future use)
 */
@Configuration
@EnableJpaRepositories(basePackages = {
        "com.flavortales.user.repository",
        "com.flavortales.auth.repository"
})
@EnableMongoRepositories(basePackages = {
        "com.flavortales.mongo.repository"   // placeholder – no conflict currently
})
public class DataStoreConfig {
}
