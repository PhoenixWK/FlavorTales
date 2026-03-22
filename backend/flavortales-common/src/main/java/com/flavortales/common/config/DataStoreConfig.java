package com.flavortales.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * Explicitly scopes JPA repositories so Spring Data can unambiguously assign
 * each repository to the correct store.
 *
 * <p>JPA repositories ({@code user.*}, {@code auth.*}) are wired to the
 * custom {@code entityManagerFactory} and {@code transactionManager} beans
 * defined in {@link DataSourceConfig}. This ensures every repository call
 * goes through the {@link com.flavortales.common.datasource.RoutingDataSource}
 * and respects the master / slave routing set by the AOP aspect.
 *
 * <p>MongoDB repositories ({@code location.*}) use Spring Boot's
 * auto-configured {@code MongoClient} and are scoped here to avoid
 * ambiguity with JPA repositories.
 */
@Configuration
@EnableJpaRepositories(
        basePackages = {
                "com.flavortales.user.repository",
                "com.flavortales.auth.repository",
                "com.flavortales.poi.repository"
        },
        entityManagerFactoryRef = "entityManagerFactory",
        transactionManagerRef  = "transactionManager"
)
@EnableMongoRepositories(
        basePackages = "com.flavortales.location.repository"
)
public class DataStoreConfig {
}
