package com.flavortales.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app.translation")
public class TranslationProperties {

    private String apiKey;
    private String endpoint = "https://translation.googleapis.com/language/translate/v2";
}
