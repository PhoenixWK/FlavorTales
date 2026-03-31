package com.flavortales.poi.service.translation;

import com.flavortales.poi.entity.Poi;
import com.flavortales.poi.entity.PoiChinese;
import com.flavortales.poi.repository.PoiChineseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PoiChineseService {

    private final PoiChineseRepository repository;

    @Transactional
    public PoiChinese upsert(Poi source, String translatedName, String translatedAddress) {
        PoiChinese entity = repository.findByPoiId(source.getPoiId())
            .orElse(PoiChinese.builder().poiId(source.getPoiId()).build());
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
    public Optional<PoiChinese> findByPoiId(Integer poiId) {
        return repository.findByPoiId(poiId);
    }

    @Transactional
    public void deleteByPoiId(Integer poiId) {
        repository.deleteById(poiId);
    }
}

