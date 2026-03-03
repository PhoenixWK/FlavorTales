package com.flavortales.common.datasource;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;

/**
 * Dynamic datasource that delegates to the MASTER or SLAVE connection pool
 * based on the value stored in {@link DataSourceContextHolder} for the
 * current thread.
 */
@Slf4j
public class RoutingDataSource extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey() {
        DataSourceType type = DataSourceContextHolder.getDataSourceType();
        log.debug("Routing database operation to: {}", type);
        return type;
    }
}
