package com.flavortales.poi.service.translation;

import com.flavortales.poi.dto.TranslationPreviewResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Stores and retrieves translation preview results in Redis.
 * Key: poi:translation:draft:{vendorEmail}  TTL: 30 minutes.
 * The draft is consumed (deleted) when the vendor submits the POI creation form.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TranslationDraftCacheService {

    private static final String KEY_PREFIX = "poi:translation:draft:";
    private static final Duration TTL = Duration.ofMinutes(30);

    @Qualifier("poiRedisTemplate")
    private final RedisTemplate<String, Object> redisTemplate;

    public void save(String vendorEmail, TranslationPreviewResponse draft) {
        String key = KEY_PREFIX + vendorEmail;
        redisTemplate.opsForValue().set(key, draft, TTL);
        log.debug("Translation draft cached for vendor={}", vendorEmail);
    }

    public TranslationPreviewResponse get(String vendorEmail) {
        String key = KEY_PREFIX + vendorEmail;
        Object value = redisTemplate.opsForValue().get(key);
        if (value instanceof TranslationPreviewResponse preview) {
            return preview;
        }
        return null;
    }

    public void delete(String vendorEmail) {
        redisTemplate.delete(KEY_PREFIX + vendorEmail);
    }
}
