package com.flavortales.common.config;

import com.flavortales.common.datasource.DataSourceContextHolder;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * Diagnostic endpoint that reports the active datasource connections.
 * Useful during development to confirm master / slave routing is working.
 *
 * <p><b>Remove or secure this endpoint before production deployment.</b>
 */
@RestController
public class DatabaseConfigController {

    private final DataSource masterDataSource;
    private final DataSource slaveDataSource;

    public DatabaseConfigController(
            @Qualifier("masterDataSource") DataSource masterDataSource,
            @Qualifier("slaveDataSource") DataSource slaveDataSource) {
        this.masterDataSource = masterDataSource;
        this.slaveDataSource  = slaveDataSource;
    }

    @GetMapping("/database-config")
    public String getDatabaseConfig() {
        String masterUrl = resolveUrl(masterDataSource);
        String slaveUrl  = resolveUrl(slaveDataSource);
        String currentDs = DataSourceContextHolder.getDataSourceType().name();
        return String.format(
                "Master URL: %s | Slave URL: %s | Current thread DS: %s",
                masterUrl, slaveUrl, currentDs);
    }

    private String resolveUrl(DataSource ds) {
        try (Connection conn = ds.getConnection()) {
            return conn.getMetaData().getURL();
        } catch (SQLException e) {
            return "(unavailable: " + e.getMessage() + ")";
        }
    }
}
