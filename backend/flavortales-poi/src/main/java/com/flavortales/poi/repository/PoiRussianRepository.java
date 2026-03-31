package com.flavortales.poi.repository;

import com.flavortales.poi.entity.PoiRussian;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PoiRussianRepository extends JpaRepository<PoiRussian, Integer> {
    Optional<PoiRussian> findByPoiId(Integer poiId);
}

