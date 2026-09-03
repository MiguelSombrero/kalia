package fi.kalia.profile.web;

import fi.kalia.profile.domain.Profile;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "The caller's own profile")
record ProfileDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "Copied from the identity provider at profile creation; never updated afterward") String username,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "Whether the caller's cellar is readable by anyone with the link") boolean cellarPublic) {

	static ProfileDto from(Profile profile) {
		return new ProfileDto(profile.getUsername(), profile.isCellarPublic());
	}

}
