package com.flavortales.poi.service.translation;

import com.flavortales.poi.entity.Poi;
import com.flavortales.poi.entity.PoiJapanese;
import com.flavortales.poi.repository.PoiJapaneseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PoiJapaneseService {

    private final PoiJapaneseRepository repository;

    @Transactional
    public PoiJapanese upsert(Poi source, String translatedName, String translatedAddress) {
        PoiJapanese entity = repository.findByPoiId(source.getPoiId())
            .orElse(PoiJapanese.builder().poiId(source.getPoiId()).build());
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
    public Optional<PoiJapanese> findByPoiId(Integer poiId) {
        return repository.findByPoiId(poiId);
    }

    @Transactional
    public void deleteByPoiId(Integer poiId) {
        repository.deleteById(poiId);
    }
}
