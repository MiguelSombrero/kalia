package fi.kalia.appconfig.web;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "The lowest build number of the app that may run, for each platform")
public record MinimumBuildDto(
		@Schema(description = "The iOS build number", requiredMode = Schema.RequiredMode.REQUIRED) int ios,
		@Schema(description = "The Android version code", requiredMode = Schema.RequiredMode.REQUIRED) int android) {

}
