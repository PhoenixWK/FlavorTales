package com.flavortales.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.util.ReflectionUtils;

import java.lang.reflect.Field;

/**
 * Generic validator that compares two password fields by name using reflection.
 * Defaults to {@code password} / {@code confirmPassword} for backward compatibility
 * with {@link com.flavortales.auth.dto.VendorRegisterRequest}.
 */
public class PasswordMatchValidator implements ConstraintValidator<PasswordMatch, Object> {

    private String passwordField;
    private String confirmPasswordField;

    @Override
    public void initialize(PasswordMatch annotation) {
        this.passwordField        = annotation.passwordField();
        this.confirmPasswordField = annotation.confirmPasswordField();
    }

    @Override
    public boolean isValid(Object target, ConstraintValidatorContext context) {
        if (target == null) {
            return true;
        }
        try {
            String password        = getFieldValue(target, passwordField);
            String confirmPassword = getFieldValue(target, confirmPasswordField);

            if (password == null || confirmPassword == null) {
                return true; // let @NotBlank handle the null case
            }

            boolean matches = password.equals(confirmPassword);
            if (!matches) {
                context.disableDefaultConstraintViolation();
                context.buildConstraintViolationWithTemplate("Passwords do not match")
                        .addPropertyNode(confirmPasswordField)
                        .addConstraintViolation();
            }
            return matches;
        } catch (Exception e) {
            return false;
        }
    }

    private String getFieldValue(Object target, String fieldName) throws IllegalAccessException {
        Field field = ReflectionUtils.findField(target.getClass(), fieldName);
        if (field == null) {
            throw new IllegalArgumentException("Field '" + fieldName + "' not found on " + target.getClass().getName());
        }
        ReflectionUtils.makeAccessible(field);
        Object value = field.get(target);
        return value == null ? null : value.toString();
    }
}
