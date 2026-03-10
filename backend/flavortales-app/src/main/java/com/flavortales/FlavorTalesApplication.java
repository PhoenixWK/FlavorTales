package com.flavortales;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration;
import org.springframework.boot.autoconfigure.data.mongo.MongoRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;

/**
 * Application entry point.
 *
 * <p>Excluded auto-configurations:
 * <ul>
 *   <li>{@link DataSourceAutoConfiguration} / {@link HibernateJpaAutoConfiguration} –
 *       replaced by the custom master/slave routing setup in
 *       {@link com.flavortales.common.config.DataSourceConfig}.</li>
 *   <li>{@link MongoAutoConfiguration} / {@link MongoDataAutoConfiguration} /
 *       {@link MongoRepositoriesAutoConfiguration} – no MongoDB server is
 *       provisioned; MongoDB support is reserved for future use.</li>
 * </ul>
 */
@SpringBootApplication(exclude = {
        DataSourceAutoConfiguration.class,
        HibernateJpaAutoConfiguration.class,
        MongoAutoConfiguration.class,
        MongoDataAutoConfiguration.class,
        MongoRepositoriesAutoConfiguration.class,
        RedisRepositoriesAutoConfiguration.class
})
public class FlavorTalesApplication {

	public static void main(String[] args) {
		SpringApplication.run(FlavorTalesApplication.class, args);
	}

}
