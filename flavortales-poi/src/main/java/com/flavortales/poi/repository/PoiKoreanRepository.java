package com.flavortales.poi.repository;

import com.flavortales.poi.entity.PoiKorean;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PoiKoreanRepository extends JpaRepository<PoiKorean, Integer> {
    Optional<PoiKorean> findByPoiId(Integer poiId);
}

