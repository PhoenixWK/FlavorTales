package com.flavortales;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;

/**
 * Application entry point.
 *
 * <p>Excluded auto-configurations:
 * <ul>
 *   <li>{@link DataSourceAutoConfiguration} / {@link HibernateJpaAutoConfiguration} –
 *       replaced by the custom master/slave routing setup in
 *       {@link com.flavortales.common.config.DataSourceConfig}.</li>
 * </ul>
 */
@SpringBootApplication(exclude = {
        DataSourceAutoConfiguration.class,
        HibernateJpaAutoConfiguration.class,
        RedisRepositoriesAutoConfiguration.class
})
public class FlavorTalesApplication {

	public static void main(String[] args) {
		SpringApplication.run(FlavorTalesApplication.class, args);
	}

}
