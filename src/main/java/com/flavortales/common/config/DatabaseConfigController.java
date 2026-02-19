package com.flavortales.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DatabaseConfigController {

    @Value("${spring.datasource.url}")
    private String url;

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    @Value("${spring.datasource.driver-class-name}")
    private String driverClassName;

    @GetMapping("/database-config")
    public String getDatabaseConfig() {
        return String.format("URL: %s, Username: %s, Password: %s, Driver: %s",
                url, username, password, driverClassName);
    }

}
