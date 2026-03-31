package com.flavortales.poi.repository;

import com.flavortales.poi.entity.PoiJapanese;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PoiJapaneseRepository extends JpaRepository<PoiJapanese, Integer> {
    Optional<PoiJapanese> findByPoiId(Integer poiId);
}
