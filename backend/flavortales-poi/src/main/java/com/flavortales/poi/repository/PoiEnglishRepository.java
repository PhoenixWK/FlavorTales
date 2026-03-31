package com.flavortales.poi.repository;

import com.flavortales.poi.entity.PoiEnglish;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PoiEnglishRepository extends JpaRepository<PoiEnglish, Integer> {
    Optional<PoiEnglish> findByPoiId(Integer poiId);
}
