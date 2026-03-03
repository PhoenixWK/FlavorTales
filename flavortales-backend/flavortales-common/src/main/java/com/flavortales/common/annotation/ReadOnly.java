package com.flavortales.common.annotation;

import org.springframework.transaction.annotation.Transactional;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a service method as read-only so that the AOP routing aspect directs
 * it to the SLAVE (replica) datasource before Spring opens the transaction.
 *
 * <p>Combining with {@code @Transactional(readOnly = true)} ensures that:
 * <ul>
 *   <li>the JDBC connection comes from the replica pool, and</li>
 *   <li>Hibernate's flush mode is set to MANUAL (no dirty-checking overhead).</li>
 * </ul>
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Transactional(readOnly = true)
public @interface ReadOnly {
}
