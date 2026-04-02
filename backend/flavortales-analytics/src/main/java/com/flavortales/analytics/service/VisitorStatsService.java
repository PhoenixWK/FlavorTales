package com.flavortales.analytics.service;

import com.flavortales.analytics.dto.VisitorStatPoint;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class VisitorStatsService {

    private static final String TIMEZONE = "+07:00";
    private final MongoTemplate mongoTemplate;

    /**
     * Returns visitor counts aggregated by the given period.
     *
     * @param period one of: day, week, month, year
     */
    public List<VisitorStatPoint> getStats(String period) {
        Instant from = resolveFrom(period);
        String dateFormat = resolveDateFormat(period);

        AggregationOperation matchStage = Aggregation.match(
                Criteria.where("timestamp").gte(from));

        AggregationOperation groupStage = ctx -> new Document("$group",
                new Document("_id", new Document("$dateToString",
                        new Document("format", dateFormat)
                                .append("date", "$timestamp")
                                .append("timezone", TIMEZONE)))
                        .append("count", new Document("$sum", 1)));

        AggregationOperation sortStage = Aggregation.sort(Sort.Direction.ASC, "_id");

        Aggregation aggregation = Aggregation.newAggregation(matchStage, groupStage, sortStage);

        return mongoTemplate
                .aggregate(aggregation, "visitor_events", Map.class)
                .getMappedResults()
                .stream()
                .map(row -> new VisitorStatPoint(
                        String.valueOf(row.get("_id")),
                        ((Number) row.get("count")).longValue()
                ))
                .toList();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Instant resolveFrom(String period) {
        return switch (period) {
            case "week"  -> Instant.now().minus(7, ChronoUnit.DAYS);
            case "month" -> Instant.now().minus(30, ChronoUnit.DAYS);
            case "year"  -> Instant.now().minus(365, ChronoUnit.DAYS);
            default      -> Instant.now().minus(1, ChronoUnit.DAYS);   // "day"
        };
    }

    private String resolveDateFormat(String period) {
        return switch (period) {
            case "year" -> "%Y-%m";
            case "day"  -> "%H:00";
            default     -> "%Y-%m-%d";   // week, month
        };
    }
}
