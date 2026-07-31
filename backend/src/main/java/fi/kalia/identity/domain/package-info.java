/**
 * Identity domain layer: the current-user value object (ADR-0007). No JPA
 * entities — Keycloak owns user records, this module only reads the token.
 */
@NullMarked
package fi.kalia.identity.domain;

import org.jspecify.annotations.NullMarked;
