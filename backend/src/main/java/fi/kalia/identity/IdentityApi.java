package fi.kalia.identity;

import fi.kalia.identity.application.CurrentUserService;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class IdentityApi {

	private final CurrentUserService currentUser;

	/** Fails when the request is anonymous — call it only behind a route that requires a token (ADR-0028). */
	public UUID requireCurrentUserId() {
		return currentUser.requireId();
	}

	/** The caller's id, or empty on a public route reached without a token. */
	public Optional<UUID> findCurrentUserId() {
		return currentUser.findId();
	}

	/** The caller's {@code preferred_username}; same precondition as {@link #requireCurrentUserId()}. */
	public String requireCurrentUsername() {
		return currentUser.requireUsername();
	}

}
