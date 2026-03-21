package com.flavortales.audio.service;

import com.flavortales.audio.dto.AudioResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Redis cache layer cho Audio module.
 *
 * Chiến lược TTL:
 *  - audio:shop:{shopId}    → 15 phút  (danh sách audio của shop, vendor ít cập nhật)
 *  - audio:poi:{poiId}      → 15 phút  (khách truy cập đọc nhiều, cần tương đối fresh)
 *  - audio:url:{audioId}    → 7 ngày   (CDN URL bất biến, cache dài hạn)
 *  - audio:duration:{audioId} → 24 giờ (thời lượng không thay đổi sau khi upload)
 *  - audio:status:{audioId} → 30 giây  (polling status khi TTS đang xử lý)
 *                           → 24 giờ   (sau khi completed/failed)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AudioCacheService {

    private final RedisTemplate<String, Object> redisTemplate;

    // ── Key builders ─────────────────────────────────────────────────────────

    private static final String KEY_SHOP   = "audio:shop:";
    private static final String KEY_POI    = "audio:poi:";
    private static final String KEY_URL    = "audio:url:";
    private static final String KEY_DUR    = "audio:duration:";
    private static final String KEY_STATUS = "audio:status:";

    // ── TTL constants (giây) ─────────────────────────────────────────────────

    private static final long TTL_LIST_SEC     = 15 * 60;       // 15 phút
    private static final long TTL_URL_SEC      = 7 * 24 * 60 * 60;  // 7 ngày (CDN URL bất biến)
    private static final long TTL_DUR_SEC      = 24 * 60 * 60;  // 24 giờ
    private static final long TTL_STATUS_SHORT = 30;             // 30 giây (đang xử lý)
    private static final long TTL_STATUS_LONG  = 24 * 60 * 60;  // 24 giờ (hoàn thành)

    // ── Shop audio list ────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public List<AudioResponse> getByShop(Integer shopId) {
        try {
            Object val = redisTemplate.opsForValue().get(KEY_SHOP + shopId);
            if (val instanceof List<?> list) return (List<AudioResponse>) list;
        } catch (Exception e) {
            log.warn("[AudioCache] getByShop shopId={} error: {}", shopId, e.getMessage());
        }
        return null;
    }

    public void putByShop(Integer shopId, List<AudioResponse> data) {
        try {
            redisTemplate.opsForValue().set(KEY_SHOP + shopId, data, TTL_LIST_SEC, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("[AudioCache] putByShop shopId={} error: {}", shopId, e.getMessage());
        }
    }

    public void evictByShop(Integer shopId) {
        try {
            redisTemplate.delete(KEY_SHOP + shopId);
        } catch (Exception e) {
            log.warn("[AudioCache] evictByShop shopId={} error: {}", shopId, e.getMessage());
        }
    }

    // ── POI audio list ─────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public List<AudioResponse> getByPoi(Integer poiId) {
        try {
            Object val = redisTemplate.opsForValue().get(KEY_POI + poiId);
            if (val instanceof List<?> list) return (List<AudioResponse>) list;
        } catch (Exception e) {
            log.warn("[AudioCache] getByPoi poiId={} error: {}", poiId, e.getMessage());
        }
        return null;
    }

    public void putByPoi(Integer poiId, List<AudioResponse> data) {
        try {
            redisTemplate.opsForValue().set(KEY_POI + poiId, data, TTL_LIST_SEC, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("[AudioCache] putByPoi poiId={} error: {}", poiId, e.getMessage());
        }
    }

    public void evictByPoi(Integer poiId) {
        try {
            if (poiId != null) redisTemplate.delete(KEY_POI + poiId);
        } catch (Exception e) {
            log.warn("[AudioCache] evictByPoi poiId={} error: {}", poiId, e.getMessage());
        }
    }

    // ── Single URL cache ───────────────────────────────────────────────────────

    public String getUrl(Integer audioId) {
        try {
            Object val = redisTemplate.opsForValue().get(KEY_URL + audioId);
            return val instanceof String s ? s : null;
        } catch (Exception e) {
            log.warn("[AudioCache] getUrl audioId={} error: {}", audioId, e.getMessage());
            return null;
        }
    }

    public void putUrl(Integer audioId, String url) {
        try {
            redisTemplate.opsForValue().set(KEY_URL + audioId, url, TTL_URL_SEC, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("[AudioCache] putUrl audioId={} error: {}", audioId, e.getMessage());
        }
    }

    // ── Duration cache ─────────────────────────────────────────────────────────

    public Double getDuration(Integer audioId) {
        try {
            Object val = redisTemplate.opsForValue().get(KEY_DUR + audioId);
            if (val instanceof Number n) return n.doubleValue();
        } catch (Exception e) {
            log.warn("[AudioCache] getDuration audioId={} error: {}", audioId, e.getMessage());
        }
        return null;
    }

    public void putDuration(Integer audioId, Double durationSeconds) {
        try {
            redisTemplate.opsForValue().set(KEY_DUR + audioId, durationSeconds, TTL_DUR_SEC, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("[AudioCache] putDuration audioId={} error: {}", audioId, e.getMessage());
        }
    }

    // ── Processing status cache ────────────────────────────────────────────────

    public String getProcessingStatus(Integer audioId) {
        try {
            Object val = redisTemplate.opsForValue().get(KEY_STATUS + audioId);
            return val instanceof String s ? s : null;
        } catch (Exception e) {
            log.warn("[AudioCache] getProcessingStatus audioId={} error: {}", audioId, e.getMessage());
            return null;
        }
    }

    public void putProcessingStatus(Integer audioId, String status) {
        // Nếu đang xử lý → TTL ngắn để client polling nhanh
        // Nếu hoàn thành/thất bại → TTL dài
        long ttl = "processing".equals(status) ? TTL_STATUS_SHORT : TTL_STATUS_LONG;
        try {
            redisTemplate.opsForValue().set(KEY_STATUS + audioId, status, ttl, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("[AudioCache] putProcessingStatus audioId={} error: {}", audioId, e.getMessage());
        }
    }

    // ── Evict all keys for an audio record ──────────────────────────────────────

    public void evictAudio(Integer audioId, Integer shopId, Integer poiId) {
        try {
            redisTemplate.delete(KEY_URL    + audioId);
            redisTemplate.delete(KEY_DUR    + audioId);
            redisTemplate.delete(KEY_STATUS + audioId);
            evictByShop(shopId);
            evictByPoi(poiId);
        } catch (Exception e) {
            log.warn("[AudioCache] evictAudio audioId={} error: {}", audioId, e.getMessage());
        }
    }
}
