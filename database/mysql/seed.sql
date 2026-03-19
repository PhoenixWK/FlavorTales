-- ============================================================================
-- Seed Data
-- Runs as 03-seed.sql on the primary (master) container only.
-- Replica receives this data automatically via GTID replication.
-- ============================================================================

USE flavortales;

-- Admin account
-- Password: admin123 (BCrypt cost 10)
INSERT IGNORE INTO user (email, password_hash, role, full_name, phone, status)
VALUES (
    'theanonymoustester123@gmail.com',
    '$2b$10$B1vt2c9QOwmskOCSHUvikOHLlClSoXm25SxTCE.ak6ki9wIy8J2Oa',
    'admin',
    'Admin User',
    NULL,
    'active'
);
