package fi.kalia.identity.domain;

import java.util.UUID;
import org.jspecify.annotations.Nullable;

/**
 * The authenticated caller, as this application knows them (ADR-0028).
 *
 * @param id       Keycloak's {@code sub} — the canonical, stable user
 *                 identifier every module keys per-user data on
 * @param username Keycloak's {@code preferred_username}; display-only, and
 *                 changeable in Keycloak, so never a key
 * @param email    absent unless the token carries the {@code email} scope
 * @param name     full display name, absent when the account has none
 */
public record CurrentUser(UUID id, String username, @Nullable String email, @Nullable String name) {
}
