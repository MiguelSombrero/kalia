package fi.kalia.identity;

import fi.kalia.identity.application.CurrentUserService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class IdentityApi {

	private final CurrentUserService currentUser;

	/** Fails when the request is anonymous — every cellar route requires a token first (ADR-0028). */
	public UUID requireCurrentUserId() {
		return currentUser.require().id();
	}

}
