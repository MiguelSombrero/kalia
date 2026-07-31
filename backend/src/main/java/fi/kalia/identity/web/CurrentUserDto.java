package fi.kalia.identity.web;

import fi.kalia.identity.domain.CurrentUser;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

@Schema(description = "The authenticated caller")
record CurrentUserDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "Stable identifier; the identity provider's subject") UUID id,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "Display name chosen at the identity provider") String username,
		@Schema(description = "Absent unless the token was granted the email scope") @Nullable String email,
		@Schema(description = "Full name, absent when the account has none") @Nullable String name) {

	static CurrentUserDto from(CurrentUser user) {
		return new CurrentUserDto(user.id(), user.username(), user.email(), user.name());
	}

}
