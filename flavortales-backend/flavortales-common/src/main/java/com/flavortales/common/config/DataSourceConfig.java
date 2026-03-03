package com.flavortales.common.config;

import com.flavortales.common.datasource.DataSourceContextHolder;
import com.flavortales.common.datasource.DataSourceType;
import com.flavortales.common.datasource.RoutingDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.boot.orm.jpa.EntityManagerFactoryBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import jakarta.persistence.EntityManagerFactory;
import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

/**
 * Configures the master / slave datasource routing infrastructure.
 *
 * <ul>
 *   <li><b>masterDataSource</b> – primary read-write pool (bound to
 *       {@code spring.datasource.master.*})</li>
 *   <li><b>slaveDataSource</b>  – read-only replica pool (bound to
 *       {@code spring.datasource.slave.*})</li>
 *   <li><b>dataSource</b>       – {@link RoutingDataSource} registered as
 *       {@code @Primary}; delegates to master or slave based on the thread-local
 *       state from {@link DataSourceContextHolder}</li>
 * </ul>
 *
 * <p>A custom {@link LocalContainerEntityManagerFactoryBean} and
 * {@link JpaTransactionManager} are wired explicitly so that Spring Data JPA
 * always uses the routing datasource and not any auto-configured one.
 */
@Slf4j
@Configuration
@EnableTransactionManagement
public class DataSourceConfig {

    // -------------------------------------------------------------------------
    // Individual datasource beans
    // -------------------------------------------------------------------------

    /**
     * Master (read-write) connection pool.
     * Properties are bound from {@code spring.datasource.master.*} in the
     * active profile's YAML (e.g. {@code database-dev.yml}).
     */
    @Bean("masterDataSource")
    @ConfigurationProperties(prefix = "spring.datasource.master")
    public DataSource masterDataSource() {
        log.info("[DataSourceConfig] Initialising MASTER datasource");
        return DataSourceBuilder.create().build();
    }

    /**
     * Slave (read-only) connection pool.
     * Properties are bound from {@code spring.datasource.slave.*}.
     */
    @Bean("slaveDataSource")
    @ConfigurationProperties(prefix = "spring.datasource.slave")
    public DataSource slaveDataSource() {
        log.info("[DataSourceConfig] Initialising SLAVE datasource");
        return DataSourceBuilder.create().build();
    }

    // -------------------------------------------------------------------------
    // Routing datasource  (primary)
    // -------------------------------------------------------------------------

    /**
     * Routing datasource that Spring Data JPA (and all repository operations)
     * will use.  Its {@code determineCurrentLookupKey()} reads the
     * {@link DataSourceContextHolder} which is populated by
     * {@link com.flavortales.common.aop.DataSourceAspect} <em>before</em> any
     * transaction is started.
     */
    @Primary
    @Bean("dataSource")
    public DataSource routingDataSource(
            @Qualifier("masterDataSource") DataSource master,
            @Qualifier("slaveDataSource") DataSource slave) {

        Map<Object, Object> targets = new HashMap<>();
        targets.put(DataSourceType.MASTER, master);
        targets.put(DataSourceType.SLAVE, slave);

        RoutingDataSource routing = new RoutingDataSource();
        routing.setTargetDataSources(targets);
        routing.setDefaultTargetDataSource(master);  // safe default: write node
        routing.afterPropertiesSet();                 // initialise lookup map eagerly

        log.info("[DataSourceConfig] RoutingDataSource ready – default target: MASTER");
        return routing;
    }

    // -------------------------------------------------------------------------
    // JPA / Transaction beans
    // -------------------------------------------------------------------------

    /**
     * {@link LocalContainerEntityManagerFactoryBean} wired to the routing
     * datasource.  Scans all {@code com.flavortales} subpackages for
     * {@code @Entity} classes.
     */
    @Primary
    @Bean("entityManagerFactory")
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(
            @Qualifier("dataSource") DataSource routingDataSource) {

        HibernateJpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();

        LocalContainerEntityManagerFactoryBean emf =
                new LocalContainerEntityManagerFactoryBean();
        emf.setDataSource(routingDataSource);
        emf.setPackagesToScan("com.flavortales");
        emf.setJpaVendorAdapter(vendorAdapter);

        // Carry over helpful Hibernate settings from application YAML.
        // hibernate.dialect is set explicitly so Hibernate does not need a live
        // JDBC connection during startup to auto-detect the dialect from metadata
        // (which would fail because the RoutingDataSource has no thread-local key
        // set at that point).
        Map<String, Object> jpaProps = new HashMap<>();
        jpaProps.put("hibernate.hbm2ddl.auto", "none");
        jpaProps.put("hibernate.show_sql", "true");
        jpaProps.put("hibernate.format_sql", "true");
        jpaProps.put("hibernate.dialect", "org.hibernate.dialect.MySQLDialect");
        emf.setJpaPropertyMap(jpaProps);

        return emf;
    }

    /**
     * JPA transaction manager bound to our custom EntityManagerFactory so that
     * every {@code @Transactional} method participates in the correct
     * datasource routing session.
     */
    @Primary
    @Bean("transactionManager")
    public PlatformTransactionManager transactionManager(
            @Qualifier("entityManagerFactory") EntityManagerFactory emf) {
        return new JpaTransactionManager(emf);
    }
}
