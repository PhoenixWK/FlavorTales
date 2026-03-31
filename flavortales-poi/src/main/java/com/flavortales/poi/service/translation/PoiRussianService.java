package com.flavortales.poi.service.translation;

import com.flavortales.poi.entity.Poi;
import com.flavortales.poi.entity.PoiRussian;
import com.flavortales.poi.repository.PoiRussianRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PoiRussianService {

    private final PoiRussianRepository repository;

    @Transactional
    public PoiRussian upsert(Poi source, String translatedName, String translatedAddress) {
        PoiRussian entity = repository.findByPoiId(source.getPoiId())
            .orElse(PoiRussian.builder().poiId(source.getPoiId()).build());
        entity.setVendorId(source.getVendorId());
        entity.setName(translatedName);
        entity.setLatitude(source.getLatitude());
        entity.setLongitude(source.getLongitude());
        entity.setRadius(source.getRadius());
        entity.setAddress(translatedAddress);
        entity.setStatus(source.getStatus());
        entity.setLikesCount(source.getLikesCount());
        entity.setDeletedAt(source.getDeletedAt());
        return repository.save(entity);
    }

    @Transactional(readOnly = true)
    public Optional<PoiRussian> findByPoiId(Integer poiId) {
        return repository.findByPoiId(poiId);
    }

    @Transactional
    public void deleteByPoiId(Integer poiId) {
        repository.deleteById(poiId);
    }
}

