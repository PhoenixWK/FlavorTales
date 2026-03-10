package com.flavortales.poi.service;

import com.flavortales.poi.dto.PoiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Handles all Redis cache interactions for POI data.
 *
 * Read path: Redis → (miss) Slave DB.
 * Write path: Master DB write → cache update / eviction.
 *
 * Redis failures are caught and logged – they never propagate to the caller so
 * the application degrades gracefully to DB-only mode.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PoiCacheService {

    private static final String POI_KEY_PREFIX    = "poi:";
    private static final String POI_LIST_ACTIVE   = "poi:list:active";
    private static final long   TTL_SECONDS       = 3_600L; // 1 hour

    private final RedisTemplate<String, Object> redisTemplate;

    // ── Single POI ────────────────────────────────────────────────────────────

    public PoiResponse getFromCache(Integer poiId) {
        try {
            Object value = redisTemplate.opsForValue().get(POI_KEY_PREFIX + poiId);
            if (value instanceof PoiResponse cached) {
                log.debug("Cache hit: poi:{}", poiId);
                return cached;
            }
        } catch (Exception e) {
            log.warn("Redis read failed for poi:{} – {}", poiId, e.getMessage());
        }
        return null;
    }

    public void put(PoiResponse poi) {
        try {
            redisTemplate.opsForValue()
                    .set(POI_KEY_PREFIX + poi.getPoiId(), poi, TTL_SECONDS, TimeUnit.SECONDS);
            log.debug("Cached poi:{}", poi.getPoiId());
        } catch (Exception e) {
            log.warn("Redis write failed for poi:{} – {}", poi.getPoiId(), e.getMessage());
        }
    }

    public void evict(Integer poiId) {
        try {
            redisTemplate.delete(POI_KEY_PREFIX + poiId);
            log.debug("Evicted poi:{}", poiId);
        } catch (Exception e) {
            log.warn("Redis evict failed for poi:{} – {}", poiId, e.getMessage());
        }
    }

    // ── Active POI list ───────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public List<PoiResponse> getActivePoisFromCache() {
        try {
            Object value = redisTemplate.opsForValue().get(POI_LIST_ACTIVE);
            if (value instanceof List<?> list) {
                log.debug("Cache hit: active POI list ({} items)", list.size());
                return (List<PoiResponse>) list;
            }
        } catch (Exception e) {
            log.warn("Redis read failed for active POI list – {}", e.getMessage());
        }
        return null;
    }

    public void putActivePois(List<PoiResponse> pois) {
        try {
            redisTemplate.opsForValue().set(POI_LIST_ACTIVE, pois, TTL_SECONDS, TimeUnit.SECONDS);
            log.debug("Cached active POI list ({} items)", pois.size());
        } catch (Exception e) {
            log.warn("Redis write failed for active POI list – {}", e.getMessage());
        }
    }

    public void evictActivePoisList() {
        try {
            redisTemplate.delete(POI_LIST_ACTIVE);
        } catch (Exception e) {
            log.warn("Redis evict failed for active POI list – {}", e.getMessage());
        }
    }
}
