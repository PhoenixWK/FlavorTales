package com.flavortales.poi.listener;

import com.flavortales.common.event.ShopApprovedEvent;
import com.flavortales.poi.service.PoiCacheService;
import com.flavortales.poi.service.PoiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

/**
 * Evicts stale POI cache entries and re-warms the active list
 * after admin approves a shop (and its linked POI).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ShopApprovedEventListener {

    private final PoiCacheService poiCacheService;
    private final PoiService      poiService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onShopApproved(ShopApprovedEvent event) {
        log.info("ShopApprovedEvent received: shopId={}, poiId={} — evicting POI cache",
                event.shopId(), event.poiId());

        if (event.poiId() != null) {
            poiCacheService.evict(event.poiId());
        }
        poiCacheService.evictActivePoisList();

        // Eagerly re-warm so the next map load hits Redis, not DB
        poiService.getActivePois();
        log.info("Active POI cache re-warmed after shop approval (shopId={})", event.shopId());
    }
}
