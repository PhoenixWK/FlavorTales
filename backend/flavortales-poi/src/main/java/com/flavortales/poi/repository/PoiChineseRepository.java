package com.flavortales.poi.repository;

import com.flavortales.poi.entity.PoiChinese;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PoiChineseRepository extends JpaRepository<PoiChinese, Integer> {
    Optional<PoiChinese> findByPoiId(Integer poiId);
}

