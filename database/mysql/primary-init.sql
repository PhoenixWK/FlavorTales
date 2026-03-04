-- ============================================================================
-- Primary-only init: create the replication user
-- Runs after 01-schema.sql because Docker processes init files alphabetically.
-- ============================================================================

CREATE USER IF NOT EXISTS 'replicator'@'%' IDENTIFIED WITH mysql_native_password BY 'replicator_pwd';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
FLUSH PRIVILEGES;
