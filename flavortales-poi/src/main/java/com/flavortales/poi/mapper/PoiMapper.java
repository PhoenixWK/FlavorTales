package com.flavortales.poi.mapper;

import com.flavortales.poi.dto.PoiResponse;
import com.flavortales.poi.entity.Poi;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface PoiMapper {

    @Mapping(source = "status", target = "status", qualifiedByName = "statusToString")
    @Mapping(target = "linkedShopId", ignore = true)
    PoiResponse toResponse(Poi poi);

    @Named("statusToString")
    default String statusToString(com.flavortales.poi.entity.PoiStatus status) {
        return status == null ? null : status.name();
    }
}
