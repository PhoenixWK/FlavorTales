package com.flavortales.user.entity;

/**
 * Lifecycle states for a {@link User} account.
 *
 * <ul>
 *   <li>{@link #active}    – login allowed, redirect to dashboard.</li>
 *   <li>{@link #inactive}  – registered but email not yet verified; shown as
 *       "Account inactive" on login.</li>
 *   <li>{@link #pending}   – email verified, awaiting administrator approval;
 *       shown as "Account pending approval".</li>
 *   <li>{@link #rejected}  – registration rejected by administrator.</li>
 *   <li>{@link #suspended} – temporarily locked by an administrator.</li>
 *   <li>{@link #disabled}  – permanently disabled.</li>
 * </ul>
 *
 * <p><b>Note:</b> The database {@code ENUM} must be extended with the new
 * values ({@code pending}, {@code rejected}, {@code disabled}) via the
 * migration script in {@code database/mysql_schema.sql}.
 */
public enum UserStatus {
    active,
    inactive,
    pending,
    rejected,
    suspended,
    disabled
}
