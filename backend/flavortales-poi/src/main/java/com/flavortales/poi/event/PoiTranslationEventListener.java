package com.flavortales.poi.event;

import com.flavortales.poi.service.translation.PoiTranslationOrchestrator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Runs POI translation asynchronously AFTER the POI update transaction commits,
 * avoiding the InnoDB deadlock caused by FK-lock contention inside the main transaction.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PoiTranslationEventListener {

    private final PoiTranslationOrchestrator orchestrator;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPoiTranslationRequested(PoiTranslationRequestedEvent event) {
        log.debug("Starting async translation for POI {}", event.poi().getPoiId());
        orchestrator.translateAndSave(event.poi());
    }
}
