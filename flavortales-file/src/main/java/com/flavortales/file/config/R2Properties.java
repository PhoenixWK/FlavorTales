package com.flavortales.file.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "app.r2")
public class R2Properties {

    private String accountId;
    private String accessKey;
    private String secretKey;
    private String bucket;
    /** Public base URL for served objects, e.g. https://pub-xxx.r2.dev */
    private String publicUrl;
}
