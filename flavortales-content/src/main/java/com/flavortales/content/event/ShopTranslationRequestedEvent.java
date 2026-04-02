package com.flavortales.content.event;

/**
 * Published after a shop is saved. Triggers async translation after the main transaction commits.
 */
public record ShopTranslationRequestedEvent(Integer shopId) {}
