package com.flavortales.content.event;

import com.flavortales.content.service.translation.ShopTranslationOrchestrator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Runs shop translation asynchronously AFTER the shop update transaction commits,
 * avoiding the InnoDB deadlock caused by FK-lock contention inside the main transaction.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ShopTranslationEventListener {

    private final ShopTranslationOrchestrator orchestrator;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onShopTranslationRequested(ShopTranslationRequestedEvent event) {
        log.debug("Starting async translation for shop {}", event.shopId());
        orchestrator.translateAndSave(event.shopId());
    }
}
