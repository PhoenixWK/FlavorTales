package com.flavortales.common.config;

import java.io.IOException;
import java.util.List;

import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.core.io.support.PropertySourceFactory;
import org.springframework.lang.Nullable;


public class YamlPropertySourceFactory implements PropertySourceFactory {

    @Override
    public PropertySource<?> createPropertySource(@Nullable String arg0, EncodedResource resource) throws IOException {
        // Use Spring's YamlPropertySourceLoader to parse YAML
        YamlPropertySourceLoader loader = new YamlPropertySourceLoader();

        // Load the YAML resource into a list of PropertySources
        List<PropertySource<?>> propertySources = loader.load(
            resource.getResource().getFilename(), // Name for the property source
            resource.getResource() // The YAML file resource
        );

        // Return the first (and only) property source from the list
        return propertySources.get(0);
    }

}
