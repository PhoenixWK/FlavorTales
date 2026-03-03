package com.flavortales.common.aop;

import com.flavortales.common.annotation.ReadOnly;
import com.flavortales.common.datasource.DataSourceContextHolder;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;

/**
 * AOP aspect that routes database operations to the correct datasource.
 *
 * <p>Ordering: {@code @Order(1)} guarantees this advice runs <em>before</em>
 * Spring's {@code TransactionInterceptor} (order = Integer.MAX_VALUE - 1 by
 * default), so the datasource type is set <em>before</em> the connection is
 * fetched from the pool.
 *
 * <p>Routing rules:
 * <ul>
 *   <li>{@code @ReadOnly} → SLAVE (replica)</li>
 *   <li>{@code @Transactional(readOnly = true)} → SLAVE</li>
 *   <li>All other {@code @Transactional} methods → MASTER</li>
 * </ul>
 */
@Aspect
@Component
@Order(1)
@Slf4j
public class DataSourceAspect {

    /**
     * Intercepts every method annotated with {@link ReadOnly} and pins the
     * thread to the SLAVE datasource for the duration of the call.
     */
    @Around("@annotation(readOnly)")
    public Object routeToSlave(ProceedingJoinPoint pjp, ReadOnly readOnly) throws Throwable {
        try {
            DataSourceContextHolder.useSlave();
            log.debug("[DataSource] SLAVE ← {}.{}()",
                    pjp.getSignature().getDeclaringTypeName(),
                    pjp.getSignature().getName());
            return pjp.proceed();
        } finally {
            DataSourceContextHolder.clear();
        }
    }

    /**
     * Intercepts every {@link Transactional} method and routes to SLAVE when
     * {@code readOnly = true}, or to MASTER otherwise.
     *
     * <p>Methods already handled by {@link #routeToSlave} (i.e. annotated with
     * {@code @ReadOnly}) will match this pointcut as well because {@code @ReadOnly}
     * is meta-annotated with {@code @Transactional(readOnly = true)}.  The more
     * specific {@code @ReadOnly} advice (above) executes first due to Spring's
     * around-advice ordering within the same aspect; additionally,
     * {@link DataSourceContextHolder} is idempotent so double-setting SLAVE is
     * harmless.
     */
    @Around("@annotation(tx)")
    public Object routeByTransactional(ProceedingJoinPoint pjp, Transactional tx) throws Throwable {
        // Honour class-level or method-level readOnly already set by @ReadOnly
        if (DataSourceContextHolder.getDataSourceType()
                == com.flavortales.common.datasource.DataSourceType.SLAVE) {
            return pjp.proceed();
        }

        // Determine readOnly from the annotation on the actual method (not the proxy)
        boolean isReadOnly = resolveReadOnly(pjp, tx);

        try {
            if (isReadOnly) {
                DataSourceContextHolder.useSlave();
                log.debug("[DataSource] SLAVE ← {}.{}() [@Transactional readOnly=true]",
                        pjp.getSignature().getDeclaringTypeName(),
                        pjp.getSignature().getName());
            } else {
                DataSourceContextHolder.useMaster();
                log.debug("[DataSource] MASTER ← {}.{}() [@Transactional readOnly=false]",
                        pjp.getSignature().getDeclaringTypeName(),
                        pjp.getSignature().getName());
            }
            return pjp.proceed();
        } finally {
            DataSourceContextHolder.clear();
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private boolean resolveReadOnly(ProceedingJoinPoint pjp, Transactional tx) {
        // tx is the annotation instance – its readOnly() is authoritative
        if (tx.readOnly()) {
            return true;
        }
        // Also check the actual method's @ReadOnly (meta-annotated) just in case
        try {
            MethodSignature sig = (MethodSignature) pjp.getSignature();
            Method method = sig.getMethod();
            return method.isAnnotationPresent(ReadOnly.class)
                    || method.getDeclaringClass().isAnnotationPresent(ReadOnly.class);
        } catch (Exception e) {
            return false;
        }
    }
}
