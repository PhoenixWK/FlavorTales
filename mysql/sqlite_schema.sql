-- Enable foreign key support (run at every connection)
PRAGMA foreign_keys = ON;

-- =============================================
-- MODULE 6: OFFLINE MODE
-- =============================================

-- Lưu trữ metadata của POI đã cache (FR-OM-001)
CREATE TABLE IF NOT EXISTS cached_poi (
    cached_poi_id INTEGER PRIMARY KEY AUTOINCREMENT,
    poi_id INTEGER NOT NULL UNIQUE,       -- Reference to MySQL poi.poi_id
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius REAL NOT NULL,
    last_accessed_at TEXT DEFAULT (datetime('now')),
    cached_at TEXT DEFAULT (datetime('now')),
    is_stale INTEGER DEFAULT 0,           -- 0 = fresh, 1 = stale (sau 7 ngày)
    data_size_bytes INTEGER DEFAULT 0     -- Theo dõi kích thước để quản lý LRU
);

CREATE INDEX IF NOT EXISTS idx_cached_poi_poi_id ON cached_poi(poi_id);
CREATE INDEX IF NOT EXISTS idx_cached_poi_last_accessed ON cached_poi(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_cached_poi_is_stale ON cached_poi(is_stale);

-- =============================================

-- Lưu trữ thông tin shop đã cache gắn với POI (FR-OM-001)
CREATE TABLE IF NOT EXISTS cached_shop (
    cached_shop_id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL UNIQUE,      -- Reference to MySQL shop.shop_id
    cached_poi_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    avatar_thumbnail_url TEXT,            -- Thumbnail only, max 200KB
    cuisine_style TEXT,
    featured_dish TEXT,
    cached_at TEXT DEFAULT (datetime('now')),
    last_accessed_at TEXT DEFAULT (datetime('now')),
    data_size_bytes INTEGER DEFAULT 0,
    FOREIGN KEY (cached_poi_id) REFERENCES cached_poi(cached_poi_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cached_shop_shop_id ON cached_shop(shop_id);
CREATE INDEX IF NOT EXISTS idx_cached_shop_cached_poi_id ON cached_shop(cached_poi_id);
CREATE INDEX IF NOT EXISTS idx_cached_shop_last_accessed ON cached_shop(last_accessed_at);

-- =============================================

-- Lưu trữ menu item đã cache (FR-OM-001)
CREATE TABLE IF NOT EXISTS cached_menu_item (
    cached_menu_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL UNIQUE,      -- Reference to MySQL menu_item.item_id
    cached_shop_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    image_thumbnail_url TEXT,             -- Thumbnail only, max 200KB
    cached_at TEXT DEFAULT (datetime('now')),
    last_accessed_at TEXT DEFAULT (datetime('now')),
    data_size_bytes INTEGER DEFAULT 0,
    FOREIGN KEY (cached_shop_id) REFERENCES cached_shop(cached_shop_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cached_menu_item_item_id ON cached_menu_item(item_id);
CREATE INDEX IF NOT EXISTS idx_cached_menu_item_cached_shop_id ON cached_menu_item(cached_shop_id);

-- =============================================

-- Lưu trữ metadata audio đã cache (FR-OM-001, FR-OM-002)
CREATE TABLE IF NOT EXISTS cached_audio (
    cached_audio_id INTEGER PRIMARY KEY AUTOINCREMENT,
    audio_id INTEGER NOT NULL UNIQUE,     -- Reference to MySQL audio.audio_id
    cached_poi_id INTEGER NOT NULL,
    language_code TEXT NOT NULL,          -- e.g. vi, en, zh
    file_local_path TEXT,                 -- Local path sau khi download đầy đủ
    is_fully_downloaded INTEGER DEFAULT 0, -- 0 = metadata only, 1 = full file cached
    cached_at TEXT DEFAULT (datetime('now')),
    last_accessed_at TEXT DEFAULT (datetime('now')),
    data_size_bytes INTEGER DEFAULT 0,
    FOREIGN KEY (cached_poi_id) REFERENCES cached_poi(cached_poi_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cached_audio_audio_id ON cached_audio(audio_id);
CREATE INDEX IF NOT EXISTS idx_cached_audio_cached_poi_id ON cached_audio(cached_poi_id);
CREATE INDEX IF NOT EXISTS idx_cached_audio_language ON cached_audio(cached_poi_id, language_code);
CREATE INDEX IF NOT EXISTS idx_cached_audio_last_accessed ON cached_audio(last_accessed_at);

-- =============================================

-- Quản lý tổng dung lượng cache và ngưỡng cảnh báo (FR-OM-005)
CREATE TABLE IF NOT EXISTS cache_storage_info (
    id INTEGER PRIMARY KEY CHECK(id = 1), -- Singleton row
    total_size_bytes INTEGER DEFAULT 0,
    poi_size_bytes INTEGER DEFAULT 0,
    shop_image_size_bytes INTEGER DEFAULT 0,
    menu_image_size_bytes INTEGER DEFAULT 0,
    audio_size_bytes INTEGER DEFAULT 0,
    max_total_size_bytes INTEGER DEFAULT 52428800,   -- 50MB
    max_audio_size_bytes INTEGER DEFAULT 104857600,  -- 100MB
    last_checked_at TEXT DEFAULT (datetime('now')),
    last_cleaned_at TEXT
);

-- Khởi tạo singleton row
INSERT OR IGNORE INTO cache_storage_info (id) VALUES (1);

-- =============================================

-- Lưu trạng thái đồng bộ của từng POI khi có mạng (FR-OM-006)
CREATE TABLE IF NOT EXISTS cache_sync_status (
    sync_id INTEGER PRIMARY KEY AUTOINCREMENT,
    cached_poi_id INTEGER NOT NULL UNIQUE,
    last_synced_at TEXT,
    sync_status TEXT DEFAULT 'pending'
        CHECK(sync_status IN ('pending', 'syncing', 'synced', 'failed')),
    server_last_modified TEXT,            -- Timestamp từ server để so sánh delta
    retry_count INTEGER DEFAULT 0,
    FOREIGN KEY (cached_poi_id) REFERENCES cached_poi(cached_poi_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cache_sync_status_poi ON cache_sync_status(cached_poi_id);
CREATE INDEX IF NOT EXISTS idx_cache_sync_status_status ON cache_sync_status(sync_status);

-- =============================================

-- Lưu preference offline của người dùng (FR-OM-006, FR-OM-007)
CREATE TABLE IF NOT EXISTS offline_preference (
    id INTEGER PRIMARY KEY CHECK(id = 1), -- Singleton row
    auto_sync_enabled INTEGER DEFAULT 1,  -- 0 = off, 1 = on
    sync_wifi_only INTEGER DEFAULT 0,     -- 0 = any, 1 = wifi only
    sync_frequency TEXT DEFAULT 'hourly'
        CHECK(sync_frequency IN ('hourly', 'daily', 'manual')),
    show_offline_modal INTEGER DEFAULT 1, -- 0 = đã tắt "Không hiện lại"
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Khởi tạo singleton row
INSERT OR IGNORE INTO offline_preference (id) VALUES (1);