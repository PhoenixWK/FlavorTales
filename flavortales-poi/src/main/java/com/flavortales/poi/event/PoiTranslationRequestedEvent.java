package com.flavortales.poi.event;

import com.flavortales.poi.entity.Poi;

/**
 * Published after a POI is saved. Triggers async translation after the main transaction commits.
 */
public record PoiTranslationRequestedEvent(Poi poi) {}
