package com.flavortales.common.datasource;

/**
 * Thread-local holder that carries which datasource (MASTER / SLAVE) the
 * current request should use.  The AOP aspect writes to this holder before a
 * transaction is opened; RoutingDataSource reads from it when Spring asks for
 * a connection.
 */
public final class DataSourceContextHolder {

    private static final ThreadLocal<DataSourceType> CONTEXT =
            new ThreadLocal<>();

    private DataSourceContextHolder() {}

    /** Switch the current thread to use the MASTER (read-write) datasource. */
    public static void useMaster() {
        CONTEXT.set(DataSourceType.MASTER);
    }

    /** Switch the current thread to use the SLAVE (read-only) datasource. */
    public static void useSlave() {
        CONTEXT.set(DataSourceType.SLAVE);
    }

    /**
     * Returns the current datasource type, defaulting to MASTER when nothing
     * has been set (write-safety first).
     */
    public static DataSourceType getDataSourceType() {
        DataSourceType type = CONTEXT.get();
        return type != null ? type : DataSourceType.MASTER;
    }

    /** Removes the thread-local value to prevent memory leaks. */
    public static void clear() {
        CONTEXT.remove();
    }
}
