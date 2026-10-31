package fi.kalia.appconfig.web;

import fi.kalia.appconfig.domain.AppConfig;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "What the server tells an installed app about itself")
public record AppConfigDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) MinimumBuildDto minimumBuild,
		@Schema(description = "True while Kalia is down for maintenance",
				requiredMode = Schema.RequiredMode.REQUIRED) boolean maintenance) {

	static AppConfigDto from(AppConfig config) {
		return new AppConfigDto(new MinimumBuildDto(config.getMinimumBuildIos(), config.getMinimumBuildAndroid()),
				config.isMaintenance());
	}

}
