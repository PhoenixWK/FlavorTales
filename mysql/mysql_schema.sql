-- ============================================================================
-- MySQL Database Schema for Food Stall Automatic Narrative System
-- ============================================================================
-- Version: 1.0
-- Description: Complete database schema including tables, indexes, and constraints
-- ============================================================================

-- Create Database
CREATE DATABASE IF NOT EXISTS flavortales
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE flavortales;

-- ============================================================================
-- USERS MANAGEMENT
-- ============================================================================

-- Users Table
CREATE TABLE user (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('vendor', 'admin') NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    status ENUM('active', 'inactive', 'pending', 'rejected', 'suspended', 'disabled') DEFAULT 'inactive',
    password_changed_at TIMESTAMP NULL COMMENT 'Set when password is changed via recovery; used to invalidate prior JWT sessions',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role_status (role, status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email Verification Table
CREATE TABLE email_verification (
    verification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    verification_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_verification_code (verification_code),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Login Attempt Table (rate limiting & lockout – FR-UM-004)
CREATE TABLE login_attempt (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL COMMENT 'Normalised email or username used during login attempt',
    success BOOLEAN NOT NULL DEFAULT FALSE,
    locked_until TIMESTAMP NULL COMMENT 'Non-null on lockout sentinel rows; NULL on regular attempt rows',
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_la_identifier (identifier),
    INDEX idx_la_attempted_at (attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password Reset Token Table (FR-UM-004: Password Recovery)
CREATE TABLE password_reset_token (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token CHAR(6) NOT NULL UNIQUE COMMENT 'Cryptographically random 6-digit numeric reset code',
    expires_at TIMESTAMP NOT NULL COMMENT 'Valid for 30 minutes from creation',
    is_used BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'TRUE once the token has been consumed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE CASCADE,
    INDEX idx_prt_token (token),
    INDEX idx_prt_user_id (user_id),
    INDEX idx_prt_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- MODULE 3: POI MANAGEMENT
-- =============================================

CREATE TABLE poi (
    poi_id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL COMMENT 'Vendor who created this POI',
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius DECIMAL(8, 2) NOT NULL COMMENT 'Unit: meters',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES user(user_id) ON DELETE RESTRICT,
    INDEX idx_status (status),
    INDEX idx_vendor (vendor_id),
    INDEX idx_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- MODULE: FILE MANAGEMENT (flavortales-file)
-- Bảng trung tâm quản lý mọi file trên R2
-- ============================================================================

CREATE TABLE file_asset (
    file_id        INT AUTO_INCREMENT PRIMARY KEY,
    owner_id       INT NOT NULL COMMENT 'user_id của người upload',
    bucket         VARCHAR(100) NOT NULL COMMENT 'R2 bucket name',
    object_key     VARCHAR(1000) NOT NULL COMMENT 'R2 object key / path',
    file_url       VARCHAR(1000) NOT NULL COMMENT 'Public hoặc pre-signed URL gốc',
    file_type      ENUM('image', 'audio', 'document', 'other') NOT NULL,
    mime_type      VARCHAR(100),
    size_bytes     BIGINT UNSIGNED COMMENT 'File size tính bằng bytes',
    checksum       VARCHAR(64) COMMENT 'SHA-256 checksum để verify integrity',
    version        INT UNSIGNED DEFAULT 1 COMMENT 'Version file nếu có replace',
    status         ENUM('active', 'deleted') DEFAULT 'active',
    uploaded_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at     TIMESTAMP NULL,
    FOREIGN KEY (owner_id) REFERENCES user(user_id) ON DELETE RESTRICT,
    INDEX idx_owner (owner_id),
    INDEX idx_file_type (file_type),
    INDEX idx_bucket_key (bucket, object_key(255)),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- MODULE 5: CONTENT MANAGEMENT — chỉnh lại shop & menu_item
-- ============================================================================

CREATE TABLE shop (
    shop_id        INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id      INT NOT NULL,
    poi_id         INT,
    avatar_file_id INT NULL COMMENT 'FK → file_asset, thay cho avatar_url',
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    cuisine_style  VARCHAR(100),
    featured_dish  VARCHAR(255),
    status         ENUM('pending', 'active', 'rejected', 'disabled') DEFAULT 'pending',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id)      REFERENCES user(user_id)       ON DELETE RESTRICT,
    FOREIGN KEY (poi_id)         REFERENCES poi(poi_id)          ON DELETE SET NULL,
    FOREIGN KEY (avatar_file_id) REFERENCES file_asset(file_id)  ON DELETE SET NULL,
    INDEX idx_vendor_id (vendor_id),
    INDEX idx_poi_id (poi_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE menu_item (
    item_id        INT AUTO_INCREMENT PRIMARY KEY,
    shop_id        INT NOT NULL,
    image_file_id  INT NULL COMMENT 'FK → file_asset, thay cho image_url',
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    status         ENUM('pending', 'active', 'rejected', 'disabled') DEFAULT 'pending',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id)       REFERENCES shop(shop_id)        ON DELETE CASCADE,
    FOREIGN KEY (image_file_id) REFERENCES file_asset(file_id)  ON DELETE SET NULL,
    INDEX idx_shop_id (shop_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- MODULE 4: AUDIO GUIDE — chỉnh lại audio
-- audio module → file module → R2, không lưu file_url trực tiếp
-- ============================================================================

CREATE TABLE audio (
    audio_id       INT AUTO_INCREMENT PRIMARY KEY,
    poi_id         INT NOT NULL,
    shop_id        INT NOT NULL,
    file_id        INT NOT NULL COMMENT 'FK → file_asset, chứa toàn bộ metadata R2',
    language_code  VARCHAR(10) NOT NULL COMMENT 'vi, en, zh...',
    status         ENUM('pending', 'active', 'rejected', 'disabled') DEFAULT 'pending',
    uploaded_by    INT NOT NULL COMMENT 'vendor user_id',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (poi_id)      REFERENCES poi(poi_id)        ON DELETE CASCADE,
    FOREIGN KEY (shop_id)     REFERENCES shop(shop_id)      ON DELETE CASCADE,
    FOREIGN KEY (file_id)     REFERENCES file_asset(file_id) ON DELETE RESTRICT,
    FOREIGN KEY (uploaded_by) REFERENCES user(user_id)      ON DELETE RESTRICT,
    INDEX idx_poi_language (poi_id, language_code),
    INDEX idx_shop_id (shop_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


