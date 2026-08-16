package fi.kalia.identity.domain;

import java.util.UUID;
import org.jspecify.annotations.Nullable;

// The authenticated caller (ADR-0028). id is Keycloak's sub, the stable
// per-user key; username is preferred_username, display-only, never a key.
public record CurrentUser(UUID id, String username, @Nullable String email, @Nullable String name) {
}
