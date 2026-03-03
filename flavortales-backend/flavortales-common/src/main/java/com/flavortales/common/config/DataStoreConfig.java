package com.flavortales.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

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
 * <p>MongoDB repositories: not enabled – MongoDB auto-configuration is excluded
 * at the application level. Re-add {@code @EnableMongoRepositories} here when
 * a MongoDB server is provisioned.
 */
@Configuration
@EnableJpaRepositories(
        basePackages = {
                "com.flavortales.user.repository",
                "com.flavortales.auth.repository"
        },
        entityManagerFactoryRef = "entityManagerFactory",
        transactionManagerRef  = "transactionManager"
)
public class DataStoreConfig {
}
