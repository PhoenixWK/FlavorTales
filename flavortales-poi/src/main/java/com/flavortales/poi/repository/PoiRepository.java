package com.flavortales.poi.repository;

import com.flavortales.poi.entity.Poi;
import com.flavortales.poi.entity.PoiStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PoiRepository extends JpaRepository<Poi, Integer> {

    List<Poi> findByStatus(PoiStatus status);
}
