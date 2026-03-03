package com.flavortales.common.datasource;

/**
 * Identifies which physical datasource to use for a given operation.
 * MASTER  – primary (read-write) node.
 * SLAVE   – replica (read-only)  node.
 */
public enum DataSourceType {
    MASTER,
    SLAVE
}
