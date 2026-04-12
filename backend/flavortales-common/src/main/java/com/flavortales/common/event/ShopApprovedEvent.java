package com.flavortales.common.event;

/**
 * Published after an admin approves a pending shop.
 * Consumed by flavortales-poi to evict and re-warm the active POI cache.
 */
public record ShopApprovedEvent(Integer shopId, Integer poiId) {}
