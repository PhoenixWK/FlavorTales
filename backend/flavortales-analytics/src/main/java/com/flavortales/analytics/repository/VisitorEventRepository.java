package com.flavortales.analytics.repository;

import com.flavortales.analytics.document.VisitorEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface VisitorEventRepository extends MongoRepository<VisitorEvent, String> {
}
